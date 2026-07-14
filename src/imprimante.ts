// Client Chrome DevTools Protocol minimal — remplace pagedjs-cli/puppeteer.
// Lance chrome-headless-shell (ou un Chromium), charge la page d'impression,
// attend la fin de pagination Paged.js (liaison CDP __tamponSignal appelée
// par PagedConfig.after), puis Page.printToPDF. Mêmes options que pagedjs-cli :
// preferCSSPageSize, marges à zéro, fonds imprimés.
//
// Garantie structurelle : toute impression se termine. L'ensemble du travail
// court sous une échéance globale (Promise.race) et le finally tue Chromium
// quoi qu'il arrive — aucune lecture ni promesse ne peut suspendre le job
// pour toujours.
//
// Compromis assumé : un Chromium froid par job (~1-2 s de démarrage), pour la
// simplicité et l'isolation. Le jour du « mode lot », garder un processus
// chaud et ouvrir un target par job (Target.createTarget est déjà là).

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { journal } from "./journal";

const CHROMIUM = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium";
const DELAI_DEMARRAGE = 15_000;
const DELAI_RENDU = (() => {
  const valeur = Number(process.env.TAMPON_DELAI_RENDU ?? 60_000);
  return Number.isFinite(valeur) && valeur > 0 ? valeur : 60_000;
})();
// Marge pour printToPDF et l'écriture du fichier après la pagination.
const DELAI_GLOBAL = DELAI_DEMARRAGE + DELAI_RENDU + 15_000;

type Gestionnaire = (params: Record<string, unknown>) => void;

class SessionCDP {
  private ws: WebSocket;
  private compteur = 0;
  private attentes = new Map<
    number,
    { resoudre: (r: Record<string, unknown>) => void; rejeter: (e: Error) => void }
  >();
  private gestionnaires = new Map<string, Gestionnaire>();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (evt) => {
      const msg = JSON.parse(String(evt.data));
      if (msg.method) {
        this.gestionnaires.get(msg.method)?.(msg.params ?? {});
        return;
      }
      const attente = this.attentes.get(msg.id);
      if (!attente) return;
      this.attentes.delete(msg.id);
      if (msg.error)
        attente.rejeter(new Error(`CDP ${msg.error.message ?? JSON.stringify(msg.error)}`));
      else attente.resoudre(msg.result);
    });
    // Chromium crashé ou connexion rompue : aucune attente ne doit rester suspendue.
    const rompre = () => {
      for (const { rejeter } of this.attentes.values()) {
        rejeter(new Error("Connexion CDP rompue — Chromium a quitté en plein travail"));
      }
      this.attentes.clear();
    };
    ws.addEventListener("close", rompre);
    ws.addEventListener("error", rompre);
  }

  static ouvrir(url: string): Promise<SessionCDP> {
    return new Promise((resoudre, rejeter) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => resoudre(new SessionCDP(ws)));
      ws.addEventListener("error", () => rejeter(new Error(`Connexion CDP impossible — ${url}`)));
    });
  }

  envoyer(
    methode: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<Record<string, any>> {
    const id = ++this.compteur;
    return new Promise((resoudre, rejeter) => {
      this.attentes.set(id, { resoudre, rejeter });
      this.ws.send(
        JSON.stringify({ id, method: methode, params, ...(sessionId ? { sessionId } : {}) }),
      );
    });
  }

  sur(methode: string, gestionnaire: Gestionnaire) {
    this.gestionnaires.set(methode, gestionnaire);
  }

  fermer() {
    this.ws.close();
  }
}

