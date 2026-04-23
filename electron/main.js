const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const PORT = 3000
const BASE = '/sans-titre.art/tampon'

let mainWindow = null
let bunProcess = null

function getChromiumPath(res) {
  // Le Dockerfile.build copie le répertoire Chromium dans bin/chromium-bundle/
  // et écrit le nom de l'exécutable dans bin/chromium-path.txt
  const namePath = path.join(res, 'bin', 'chromium-path.txt')
  const exeName  = fs.readFileSync(namePath, 'utf-8').trim()
  return path.join(res, 'bin', 'chromium-bundle', exeName)
}

function getPaths() {
  if (app.isPackaged) {
    const res     = process.resourcesPath
    const userDir = path.join(app.getPath('documents'), 'Tampon')
    return {
      bun:         path.join(res, 'bin', 'bun'),
      app:         path.join(res, 'app'),
      gabarits:    path.join(res, 'app', 'gabarits'),
      tirages:     path.join(userDir, 'tirages'),
      logs:        path.join(userDir, 'logs'),
      vivliostyle: path.join(res, 'app', 'node_modules', '.bin', 'vivliostyle'),
      chromium:    getChromiumPath(res),
    }
  }
  // Mode dev : pas de packaging, Chromium système (idem Docker)
  return {
    bun:         'bun',
    app:         path.join(__dirname, '..'),
    gabarits:    path.join(__dirname, '..', 'gabarits'),
    tirages:     path.join(__dirname, '..', 'tirages'),
    logs:        path.join(__dirname, '..', 'logs'),
    vivliostyle: 'vivliostyle',
    chromium:    '/usr/bin/chromium',
  }
}

function startBun(paths) {
  fs.mkdirSync(paths.tirages, { recursive: true })

  bunProcess = spawn(paths.bun, ['run', path.join(paths.app, 'server.ts')], {
    cwd: paths.app,
    env: {
      ...process.env,
      GABARITS_DIR:    paths.gabarits,
      TIRAGES_DIR:     paths.tirages,
      LOGS_DIR:        paths.logs,
      VIVLIOSTYLE_BIN: paths.vivliostyle,
      CHROMIUM_PATH:   paths.chromium,
    },
  })

  bunProcess.stdout.on('data', d => console.log('[bun]', d.toString().trim()))
  bunProcess.stderr.on('data', d => console.error('[bun]', d.toString().trim()))
}

function waitForServer(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = () =>
      fetch(`http://localhost:${PORT}${BASE}`)
        .then(resolve)
        .catch(() => {
          if (--retries <= 0) reject(new Error('Serveur Bun inaccessible'))
          else setTimeout(check, 300)
        })
    setTimeout(check, 500)
  })
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    title: 'Tampon — atelier de composition',
  })

  await waitForServer()
  mainWindow.loadURL(`http://localhost:${PORT}${BASE}`)
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  const paths = getPaths()
  startBun(paths)
  createWindow()
})

app.on('window-all-closed', () => {
  if (bunProcess) bunProcess.kill()
  app.quit()
})
