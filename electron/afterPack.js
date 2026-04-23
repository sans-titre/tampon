const path = require('path')
const fs   = require('fs')

// Pour le .deb : chrome-sandbox reste dans le bundle.
// Le script after-install.sh lui donne chown root + chmod 4755 à l'installation.
//
// Pour l'AppImage : chrome-sandbox ne peut pas être setuid (mount read-only),
// et Ubuntu 24.04 bloque aussi les user namespaces non-privilégiés via AppArmor.
// On le supprime donc — l'AppImage est distribuée avec la note que le .deb
// est le format recommandé sur Ubuntu 24.04+.

module.exports = async function afterPack(context) {
  const isAppImage = context.targets.some(t => t.name === 'appImage')
  if (!isAppImage) return

  const sandbox = path.join(context.appOutDir, 'chrome-sandbox')
  if (fs.existsSync(sandbox)) {
    fs.unlinkSync(sandbox)
    console.log('  • AppImage : chrome-sandbox retiré (non compatible setuid)')
  }
}