// Lit stderr de Chromium jusqu'à l'annonce de l'endpoint DevTools.
// Pas d'échéance locale : l'échéance globale de imprimer() coupe court
// (le kill du finally clôt le flux, donc la lecture se termine toujours).
async function attendreEndpoint(
  stderr: ReadableStream<Uint8Array>,
): Promise<{ endpoint: string; journalErreurs: () => string }> {
  const decodeur = new TextDecoder();
  let tampon = "";
  const lecteur = stderr.getReader();

  while (true) {
    const { done, value } = await lecteur.read();
    if (done) break;
    tampon += decodeur.decode(value, { stream: true });
    const trouve = tampon.match(/DevTools listening on (ws:\/\/\S+)/);
    if (trouve) {
      // On continue de vider stderr en arrière-plan (borné) pour ne pas bloquer Chromium.
      (async () => {
        try {
          while (true) {
            const { done, value } = await lecteur.read();
            if (done) break;
            tampon = (tampon + decodeur.decode(value, { stream: true })).slice(-500);
          }
        } catch {
          /* flux clos */
        }
      })();
      return { endpoint: trouve[1], journalErreurs: () => tampon };
    }
  }
  throw new Error(`Chromium n'a pas annoncé son endpoint DevTools — ${tampon.trim().slice(-500)}`);
}

function echeance(ms: number): { promesse: Promise<never>; annuler: () => void } {
  let minuteur: ReturnType<typeof setTimeout>;
  const promesse = new Promise<never>((_, rejeter) => {
    minuteur = setTimeout(
      () => rejeter(new Error(`Impression interrompue — échéance globale de ${ms} ms dépassée`)),
      ms,
    );
  });
  return { promesse, annuler: () => clearTimeout(minuteur) };
}

export async function imprimer(url: string, cheminPdf: string): Promise<void> {
  // Profil jetable : deux Chromium concurrents ne se disputent jamais
  // le SingletonLock du profil par défaut.
  const profil = mkdtempSync(join(tmpdir(), "tampon-chromium-"));
  const processus = Bun.spawn(
    [
      CHROMIUM,
      "--headless",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--hide-scrollbars",
      `--user-data-dir=${profil}`,
      "--remote-debugging-port=0",
      "about:blank",
    ],
    { stdout: "ignore", stderr: "pipe" },
  );

  let session: SessionCDP | null = null;
  let journalErreurs = () => "";

  const travail = async () => {
    const demarrage = await attendreEndpoint(processus.stderr);
    journalErreurs = demarrage.journalErreurs;
    const cdp = await SessionCDP.ouvrir(demarrage.endpoint);
    session = cdp;

    const { targetId } = await cdp.envoyer("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.envoyer("Target.attachToTarget", { targetId, flatten: true });
    await cdp.envoyer("Page.enable", {}, sessionId);
    await cdp.envoyer("Runtime.enable", {}, sessionId);
    // PagedConfig.after appelle window.__tamponSignal : fin de pagination
    // par évènement exact, sans sondage.
    await cdp.envoyer("Runtime.addBinding", { name: "__tamponSignal" }, sessionId);

    const rendu = new Promise<void>((resoudre, rejeter) => {
      cdp.sur("Runtime.bindingCalled", (params) => {
        if (params.name === "__tamponSignal") resoudre();
      });
      cdp.sur("Runtime.exceptionThrown", (params) => {
        const details = params.exceptionDetails as {
          exception?: { description?: string };
          text?: string;
        };
        const description = details?.exception?.description ?? details?.text ?? "erreur inconnue";
        journal.erreur("page d'impression —", description);
        rejeter(
          new Error(`Erreur dans la page d'impression — ${String(description).split("\n")[0]}`),
        );
      });
      cdp.sur("Runtime.consoleAPICalled", (params) => {
        if (params.type !== "error") return;
        const args = (params.args as { value?: unknown; description?: string }[]) ?? [];
        journal.erreur(
          "console page —",
          args.map((a) => a?.value ?? a?.description ?? "").join(" "),
        );
      });
    });

    await cdp.envoyer("Page.navigate", { url }, sessionId);
    await rendu;

    const { data } = await cdp.envoyer(
      "Page.printToPDF",
      {
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        generateDocumentOutline: true,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
      },
      sessionId,
    );
    writeFileSync(cheminPdf, Buffer.from(data as string, "base64"));
  };

  const garde = echeance(DELAI_GLOBAL);
  try {
    await Promise.race([travail(), garde.promesse]);
  } catch (err) {
    const bruit = journalErreurs().trim().slice(-500);
    if (bruit) journal.erreur("chromium —", bruit);
    throw err;
  } finally {
    garde.annuler();
    session?.fermer();
    processus.kill();
    await processus.exited;
    rmSync(profil, { recursive: true, force: true });
  }
}
