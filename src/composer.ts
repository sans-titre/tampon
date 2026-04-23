import { $ } from "bun";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { journal } from "./journal";

const BASE_DIR     = process.env.TAMPON_DIR ?? dirname(process.execPath);
const GABARITS_DIR = process.env.GABARITS_DIR ?? join(BASE_DIR, "gabarits");
const TIRAGES_DIR  = process.env.TIRAGES_DIR  ?? join(homedir(), "Documents", "Tampon");
const VIVLIOSTYLE  = process.env.VIVLIOSTYLE_BIN ?? "vivliostyle";
const CHROMIUM     = process.env.CHROMIUM_PATH ?? "";

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

function entetesRunning(meta: Record<string, string>): string {
  const titre = meta.titre ?? "";
  const date = meta.date ?? "";
  const auteur = meta.auteur ?? "";
  return [
    `<div class="bandeau-nom" aria-hidden="true">sans-titre</div>`,
    `<div class="bandeau-titre-courant" aria-hidden="true">${titre}</div>`,
    `<div class="bandeau-date-courante" aria-hidden="true">${date}</div>`,
    `<div class="pied-coordonnees" aria-hidden="true">Association sans-titre — SIRET 000 000 000 00000${auteur ? ` — ${auteur}` : ""}</div>`,
  ].join("\n");
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

  const contenu = entetesRunning(meta) + "\n\n" + markdown;
  const mdPath = join(tmpDir, "document.md");
  writeFileSync(mdPath, contenu, "utf-8");

  const nomTirage = nomFichierTirage(nomFichier, meta);
  const tiragePath = join(TIRAGES_DIR, nomTirage);
  const themePath = join(GABARITS_DIR, `gabarit-${gabarit}.css`);

  try {
    journal.info(`vivliostyle build → ${nomTirage}`);
    const proc = CHROMIUM
      ? await $`${VIVLIOSTYLE} build ${mdPath} --theme ${themePath} -o ${tiragePath} --executable-browser ${CHROMIUM}`
      : await $`${VIVLIOSTYLE} build ${mdPath} --theme ${themePath} -o ${tiragePath}`;
    const stdout = proc.stdout.toString().trim();
    if (stdout) journal.info(stdout);
  } catch (err: any) {
    const stderr = (err.stderr?.toString() ?? String(err)).trim();
    journal.erreur("vivliostyle —", stderr);
    throw new Error(stderr || "Échec de la composition");
  }

  await $`rm -rf ${tmpDir}`.quiet();

  return nomTirage;
}
