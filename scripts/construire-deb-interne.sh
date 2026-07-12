#!/usr/bin/env bash
# Exécuté DANS l'image tampon-construction par construire-deb.sh.
# 1. compile le serveur en binaire autonome (bun build --compile)
# 2. télécharge chrome-headless-shell (version épinglée, Chrome for Testing)
# 3. assemble l'arborescence .deb et appelle dpkg-deb
set -euo pipefail

# Version unique, lue aussi par la clé de cache CI (hashFiles sur ce fichier).
CHS_VERSION=$(cat "$(dirname "$0")/chs-version")
CHS_URL="https://storage.googleapis.com/chrome-for-testing-public/${CHS_VERSION}/linux64/chrome-headless-shell-linux64.zip"

# Version dérivée du tag Git (source de vérité unique) : un .deb dit lui-même
# ce qu'il est, sans bump manuel de manifeste. Sur un commit taggé, git
# describe donne « v0.3.0-alpha.3 » ; sur un commit ultérieur,
# « v0.3.0-alpha.3-5-gabc1234 » (5 commits après le tag + hash court).
DESCRIBE=$(git describe --tags)
VERSION=${DESCRIBE#v}

# Champ Version Debian. Pré-release npm (0.3.0-alpha.3) → 0.3.0~alpha.3 : le
# tilde trie AVANT la version finale (sémantique apt correcte). Un build
# intermédiaire (…-5-gabc1234) devient 0.3.0~alpha.3+5.gabc1234 : le « + »
# trie APRÈS le tag, donc plus récent que la pré-release officielle, et
# distingue nettement release exacte vs build de développement.
# Le nom de FICHIER garde la forme à tirets (GitHub remplace ~ et + dans les
# noms d'assets).
if [[ "$VERSION" =~ ^(.+)-([0-9]+)-(g[0-9a-f]+)$ ]]; then
  DEB_VERSION="$(printf '%s' "${BASH_REMATCH[1]}" | tr '-' '~')+${BASH_REMATCH[2]}.${BASH_REMATCH[3]}"
else
  DEB_VERSION="$(printf '%s' "$VERSION" | tr '-' '~')"
fi
echo "— tampon ${DEB_VERSION} / chrome-headless-shell ${CHS_VERSION}"

echo "— compilation du binaire"
bun install --silent
rm -rf build
mkdir -p build dist/cache
bun build --compile server.ts --outfile build/tampon-bin > /dev/null

echo "— chrome-headless-shell"
ZIP="dist/cache/chrome-headless-shell-${CHS_VERSION}-linux64.zip"
if [ ! -f "$ZIP" ]; then
  curl -fL --progress-bar -o "$ZIP" "$CHS_URL"
fi
unzip -q "$ZIP" -d build/chs

echo "— assemblage du paquet"
DEB="build/deb"
LIB="$DEB/usr/lib/tampon"
mkdir -p "$DEB/DEBIAN" "$DEB/usr/bin" "$LIB/bin" "$LIB/share"

cp build/tampon-bin "$LIB/bin/tampon"
cp -r build/chs/chrome-headless-shell-linux64 "$LIB/chrome-headless-shell"
cp -r ui gabarits examples "$LIB/share/"
chmod 755 "$LIB/bin/tampon" "$LIB/chrome-headless-shell/chrome-headless-shell"

cat > "$DEB/usr/bin/tampon" <<'EOF'
#!/bin/sh
export TAMPON_RACINE=/usr/lib/tampon/share
export TAMPON_ESPACE_UTILISATEUR=1
export CHROMIUM_PATH=/usr/lib/tampon/chrome-headless-shell/chrome-headless-shell
exec /usr/lib/tampon/bin/tampon "$@"
EOF
chmod 755 "$DEB/usr/bin/tampon"

# Entrée de menu + icône : tampon est référencé dans le pool d'applications
# du bureau. Lancé sans terminal, le serveur ouvre lui-même le navigateur ;
# un second lancement réutilise l'instance en cours (sonde /sante).
mkdir -p "$DEB/usr/share/applications" "$DEB/usr/share/icons/hicolor/scalable/apps"
cp ui/tampon.svg "$DEB/usr/share/icons/hicolor/scalable/apps/tampon.svg"
cat > "$DEB/usr/share/applications/tampon.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Tampon
Comment=Composer des PDF prêts à imprimer à partir de Markdown
Exec=tampon
Icon=tampon
Terminal=false
Categories=Office;Publishing;
Keywords=markdown;pdf;impression;gabarit;composition;
StartupNotify=false
EOF

TAILLE_KO=$(du -sk "$DEB/usr" | cut -f1)
cat > "$DEB/DEBIAN/control" <<EOF
Package: tampon
Version: ${DEB_VERSION}
Section: text
Priority: optional
Architecture: amd64
Installed-Size: ${TAILLE_KO}
Depends: libc6, libnss3, libnspr4, libexpat1, libfontconfig1, libfreetype6, libglib2.0-0, zlib1g, libx11-6, libxcomposite1, libxdamage1, libxext6, libxfixes3, libxrandr2, libxcb1, libxkbcommon0, libasound2t64 | libasound2, libatk1.0-0, libatk-bridge2.0-0, libatspi2.0-0, libdbus-1-3, libgbm1, fonts-liberation
Maintainer: Association sans-titre <neoprene@sans-titre.art>
Description: Atelier de composition typographique Markdown vers PDF
 tampon compose des documents PDF prêts à imprimer à partir de Markdown,
 via des gabarits CSS Paged Media rendus par Paged.js.
 Autonome : serveur compilé (Bun) et moteur de rendu
 chrome-headless-shell embarqués, aucune dépendance à un navigateur installé.
EOF

dpkg-deb --build --root-owner-group "$DEB" "dist/tampon_${VERSION}_amd64.deb" > /dev/null

# Le conteneur tourne en root : rendre les artefacts à l'utilisateur hôte.
chown -R "$(stat -c %u:%g /src)" dist build
