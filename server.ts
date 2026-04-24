import { serve, file } from "bun";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { composer } from "./src/composer";
import { journal } from "./src/journal";

const PORT_DEFAUT = parseInt(process.env.PORT ?? "3000");
const BASE = "/sans-titre.art/tampon";

const BASE_DIR    = process.env.TAMPON_DIR ?? dirname(process.execPath);
const UI_DIR      = join(BASE_DIR, "ui");
const TIRAGES_DIR = process.env.TIRAGES_DIR ?? join(homedir(), "Documents", "Tampon");


function ouvrirNavigateur(url: string) {
  try {
    const cmd = process.platform === "darwin" ? "open"
      : process.platform === "win32" ? "cmd"
      : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", url] : [url];
    Bun.spawn([cmd, ...args], { stdio: ["ignore", "ignore", "ignore"] });
  } catch {
    journal.info(`Ouvrir manuellement : ${url}`);
  }
}

async function fetch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  if (req.method === "GET" && (pathname === BASE || pathname === BASE + "/")) {
    return new Response(file(join(UI_DIR, "index.html")), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (req.method === "GET" && pathname === `${BASE}/ui/app.js`) {
    return new Response(file(join(UI_DIR, "app.js")), {
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  if (req.method === "GET" && pathname.startsWith(`${BASE}/tirages/`)) {
    const nom = pathname.replace(`${BASE}/tirages/`, "");
    const chemin = join(TIRAGES_DIR, nom);
    if (!existsSync(chemin)) {
      return new Response("Tirage introuvable", { status: 404 });
    }
    return new Response(file(chemin), {
      headers: { "Content-Type": "application/pdf" },
    });
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
    if (!["rapport", "lettre"].includes(gabarit)) {
      return Response.json({ erreur: "Gabarit inconnu" }, { status: 400 });
    }

    journal.info(`Composition demandée — gabarit: ${gabarit} — "${meta.titre ?? "sans titre"}"`);

    try {
      const nomTirage = await composer(markdown, gabarit, meta, nomFichier ?? null);
      journal.info(`Tirage prêt — ${nomTirage}`);
      return Response.json({ tirage: nomTirage });
    } catch (err) {
      journal.erreur("Échec composition —", err);
      return Response.json({ erreur: String(err) }, { status: 500 });
    }
  }

  return new Response("Page introuvable", { status: 404 });
}

let serveur;
let port = PORT_DEFAUT;
for (let i = 0; i < 5; i++) {
  try {
    serveur = serve({ port, fetch });
    break;
  } catch {
    port++;
  }
}
if (!serveur) throw new Error("Impossible de trouver un port disponible");

const url = `http://localhost:${port}${BASE}`;
journal.info(`Atelier ouvert → ${url}`);
ouvrirNavigateur(url);
