import { cpSync, existsSync, mkdirSync } from "node:fs";
import {
  ESPACE_UTILISATEUR,
  EXEMPLES_FOURNIS,
  EXEMPLES_UTILISATEUR,
  GABARITS_FOURNIS,
  GABARITS_UTILISATEUR,
  TIRAGES_DIR,
} from "./config";
import { journal } from "./journal";

// Copie fichier à fichier sans jamais écraser : force + errorOnExist à false
// font sauter silencieusement toute entrée déjà présente, tout en descendant
// dans les sous-dossiers existants (fonts/…) pour y semer les nouveautés.
// Sémantique inter-versions voulue : les fichiers ajoutés par une mise à jour
// arrivent, une version éditée par l'utilisateur reste intacte.
function semer(source: string, cible: string): void {
  if (!existsSync(source)) return;
  cpSync(source, cible, { recursive: true, force: false, errorOnExist: false });
}

// Amorçage idempotent de ~/Documents/Tampon : n'a lieu qu'en contexte .deb
// (TAMPON_ESPACE_UTILISATEUR=1), où les gabarits/exemples fournis sont enfouis
// en lecture seule sous /usr/lib/tampon/share. On les expose éditables aux
// côtés des tirages. En dev/docker : sans effet.
export function amorcerEspaceUtilisateur(): void {
  if (!ESPACE_UTILISATEUR) return;

  mkdirSync(TIRAGES_DIR, { recursive: true });
  semer(GABARITS_FOURNIS, GABARITS_UTILISATEUR);
  semer(EXEMPLES_FOURNIS, EXEMPLES_UTILISATEUR);

  journal.info(`Gabarits et exemples fournis disponibles dans ${TIRAGES_DIR}`);
}
