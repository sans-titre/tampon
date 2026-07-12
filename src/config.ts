// Chemins et constantes partagés. Trois contextes d'exécution :
//   dev     : racine = dépôt courant, tirages/logs sous $HOME
//   docker  : env posés par le Dockerfile (/app/...)
//   .deb    : env posés par le wrapper /usr/bin/tampon (/usr/lib/tampon/share)

import { homedir } from "os";
import { join } from "path";

export const BASE = "/sans-titre.art/tampon";

const RACINE = process.env.TAMPON_RACINE ?? ".";

// Contexte .deb : le wrapper /usr/bin/tampon pose TAMPON_ESPACE_UTILISATEUR=1.
// Les fichiers fournis sont enfouis en lecture seule sous /usr/lib/tampon/share
// (root) ; on les amorce alors, éditables, dans ~/Documents/Tampon (cf.
// src/amorcage.ts). En dev/docker le drapeau est absent : rien ne bouge, les
// gabarits restent lus depuis le dépôt / l'image.
export const ESPACE_UTILISATEUR = process.env.TAMPON_ESPACE_UTILISATEUR === "1";

export const UI_DIR = join(RACINE, "ui");
export const TIRAGES_DIR = process.env.TIRAGES_DIR ?? join(homedir(), "Documents", "Tampon");
export const LOGS_DIR = process.env.LOGS_DIR ?? join(homedir(), ".local", "state", "tampon");

// Fichiers fournis par le paquet (source d'amorçage, lecture seule en .deb).
export const GABARITS_FOURNIS = join(RACINE, "gabarits");
export const EXEMPLES_FOURNIS = join(RACINE, "examples");

// Emplacements amorcés, éditables, aux côtés des tirages.
export const GABARITS_UTILISATEUR = join(TIRAGES_DIR, "gabarits");
export const EXEMPLES_UTILISATEUR = join(TIRAGES_DIR, "examples");

// Source de vérité lue par l'app (liste, validation, service HTTP, rendu) :
// l'espace utilisateur éditable en .deb, les fichiers fournis sinon.
export const GABARITS_DIR = ESPACE_UTILISATEUR ? GABARITS_UTILISATEUR : GABARITS_FOURNIS;
