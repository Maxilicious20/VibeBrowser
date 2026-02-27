const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  // Erstelle das Browser-Fenster.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hidden', // Versteckt die hässliche Standard-Windows-Leiste für unseren Vibe-Look
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false // Für den Anfang auf false, damit wir leichter bauen können
    }
  });

  // Lade die index.html unserer App.
  mainWindow.loadFile('src/index.html');
}

// Wenn Electron bereit ist, öffne das Fenster
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Beende die App, wenn alle Fenster geschlossen sind
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});