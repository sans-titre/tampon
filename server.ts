import { file, serve } from "bun";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { composer, obtenirPageImpression } from "./src/composer";
import { BASE, GABARITS_DIR, TIRAGES_DIR, UI_DIR } from "./src/config";
import { journal } from "./src/journal";

// Boucle locale par défaut : le flux d'impression n'a besoin que de
// 127.0.0.1. Docker pose TAMPON_HOTE=0.0.0.0 (le mapping de port l'exige).
const HOTE = process.env.TAMPON_HOTE ?? "127.0.0.1";

const TYPES_MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
};

function typeMime(chemin: string): string {
  const ext = chemin.slice(chemin.lastIndexOf("."));
  return TYPES_MIME[ext] ?? "application/octet-stream";
}

// Sert un fichier d'un répertoire en refusant toute remontée de chemin.
function servirFichier(repertoire: string, nom: string): Response {
  if (nom.includes("..")) return new Response("Chemin refusé", { status: 400 });
  const chemin = join(repertoire, nom);
  if (!existsSync(chemin)) return new Response("Fichier introuvable", { status: 404 });
  return new Response(file(chemin), { headers: { "Content-Type": typeMime(chemin) } });
}

// Seule source de vérité des gabarits : les fichiers gabarit-*.css présents.
// Alimente le select de l'UI (GET /gabarits) et la validation de /composer.
function listerGabarits(): string[] {
  return readdirSync(GABARITS_DIR)
    .filter((nom) => nom.startsWith("gabarit-") && nom.endsWith(".css"))
    .map((nom) => nom.slice("gabarit-".length, -".css".length))
    .sort();
}

async function traiter(req: Request, port: number): Promise<Response> {
  const { pathname } = new URL(req.url);

  if (req.method === "GET" && (pathname === BASE || pathname === BASE + "/")) {
    return servirFichier(UI_DIR, "index.html");
  }

  if (req.method === "GET" && pathname === `${BASE}/gabarits`) {
    return Response.json(listerGabarits());
  }

  if (req.method === "GET" && pathname.startsWith(`${BASE}/ui/`)) {
    return servirFichier(UI_DIR, pathname.replace(`${BASE}/ui/`, ""));
  }

  if (req.method === "GET" && pathname.startsWith(`${BASE}/gabarits/`)) {
    return servirFichier(GABARITS_DIR, pathname.replace(`${BASE}/gabarits/`, ""));
  }

  if (req.method === "GET" && pathname.startsWith(`${BASE}/tirages/`)) {
    return servirFichier(TIRAGES_DIR, pathname.replace(`${BASE}/tirages/`, ""));
  }

  if (req.method === "GET" && pathname.startsWith(`${BASE}/imprimer/`)) {
    const jeton = pathname.replace(`${BASE}/imprimer/`, "");
    const html = obtenirPageImpression(jeton);
    if (!html) return new Response("Page d'impression expirée", { status: 404 });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (req.method === "POST" && pathname === `${BASE}/composer`) {
    let corps: {
      markdown?: unknown;
      gabarit?: unknown;
      meta?: Record<string, string>;
      nomFichier?: string | null;
    };
    try {
      corps = await req.json();
    } catch {
      return Response.json({ erreur: "Corps JSON invalide" }, { status: 400 });
    }

    const { markdown, gabarit, meta = {}, nomFichier } = corps;

    if (typeof markdown !== "string" || !markdown.trim()) {
      return Response.json({ erreur: "Contenu vide" }, { status: 400 });
    }
    if (typeof gabarit !== "string" || !listerGabarits().includes(gabarit)) {
      return Response.json({ erreur: "Gabarit inconnu" }, { status: 400 });
    }

    journal.info(`Composition demandée — gabarit: ${gabarit} — "${meta.titre ?? "sans titre"}"`);

    try {
      const nomTirage = await composer(markdown, gabarit, meta, nomFichier ?? null, port);
      journal.info(`Tirage prêt — ${nomTirage}`);
      return Response.json({ tirage: nomTirage });
    } catch (err) {
      journal.erreur("Échec composition —", err);
      return Response.json({ erreur: String(err) }, { status: 500 });
    }
  }

  return new Response("Page introuvable", { status: 404 });
}

// Port imposé par PORT, sinon premier port libre à partir de 3000.
function demarrer() {
  const portImpose = process.env.PORT ? Number(process.env.PORT) : null;
  const candidats = portImpose ? [portImpose] : Array.from({ length: 20 }, (_, i) => 3000 + i);

  let derniereErreur: unknown;
  for (const port of candidats) {
    try {
      return serve({
        port,
        hostname: HOTE,
        fetch: async (req) => {
          try {
            return await traiter(req, port);
          } catch (err) {
            journal.erreur("Requête en échec —", err);
            return Response.json({ erreur: String(err) }, { status: 500 });
          }
        },
      });
    } catch (err) {
      // Port occupé : on essaie le suivant. Toute autre erreur est fatale.
      if ((err as { code?: string })?.code !== "EADDRINUSE") throw err;
      derniereErreur = err;
    }
  }
  throw derniereErreur ?? new Error("Aucun port disponible");
}

const serveur = demarrer();
const adresse = `http://localhost:${serveur.port}${BASE}`;
journal.info(`Atelier ouvert → ${adresse}`);

if (!process.env.TAMPON_SANS_NAVIGATEUR) {
  try {
    Bun.spawn(["xdg-open", adresse], { stdout: "ignore", stderr: "ignore" });
  } catch {
    // pas de navigateur (serveur distant, conteneur) — l'URL est dans le journal
  }
}
