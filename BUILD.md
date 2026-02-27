# VibeBrowser - Build Guide

Detaillierte Anleitung zum Erstellen der EXE-Datei und zum Einrichten des Update-Systems.

## 🏗️ EXE erstellen

### Schritt 1: Icon vorbereiten

Erstelle ein Icon für deine App:

1. Erstelle einen Ordner `build/` im Projekt-Root
2. Füge eine `icon.ico` Datei hinzu (256x256 oder 512x512)
   - Online-Tools wie [icoconvert.com](https://icoconvert.com/) können PNG zu ICO konvertieren

```
VibeBrowser/
├── build/
│   └── icon.ico
```

### Schritt 2: package.json prüfen

Stelle sicher, dass folgende Felder korrekt sind:

```json
{
  "name": "vibebrowser",
  "version": "1.0.0",
  "description": "Ein moderner Browser",
  "author": "Dein Name",
  "build": {
    "appId": "com.vibebrowser.app",
    "productName": "VibeBrowser"
  }
}
```

### Schritt 3: Build durchführen

```powershell
# 1. Dependencies installieren
npm install

# 2. TypeScript & Assets kompilieren
npm run build

# 3. EXE mit Installer erstellen
npm run dist
```

### Build-Ausgabe

Nach erfolgreichem Build findest du die Dateien in:
```
release/
├── VibeBrowser Setup 1.0.0.exe      # Installer
├── VibeBrowser Setup 1.0.0.exe.blockmap
├── latest.yml                        # Update-Manifest
└── win-unpacked/                     # Portable Version
    └── VibeBrowser.exe
```

### Nur Portable Version (ohne Installer)

```powershell
npm run pack
```

Dies erstellt nur das `win-unpacked/` Verzeichnis ohne Installer.

## 🔄 Auto-Update System einrichten

### Option 1: GitHub Releases (Empfohlen)

#### 1. GitHub Repository erstellen

```powershell
# Repository initialisieren
git init
git add .
git commit -m "Initial commit"

# GitHub Repository verlinken
git remote add origin https://github.com/DEIN-USERNAME/VibeBrowser.git
git push -u origin main
```

#### 2. GitHub Personal Access Token erstellen

1. Gehe zu GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Klicke auf "Generate new token (classic)"
3. Name: `VibeBrowser Build`
4. Scopes: ✅ `repo` (alle Unterpunkte)
5. Token kopieren (nur einmal sichtbar!)

#### 3. package.json anpassen

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "DEIN-GITHUB-USERNAME",
      "repo": "VibeBrowser"
    }
  }
}
```

#### 4. Token als Umgebungsvariable setzen

**PowerShell (temporär):**
```powershell
$env:GH_TOKEN = "dein_github_token_hier"
```

**Windows permanent:**
1. Systemsteuerung → System → Erweiterte Systemeinstellungen
2. Umgebungsvariablen
3. Neue Benutzervariable: `GH_TOKEN` = `dein_token`

#### 5. Release erstellen

```powershell
# Build und Upload zu GitHub
npm run dist
```

Dies:
- Erstellt die EXE
- Erstellt ein GitHub Release mit Tag `v1.0.0`
- Lädt alle Dateien hoch
- Erstellt `latest.yml` für Updates

#### 6. Neue Version veröffentlichen

1. **Version erhöhen** in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Änderungen committen**:
   ```powershell
   git add .
   git commit -m "v1.0.1 - Bug fixes"
   git push
   ```

3. **Neuen Build erstellen**:
   ```powershell
   npm run dist
   ```

4. **Users erhalten automatisch Update-Benachrichtigung!** 🎉

### Option 2: Eigener Server

#### 1. Server-Struktur

Erstelle auf deinem Server:
```
https://dein-server.com/updates/
├── VibeBrowser Setup 1.0.0.exe
├── VibeBrowser Setup 1.0.0.exe.blockmap
└── latest.yml
```

#### 2. package.json konfigurieren

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://dein-server.com/updates"
    }
  }
}
```

#### 3. latest.yml Beispiel

```yaml
version: 1.0.0
files:
  - url: VibeBrowser Setup 1.0.0.exe
    sha512: [generierter-hash]
    size: 85234567
path: VibeBrowser Setup 1.0.0.exe
sha512: [generierter-hash]
releaseDate: '2026-02-26T10:00:00.000Z'
```

#### 4. Neue Version hochladen

