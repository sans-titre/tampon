import { mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { journal } from "./journal";
import { rendrePage } from "./renderer";
import { imprimer } from "./imprimante";
import { BASE, TIRAGES_DIR } from "./config";

// Pages d'impression en attente : servies une seule fois sur
// GET {BASE}/imprimer/{jeton} le temps que Chromium les charge.
const pagesEnAttente = new Map<string, string>();

export function obtenirPageImpression(jeton: string): string | undefined {
  return pagesEnAttente.get(jeton);
}

function slugifier(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function nomFichierTirage(nomFichier: string | null, meta: Record<string, string>): string {
  if (nomFichier) return slugifier(nomFichier) + ".pdf";
  if (meta.titre) return slugifier(meta.titre) + ".pdf";
  return `tirage-${Date.now()}.pdf`;
}

export async function composer(
  markdown: string,
  gabarit: string,
  meta: Record<string, string> = {},
  nomFichier: string | null = null,
  port: number,
): Promise<string> {
  mkdirSync(TIRAGES_DIR, { recursive: true });

  const nomTirage = nomFichierTirage(nomFichier, meta);
  const tiragePath = join(TIRAGES_DIR, nomTirage);

  const jeton = randomUUID();
  pagesEnAttente.set(jeton, rendrePage(markdown, gabarit, meta));
  const urlImpression = `http://127.0.0.1:${port}${BASE}/imprimer/${jeton}`;

  try {
    journal.info(`Impression → ${nomTirage}`);
    await imprimer(urlImpression, tiragePath);
  } finally {
    pagesEnAttente.delete(jeton);
  }

  return nomTirage;
}
