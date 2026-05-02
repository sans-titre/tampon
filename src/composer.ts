import { $ } from "bun";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { journal } from "./journal";
import { rendrePage } from "./renderer";

const TIRAGES_DIR = process.env.TIRAGES_DIR ?? "/app/tirages";

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
): Promise<string> {
  const horodatage = Date.now();
  const tmpDir = `/tmp/atelier-${horodatage}`;
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(TIRAGES_DIR, { recursive: true });

  const html = rendrePage(markdown, gabarit, meta);
  const htmlPath = join(tmpDir, "document.html");
  writeFileSync(htmlPath, html, "utf-8");

  const nomTirage = nomFichierTirage(nomFichier, meta);
  const tiragePath = join(TIRAGES_DIR, nomTirage);

  try {
    journal.info(`pagedjs-cli → ${nomTirage}`);
    await $`pagedjs-cli ${htmlPath} -o ${tiragePath} --browserArgs --no-sandbox,--disable-dev-shm-usage`.quiet();
  } catch (err: any) {
    const stderr = (err.stderr?.toString() ?? String(err)).trim();
    journal.erreur("pagedjs-cli —", stderr);
    throw new Error(stderr || "Échec de la composition");
  }

  await $`rm -rf ${tmpDir}`.quiet();

  return nomTirage;
}
