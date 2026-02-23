import { app, BrowserWindow, ipcMain, screen, globalShortcut, dialog, clipboard, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import initSqlJs from 'sql.js'
import fs from 'fs'

// ── CRITICAL: Disable hardware acceleration for transparency on Windows ──
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')

// ── Constants ──────────────────────────────────────────────
const COLLAPSED_WIDTH = 24
const EXPANDED_WIDTH = 380
const CLEANUP_HOUR = 17 // 5:00 PM default
let mainWindow = null
let db = null
let dbPath = ''
let doomsdayFired = false
let dockSide = 'right' // 'left' or 'right'

// ── Persist helper: save DB to disk ────────────────────────
function saveDb() {
    if (!db) return
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
}

// ── Database ───────────────────────────────────────────────
async function initDatabase() {
    dbPath = join(app.getPath('userData'), 'dropzone.db')
    const SQL = await initSqlJs()

    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath)
        db = new SQL.Database(fileBuffer)
    } else {
        db = new SQL.Database()
    }

    db.run(`
    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL,
      thumbnail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

    // Settings table for dock side preference
    db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

    // Add html_content column if not present (migration for existing DBs)
    try {
        db.run('ALTER TABLE snippets ADD COLUMN html_content TEXT')
    } catch {
        // Column already exists — ignore
    }

    // Load persisted dock side
    const result = db.exec("SELECT value FROM settings WHERE key = 'dockSide'")
    if (result.length > 0 && result[0].values.length > 0) {
        dockSide = result[0].values[0][0]
    }

    saveDb()
}

// ── Window Creation ────────────────────────────────────────
function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
    const startX = dockSide === 'left' ? 0 : screenWidth - COLLAPSED_WIDTH

    mainWindow = new BrowserWindow({
        icon: join(__dirname, '../../resources/icon.ico'),
        width: COLLAPSED_WIDTH,
        height: screenHeight,
        x: startX,
        y: primaryDisplay.workArea.y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        hasShadow: false,
        backgroundColor: '#00000000',
        show: false, // Don't show until ready
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false // Allow loading local file:// images
        }
    })

    mainWindow.setVisibleOnAllWorkspaces(true)
    mainWindow.setAlwaysOnTop(true, 'screen-saver')

    // Show window only after it's ready to prevent white flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Prevent the window from being closed by the user accidentally
    mainWindow.on('close', (e) => {
        e.preventDefault()
        mainWindow.hide()
    })
}

// ── IPC: Window Resize ─────────────────────────────────────
function getDisplayMetrics() {
    const primaryDisplay = screen.getPrimaryDisplay()
    return {
        screenWidth: primaryDisplay.workAreaSize.width,
        screenHeight: primaryDisplay.workAreaSize.height,
        y: primaryDisplay.workArea.y
    }
}

ipcMain.on('expand', () => {
    if (!mainWindow) return
    const { screenWidth, screenHeight, y } = getDisplayMetrics()
    const x = dockSide === 'left' ? 0 : screenWidth - EXPANDED_WIDTH
    mainWindow.setBounds({ x, y, width: EXPANDED_WIDTH, height: screenHeight })
})

ipcMain.on('collapse', () => {
    if (!mainWindow) return
    const { screenWidth, screenHeight, y } = getDisplayMetrics()
    const x = dockSide === 'left' ? 0 : screenWidth - COLLAPSED_WIDTH
    mainWindow.setBounds({ x, y, width: COLLAPSED_WIDTH, height: screenHeight })
})

// ── IPC: Dock side ─────────────────────────────────────────
ipcMain.handle('get-dock-side', () => dockSide)

ipcMain.handle('set-dock-side', (_event, side) => {
    dockSide = side
    // Persist
    if (db) {
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('dockSide', ?)", [side])
        saveDb()
    }
    // Reposition window immediately (collapsed state)
    if (mainWindow) {
        const { screenWidth, screenHeight, y } = getDisplayMetrics()
        const x = side === 'left' ? 0 : screenWidth - COLLAPSED_WIDTH
        mainWindow.setBounds({ x, y, width: COLLAPSED_WIDTH, height: screenHeight })
    }
    return side
})

// ── IPC: Read local image file as base64 data URL ──────────
ipcMain.handle('read-local-image', (_event, filePath) => {
    try {
        // Handle file:// URIs
        let localPath = filePath
        if (localPath.startsWith('file:///')) {
            localPath = decodeURIComponent(localPath.replace('file:///', ''))
        } else if (localPath.startsWith('file://')) {
            localPath = decodeURIComponent(localPath.replace('file://', ''))
        }
        if (!fs.existsSync(localPath)) return null
        const buffer = fs.readFileSync(localPath)
        const ext = localPath.split('.').pop().toLowerCase()
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml', tiff: 'image/tiff', tif: 'image/tiff', ico: 'image/x-icon' }
        const mime = mimeMap[ext] || 'image/png'
        return `data:${mime};base64,${buffer.toString('base64')}`
    } catch {
        return null
    }
})

ipcMain.on('quit-app', () => {
    mainWindow?.removeAllListeners('close')
    app.quit()
})

// ── IPC: Clipboard (native, reliable HTML support) ─────────
ipcMain.handle('clipboard-read-html', () => {
    const text = clipboard.readText() || ''
    const html = clipboard.readHTML() || ''
    // Only check for image if there's no text content (avoids false positives)
    let image = null
    if (!text.trim()) {
        try {
            const img = clipboard.readImage()
            if (img && !img.isEmpty()) {
                image = img.toDataURL()
            }
        } catch {
            // readImage can fail on some clipboard formats
        }
    }
    return { text, html, image }
})

ipcMain.handle('clipboard-write-html', (_event, { text, html }) => {
    clipboard.write({
        text: text || '',
        html: html || ''
    })
    return true
})

// ── IPC: Snippet CRUD ──────────────────────────────────────
ipcMain.handle('save-snippet', (_event, data) => {
    const now = new Date().toISOString()
    db.run(
        'INSERT INTO snippets (type, content, thumbnail, html_content, created_at) VALUES (?, ?, ?, ?, ?)',
        [data.type || 'text', data.content, data.thumbnail || null, data.htmlContent || null, now]
    )
    saveDb()
    const row = db.exec('SELECT last_insert_rowid() as id')
    const id = row[0].values[0][0]
    return { id, ...data, created_at: now }
})

ipcMain.handle('get-snippets', () => {
    const result = db.exec('SELECT * FROM snippets ORDER BY created_at DESC')
    if (!result.length) return []
    const cols = result[0].columns
    return result[0].values.map(row => {
        const obj = {}
        cols.forEach((col, i) => { obj[col] = row[i] })
        return obj
    })
})

ipcMain.handle('search-snippets', (_event, query) => {
    const stmt = db.prepare('SELECT * FROM snippets WHERE content LIKE ? ORDER BY created_at DESC')
    stmt.bind([`%${query}%`])
    const results = []
    while (stmt.step()) {
        results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
})

ipcMain.handle('delete-snippet', (_event, id) => {
    db.run('DELETE FROM snippets WHERE id = ?', [id])
    saveDb()
    return { success: true }
})

ipcMain.handle('delete-all-snippets', () => {
    db.run('DELETE FROM snippets')
    saveDb()
    doomsdayFired = false
    return { success: true }
})

ipcMain.handle('save-permanent', async (_event, id) => {
    const stmt = db.prepare('SELECT * FROM snippets WHERE id = ?')
    stmt.bind([id])
    if (!stmt.step()) {
        stmt.free()
        return { success: false }
    }
    const snippet = stmt.getAsObject()
    stmt.free()

    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose folder to save snippet',
        properties: ['openDirectory']
    })

    if (result.canceled) return { success: false }

    const destFolder = result.filePaths[0]
    const timestamp = Date.now()

    if (snippet.type === 'image' && snippet.thumbnail) {
        const base64Data = snippet.thumbnail.replace(/^data:image\/\w+;base64,/, '')
        const ext = snippet.thumbnail.match(/^data:image\/(\w+)/)?.[1] || 'png'
        fs.writeFileSync(join(destFolder, `snippet-${timestamp}.${ext}`), base64Data, 'base64')
    } else {
        fs.writeFileSync(join(destFolder, `snippet-${timestamp}.txt`), snippet.content, 'utf-8')
    }

    return { success: true }
})

// ── Doomsday Auto-Clean Timer ──────────────────────────────
function startDoomsdayTimer() {
    setInterval(() => {
        const now = new Date()
        // Trigger within a 5-minute window (e.g., 17:00–17:04)
        if (now.getHours() === CLEANUP_HOUR && now.getMinutes() < 5 && !doomsdayFired) {
            doomsdayFired = true
            if (mainWindow) {
                const { screenWidth, screenHeight, y } = getDisplayMetrics()
                // Respect current dock side
                const x = dockSide === 'left' ? 0 : screenWidth - EXPANDED_WIDTH
                mainWindow.setBounds({
                    x, y,
                    width: EXPANDED_WIDTH,
                    height: screenHeight
                })
                mainWindow.webContents.send('doomsday')
                mainWindow.show()
                mainWindow.focus()
            }
        }
        // Reset after the trigger window closes
        if (now.getHours() === CLEANUP_HOUR && now.getMinutes() >= 5) {
            doomsdayFired = false
        }
    }, 30000)
}

// ── App Lifecycle ──────────────────────────────────────────
app.whenReady().then(async () => {
    await initDatabase()
    createWindow()
    startDoomsdayTimer()

    // Global hotkey: Ctrl+Shift+Space
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
        if (!mainWindow) return
        const { screenWidth, screenHeight, y } = getDisplayMetrics()
        const x = dockSide === 'left' ? 0 : screenWidth - EXPANDED_WIDTH
        mainWindow.setBounds({
            x,
            y,
            width: EXPANDED_WIDTH,
            height: screenHeight
        })
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('hotkey-search')
    })
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    saveDb()
    if (db) db.close()
})

app.on('window-all-closed', () => {
    // Don't quit on window close for this always-on utility
})

// Allow force quit with Ctrl+Q from the global scope
app.whenReady().then(() => {
    globalShortcut.register('CommandOrControl+Q', () => {
        mainWindow?.removeAllListeners('close')
        app.quit()
    })
})
