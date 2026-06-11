// Client Chrome DevTools Protocol minimal — remplace pagedjs-cli/puppeteer.
// Lance chrome-headless-shell (ou un Chromium), charge la page d'impression,
// attend la fin de pagination Paged.js (window.__tamponRendu posé par
// PagedConfig.after), puis Page.printToPDF. Mêmes options que pagedjs-cli :
// preferCSSPageSize, marges à zéro, fonds imprimés.

import { writeFileSync } from "fs";
import { journal } from "./journal";

const CHROMIUM = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium";
const DELAI_DEMARRAGE = 15_000;
const DELAI_RENDU = Number(process.env.TAMPON_DELAI_RENDU ?? 60_000);

class SessionCDP {
  private ws: WebSocket;
  private compteur = 0;
  private attentes = new Map<number, { resoudre: (r: any) => void; rejeter: (e: Error) => void }>();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (evt) => {
      const msg = JSON.parse(String(evt.data));
      if (msg.id !== undefined && this.attentes.has(msg.id)) {
        const { resoudre, rejeter } = this.attentes.get(msg.id)!;
        this.attentes.delete(msg.id);
        if (msg.error) rejeter(new Error(`CDP ${msg.error.message ?? JSON.stringify(msg.error)}`));
        else resoudre(msg.result);
      }
    });
  }

  static ouvrir(url: string): Promise<SessionCDP> {
    return new Promise((resoudre, rejeter) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => resoudre(new SessionCDP(ws)));
      ws.addEventListener("error", () => rejeter(new Error(`Connexion CDP impossible — ${url}`)));
    });
  }

  envoyer(methode: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> {
    const id = ++this.compteur;
    return new Promise((resoudre, rejeter) => {
      this.attentes.set(id, { resoudre, rejeter });
      this.ws.send(JSON.stringify({ id, method: methode, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  fermer() {
    this.ws.close();
  }
}

// Lit stderr de Chromium jusqu'à l'annonce de l'endpoint DevTools.
async function attendreEndpoint(stderr: ReadableStream<Uint8Array>): Promise<{ endpoint: string; journalErreurs: () => string }> {
  const decodeur = new TextDecoder();
  let tampon = "";
  const lecteur = stderr.getReader();
  const echeance = Date.now() + DELAI_DEMARRAGE;

  while (Date.now() < echeance) {
    const { done, value } = await lecteur.read();
    if (done) break;
    tampon += decodeur.decode(value, { stream: true });
    const trouve = tampon.match(/DevTools listening on (ws:\/\/\S+)/);
    if (trouve) {
      // On continue de vider stderr en arrière-plan pour ne pas bloquer Chromium.
      (async () => {
        try {
          while (true) {
            const { done, value } = await lecteur.read();
            if (done) break;
            tampon += decodeur.decode(value, { stream: true });
          }
        } catch { /* flux clos */ }
      })();
      return { endpoint: trouve[1], journalErreurs: () => tampon };
    }
  }
  throw new Error(`Chromium n'a pas annoncé son endpoint DevTools — ${tampon.trim().slice(-500)}`);
}

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function imprimer(url: string, cheminPdf: string): Promise<void> {
  const processus = Bun.spawn(
    [
      CHROMIUM,
      "--headless",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--hide-scrollbars",
      "--remote-debugging-port=0",
      "about:blank",
    ],
    { stdout: "ignore", stderr: "pipe" },
  );

  let session: SessionCDP | null = null;
  let journalErreurs = () => "";
  try {
    const demarrage = await attendreEndpoint(processus.stderr);
    journalErreurs = demarrage.journalErreurs;
    session = await SessionCDP.ouvrir(demarrage.endpoint);

    const { targetId } = await session.envoyer("Target.createTarget", { url });
    const { sessionId } = await session.envoyer("Target.attachToTarget", { targetId, flatten: true });
    await session.envoyer("Page.enable", {}, sessionId);

    const echeance = Date.now() + DELAI_RENDU;
    while (true) {
      const evaluation = await session.envoyer(
        "Runtime.evaluate",
        { expression: "window.__tamponRendu === true", returnByValue: true },
        sessionId,
      );
      if (evaluation?.result?.value === true) break;
      if (Date.now() > echeance) {
        throw new Error(`Paged.js n'a pas terminé la pagination en ${DELAI_RENDU} ms`);
      }
      await pause(100);
    }

    const { data } = await session.envoyer(
      "Page.printToPDF",
      {
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
      },
      sessionId,
    );
    writeFileSync(cheminPdf, Buffer.from(data, "base64"));
  } catch (err) {
    const bruit = journalErreurs().trim().slice(-500);
    if (bruit) journal.erreur("chromium —", bruit);
    throw err;
  } finally {
    session?.fermer();
    processus.kill();
    await processus.exited;
  }
}
