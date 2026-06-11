import { serve, file } from "bun";
import { existsSync } from "fs";
import { join } from "path";
import { composer, obtenirPageImpression } from "./src/composer";
import { journal } from "./src/journal";
import { BASE, UI_DIR, GABARITS_DIR, TIRAGES_DIR } from "./src/config";

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

async function traiter(req: Request, port: number): Promise<Response> {
  const { pathname } = new URL(req.url);

  if (req.method === "GET" && (pathname === BASE || pathname === BASE + "/")) {
    return servirFichier(UI_DIR, "index.html");
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
    const corps = await req.json() as {
      markdown: string;
      gabarit: string;
      meta?: Record<string, string>;
      nomFichier?: string | null;
    };

    const { markdown, gabarit, meta = {}, nomFichier } = corps;

    if (!markdown?.trim()) {
      return Response.json({ erreur: "Contenu vide" }, { status: 400 });
    }
    if (gabarit.includes("/") || !existsSync(join(GABARITS_DIR, `gabarit-${gabarit}.css`))) {
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

  for (const port of candidats) {
    try {
      return serve({
        port,
        fetch: (req) => traiter(req, port),
      });
    } catch (err) {
      if (port === candidats[candidats.length - 1]) throw err;
    }
  }
  throw new Error("Aucun port disponible");
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