```powershell
# Build erstellen
npm run dist

# Dateien auf Server hochladen
# - VibeBrowser Setup [VERSION].exe
# - VibeBrowser Setup [VERSION].exe.blockmap
# - latest.yml (überschreiben)
```

## 🧪 Update-System testen

### In der Entwicklung

```typescript
// In src/main/auto-updater.ts
// Kommentiere diese Zeile aus für Tests:
if (process.env.NODE_ENV === 'development') {
  return; // <-- Auskommentieren
}
```

### Testflow

1. **Version 1.0.0 installieren**
   ```powershell
   npm run dist
   # Installer ausführen
   ```

2. **Version auf 1.0.1 erhöhen** in `package.json`

3. **Neue Version als Release veröffentlichen**
   ```powershell
   npm run dist
   ```

4. **Installierte App starten**
   - Nach 3 Sekunden sollte Update-Dialog erscheinen
   - "Ja, herunterladen" klicken
   - Progress wird angezeigt
   - Nach Download: "Jetzt neu starten"
   - App startet neu mit Version 1.0.1 ✅

## 🔧 Erweiterte Build-Optionen

### Code-Signing (für produktive Apps)

```json
{
  "build": {
    "win": {
      "certificateFile": "cert.pfx",
      "certificatePassword": "password",
      "signingHashAlgorithms": ["sha256"],
      "signDlls": true
    }
  }
}
```

### Mehrere Installer-Formate

```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        },
        {
          "target": "zip",
          "arch": ["x64"]
        }
      ]
    }
  }
}
```

### NSIS Installer-Optionen

```json
{
  "build": {
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "allowElevation": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "runAfterFinish": true,
      "shortcutName": "VibeBrowser",
      "artifactName": "${productName}-Setup-${version}.${ext}"
    }
  }
}
```

## 📦 Build für andere Plattformen

### macOS

```json
{
  "build": {
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.productivity",
      "icon": "build/icon.icns"
    }
  }
}
```

```bash
npm run dist -- --mac
```

### Linux

```json
{
  "build": {
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Network"
    }
  }
}
```

```bash
npm run dist -- --linux
```

## 🐛 Häufige Build-Probleme

### Problem: "Cannot find module 'electron'"

**Lösung:**
```powershell
npm install
```

### Problem: Icon wird nicht angezeigt

**Lösung:**
1. Stelle sicher, dass `build/icon.ico` existiert
2. ICO muss mehrere Größen enthalten (16x16, 32x32, 48x48, 256x256)
3. Cache löschen: `Remove-Item release -Recurse -Force`

### Problem: Updates funktionieren nicht

**Lösung:**
1. Prüfe ob `latest.yml` korrekt im Release ist
2. Stelle sicher, dass die URL erreichbar ist
3. In Produktion muss Code-Signing aktiv sein (Windows)

### Problem: "GH_TOKEN not set"

**Lösung:**
```powershell
# Token setzen
$env:GH_TOKEN = "dein_token"

# Prüfen
echo $env:GH_TOKEN
```

## 📊 Build-Statistiken

Nach `npm run dist`:
```
⨯ Building macOS zip  (disabled: current platform is windows)
⨯ Building macOS dmg  (disabled: current platform is windows)
• electron-builder  version=24.6.4 os=10.0.19045
• loaded configuration  file=package.json
• writing effective config  file=release\builder-effective-config.yaml
• packaging       platform=win32 arch=x64 electron=27.0.0
• building        target=nsis file=release\VibeBrowser Setup 1.0.0.exe
• building block map  blockMapFile=release\VibeBrowser Setup 1.0.0.exe.blockmap
```

## 🎯 Checkliste vor Release

- [ ] Version in `package.json` erhöht
- [ ] Changelog/Release Notes vorbereitet
- [ ] Tests durchgeführt
- [ ] Icon vorhanden
- [ ] GitHub Token gesetzt
- [ ] `npm run build` erfolgreich
- [ ] `npm run dist` erfolgreich
- [ ] Installer getestet
- [ ] Update-Prozess getestet (falls nicht erster Release)

## 🚀 Distribution

Nach erfolgreichem Build kannst du:
1. Installer direkt verteilen (`VibeBrowser Setup 1.0.0.exe`)
2. Portable Version verteilen (`win-unpacked/`)
3. Auf GitHub veröffentlichen (automatisch via `npm run dist`)
4. Auf eigener Website hosten

---

**Tipp**: Für erste Builds empfehle ich GitHub Releases - es ist kostenlos und das Update-System funktioniert sofort! 🎉
