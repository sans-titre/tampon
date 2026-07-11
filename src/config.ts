// Chemins et constantes partagés. Trois contextes d'exécution :
//   dev     : racine = dépôt courant, tirages/logs sous $HOME
//   docker  : env posés par le Dockerfile (/app/...)
//   .deb    : env posés par le wrapper /usr/bin/tampon (/usr/lib/tampon/share)

import { homedir } from "os";
import { join } from "path";

export const BASE = "/sans-titre.art/tampon";

const RACINE = process.env.TAMPON_RACINE ?? ".";

export const UI_DIR = join(RACINE, "ui");
export const GABARITS_DIR = join(RACINE, "gabarits");
export const TIRAGES_DIR = process.env.TIRAGES_DIR ?? join(homedir(), "Documents", "Tampon");
export const LOGS_DIR = process.env.LOGS_DIR ?? join(homedir(), ".local", "state", "tampon");
