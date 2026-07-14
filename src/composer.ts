import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BASE, TIRAGES_DIR } from "./config";
import { imprimer } from "./imprimante";
import { journal } from "./journal";
import { rendrePage } from "./renderer";

// Pages d'impression servies sur GET {BASE}/imprimer/{jeton} le temps que
// Chromium les charge ; purgées au finally de composer(), succès ou échec.
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

function nomBaseTirage(nomFichier: string | null, meta: Record<string, string>): string {
  const slug = slugifier(nomFichier ?? meta.titre ?? "");
  // Titre entièrement non latin (cyrillique, CJK…) → slug vide :
  // repli horodaté plutôt qu'un fichier caché « .pdf ».
  return slug || `tirage-${Date.now()}`;
}

// Réserve un nom libre par création atomique (flag wx) : deux compositions
// au même titre ne s'écrasent jamais — la seconde devient « -2 », etc.
function reserverTirage(nomBase: string): { nom: string; chemin: string } {
  for (let n = 1; ; n++) {
    const nom = n === 1 ? `${nomBase}.pdf` : `${nomBase}-${n}.pdf`;
    const chemin = join(TIRAGES_DIR, nom);
    try {
      writeFileSync(chemin, "", { flag: "wx" });
      return { nom, chemin };
    } catch {
      // existe déjà — on tente le suffixe suivant
    }
  }
}

export async function composer(
  markdown: string,
  gabarit: string,
  meta: Record<string, string> = {},
  nomFichier: string | null = null,
  port: number,
): Promise<string> {
  mkdirSync(TIRAGES_DIR, { recursive: true });

  const { nom: nomTirage, chemin: tiragePath } = reserverTirage(nomBaseTirage(nomFichier, meta));

  const jeton = randomUUID();
  pagesEnAttente.set(jeton, rendrePage(markdown, gabarit, meta));
  const urlImpression = `http://127.0.0.1:${port}${BASE}/imprimer/${jeton}`;

  try {
    journal.info(`Impression → ${nomTirage}`);
    await imprimer(urlImpression, tiragePath);
  } catch (err) {
    // Ne pas laisser traîner le fichier vide de réservation.
    rmSync(tiragePath, { force: true });
    throw err;
  } finally {
    pagesEnAttente.delete(jeton);
  }

  return nomTirage;
}
