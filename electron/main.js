const { app, BrowserWindow } = require("electron")
const path = require("path")
const fs = require("fs")

function loadConfig() {
    const configPath = path.join(__dirname, "config.json")
    if (!fs.existsSync(configPath)) {
        return null
    }
    const configData = fs.readFileSync(configPath, "utf-8")
    return JSON.parse(configData)
}

function findIndexURL(config) {
    if (!config || config.offline) {
        const localPath = path.join(__dirname, "..", "web", "index.html")
        return `file://${localPath}?offline=true`
    }
    const url = new URL("/", config.endpoint)
    return url.toString()
}

function createWindow() {
    const config = loadConfig()

    const win = new BrowserWindow({
        fullscreen: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    win.loadURL(findIndexURL(config))

    // Hide menu bar completely
    win.setMenuBarVisibility(false)

    // win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
    app.quit()
})
