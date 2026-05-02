import { serve, file } from "bun";
import { existsSync } from "fs";
import { composer } from "./src/composer";
import { journal } from "./src/journal";

const PORT = 3000;
const BASE = "/sans-titre.art/tampon";

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "GET" && (pathname === BASE || pathname === BASE + "/")) {
      return new Response(file("./ui/index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (req.method === "GET" && pathname === `${BASE}/ui/app.js`) {
      return new Response(file("./ui/app.js"), {
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    }

    if (req.method === "GET" && pathname === `${BASE}/ui/vendor/paged.polyfill.js`) {
      return new Response(file("./ui/vendor/paged.polyfill.js"), {
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    }

    if (req.method === "GET" && pathname.startsWith(`${BASE}/gabarits/`)) {
      const nom = pathname.replace(`${BASE}/gabarits/`, "");
      return new Response(file(`./gabarits/${nom}`), {
        headers: { "Content-Type": "text/css; charset=utf-8" },
      });
    }

    if (req.method === "GET" && pathname.startsWith(`${BASE}/tirages/`)) {
      const nom = pathname.replace(`${BASE}/tirages/`, "");
      const chemin = `./tirages/${nom}`;
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
  },
});

journal.info(`Atelier ouvert → http://localhost:${PORT}${BASE}`);
