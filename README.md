# VibeBrowser

Ein moderner, anpassbarer Browser mit TypeScript und Electron, ausgestattet mit umfangreichen Features und automatischen Updates.

## ✨ Features

### 🔐 Datenpersistenz
- **Automatische Tab-Wiederherstellung**: Alle geöffneten Tabs werden beim Schließen gespeichert und beim nächsten Start wiederhergestellt
- **Browserverlauf**: Jeder Seitenbesuch wird automatisch getrackt (bis zu 1000 Einträge)
- **Lesezeichen**: Vollständiges Lesezeichen-Management mit Add/Remove/Suche
- **Einstellungen**: Startseite, Suchmaschine und Theme werden lokal gespeichert

### ⌨️ Tastenkombinationen
- `Ctrl+T` - Neuer Tab
- `Ctrl+W` - Tab schließen
- `Ctrl+Tab` - Nächster Tab
- `Ctrl+Shift+Tab` - Vorheriger Tab
- `Ctrl+R` / `F5` - Seite neu laden
- `Ctrl+L` - URL-Leiste fokussieren
- `Ctrl+D` - Lesezeichen hinzufügen
- `Ctrl+H` - Verlauf anzeigen
- `Ctrl+Shift+B` - Lesezeichen anzeigen
- `Alt+Links` - Zurück
- `Alt+Rechts` - Vorwärts
- `Ctrl++` - Zoom vergrößern
- `Ctrl+-` - Zoom verkleinern
- `Ctrl+0` - Zoom zurücksetzen
- `Ctrl+1-9` - Zu Tab 1-9 wechseln

### 🎨 Benutzeroberfläche
- **Lesezeichen-Seitenleiste**: Alle gespeicherten Lesezeichen verwalten
- **Verlaufs-Seitenleiste**: Browserverlauf durchsuchen und filtern
- **Einstellungs-Panel**: Startseite, Suchmaschine und Theme konfigurieren
- **Loading-Indikatoren**: Visuelles Feedback beim Laden von Seiten
- **Favicons**: Tab-Icons für bessere Übersicht
- **Fehlerseiten**: Mit Retry-Button bei Netzwerkfehlern

### 🔄 Automatische Updates
- Automatische Update-Checks alle 4 Stunden
- Update-Benachrichtigungen mit Download-Option
- Automatische Installation beim App-Neustart
- Update-Fortschrittsanzeige

### 🔍 Zoom-Steuerung
- 3 Zoom-Stufen pro Tab
- Tastenkombinationen integriert
- Persistente Zoom-Level

## 🚀 Installation & Entwicklung

### Voraussetzungen
- Node.js (v18 oder höher)
- npm oder yarn

### Projekt Setup
```bash
# Dependencies installieren
npm install

# App im Entwicklungsmodus starten
npm run dev

# Produktions-Build erstellen
npm run build

# App starten
npm start
```

## 📦 EXE-Datei erstellen

### 1. Projekt vorbereiten

Stelle sicher, dass alle Dependencies installiert sind:
```bash
npm install
```

### 2. Build erstellen

```bash
# Produktions-Build und EXE erstellen
npm run dist
```

Dies erstellt eine installierbare EXE-Datei im `release/` Verzeichnis.

### 3. Nur Portable Version (ohne Installer)

```bash
# Nur gepackte App ohne Installer
npm run pack
```

### 4. Build-Konfiguration

Die Build-Konfiguration befindet sich in `package.json` unter `"build"`:

```json
{
  "build": {
    "appId": "com.vibebrowser.app",
    "productName": "VibeBrowser",
    "win": {
      "target": ["nsis"],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    }
  }
}
```

## 🔄 Auto-Update System einrichten

### Für GitHub Releases

1. **GitHub Repository erstellen**
   ```bash
   git init
   git remote add origin https://github.com/DEIN-USERNAME/VibeBrowser.git
   ```

2. **package.json anpassen**
   ```json
   {
     "build": {
       "publish": {
         "provider": "github",
         "owner": "DEIN-USERNAME",
         "repo": "VibeBrowser"
       }
     }
   }
   ```

3. **GitHub Token setzen**
   ```bash
   # Windows
   set GH_TOKEN=dein_github_token
   
   # Linux/Mac
   export GH_TOKEN=dein_github_token
   ```

4. **Release erstellen**
   ```bash
   npm run dist
   ```
   
   Dies erstellt automatisch ein GitHub Release mit der EXE.

5. **Version erhöhen**
   
   Bearbeite `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```
   
   Dann erneut builden und pushen.

### Update-Flow

1. User startet die App
2. App checkt automatisch nach 3 Sekunden auf Updates
3. Alle 4 Stunden wird erneut geprüft
4. Wenn ein Update verfügbar ist:
   - Dialog erscheint mit Download-Option
   - User kann sofort downloaden oder später
5. Nach Download:
   - Dialog zeigt "Update bereit"
   - User kann App neu starten oder später
6. Bei Neustart wird Update automatisch installiert

## 📁 Projekt-Struktur

```
VibeBrowser/
├── src/
│   ├── main/              # Main Process (Electron)
│   │   ├── main.ts        # App Entry Point
│   │   ├── window.ts      # Window Manager
│   │   ├── browser-view.ts # BrowserView Manager
│   │   ├── storage.ts     # Datenpersistenz
│   │   ├── shortcuts.ts   # Tastenkombinationen
│   │   ├── auto-updater.ts # Auto-Update System
│   │   └── ipc/
│   │       └── handlers.ts # IPC Handler
│   ├── renderer/          # Renderer Process (UI)
│   │   ├── index.html
│   │   ├── app.ts         # Main App Logic
│   │   └── components/
│   │       ├── tab-manager.ts
│   │       └── toolbar.ts
│   ├── preload/           # Preload Scripts
│   │   └── preload.ts     # IPC Bridge
│   ├── common/            # Shared Types
│   │   └── types.ts
│   └── styles/
│       └── vibe.css       # Catppuccin Theme
├── dist/                  # Build Output
├── release/               # EXE Releases
└── package.json
```

## 🎨 Theme Anpassung

Das Theme basiert auf Catppuccin Mocha. Farben können in `src/styles/vibe.css` angepasst werden:

```css
:root {
  --bg-primary: #1e1e2e;
  --bg-secondary: #313244;
  --accent: #89b4fa;
  /* ... weitere Farben */
}
```

## 📊 Datenspeicherung

Alle Daten werden lokal gespeichert in:
```
Windows: C:\Users\[Username]\AppData\Roaming\VibeBrowser\
```

Gespeicherte Dateien:
- `tabs.json` - Geöffnete Tabs
- `history.json` - Browserverlauf (max. 1000 Einträge)
- `bookmarks.json` - Lesezeichen
- `settings.json` - App-Einstellungen

## 🛠️ Development

### TypeScript Compilation
```bash
# Watch Mode
npm run build:watch
```

### Debugging
```bash
# Mit Chrome DevTools
npm run dev
```

### Logs
- Main Process: Konsole im Terminal
- Renderer Process: Chrome DevTools (F12)

## 📝 Zukünftige Features

- [ ] Context Menus (Rechtsklick)
- [ ] Download Manager
- [ ] Find in Page (Seitensuche)
- [ ] Tab-Gruppen
- [ ] Extensions Support
- [ ] Private Browsing Mode

## 🐛 Bug Reports

Bei Problemen bitte ein Issue auf GitHub erstellen mit:
- OS Version
- VibeBrowser Version
- Fehlerbeschreibung
- Schritte zum Reproduzieren

## 📄 Lizenz

ISC License - Siehe LICENSE Datei

## 👨‍💻 Entwickler

Erstellt mit ❤️ und TypeScript

---

## 🎨 ADVANCED: Custom CSS Themes (wie Discord/Vencord)

### Theme-Ordner

Themes werden gespeichert in:
```
C:\Users\<DeinName>\AppData\Roaming\VibeBrowser\themes\
```

### Theme erstellen - Schnellstart

1. Öffne den `themes\` Ordner (oder erstelle ihn)
2. Erstelle neue Datei: `mein-theme.css`
3. Kopiere Vorlage:

```css
/* Mein Custom Theme v1.0 */

:root {
  /* Hintergrund */
  --bg-primary: #1e1e2e;
  --bg-secondary: #313244;
  --bg-tertiary: #45475a;
  
  /* Text */
  --text-primary: #cdd6f4;
  --text-secondary: #bac2de;
  
  /* Accents */
  --accent: #89b4fa;          /* Haupt-Farbe (Links, Buttons) */
  --accent-2: #f38ba8;        /* Sekundär (Hervorhebungen) */
  --accent-3: #a6e3a1;        /* Tertiär (Success-States) */
  
  /* Spezial */
  --success: #a6e3a1;         /* Erfolg (Grün) */
  --error: #f38ba8;           /* Fehler (Rot) */
  --warning: #f9e2af;         /* Warnung (Gelb) */
  --info: #89b4fa;            /* Info (Blau) */
}
```

4. **Speichern** und Browser neu starten
5. Einstellungen → Theme → Dein Theme wählen

### Beispiel-Themes zum Kopieren

#### 🌙 **Nord Dark** (Beliebtes minimalistisches Dark Theme)
```css
/* Nord Dark Theme */
:root {
  --bg-primary: #2e3440;
  --bg-secondary: #3b4252;
  --bg-tertiary: #434c5e;
  --text-primary: #eceff4;
  --text-secondary: #d8dee9;
  --accent: #88c0d0;          /* Türkis */
  --accent-2: #bf616a;        /* Rot */
  --accent-3: #a3be8c;        /* Grün */
  --success: #a3be8c;
  --error: #bf616a;
  --warning: #ebcb8b;
  --info: #88c0d0;
}
```

#### ☀️ **Soft Light** (Angenehm Hell)
```css
/* Soft Light Theme - Augen-freundlich */
:root {
  --bg-primary: #fafbf9;
  --bg-secondary: #f0f2ee;
  --bg-tertiary: #e5e8e2;
  --text-primary: #3a4150;
  --text-secondary: #6b737f;
  --accent: #4a90e2;          /* Sanftes Blau */
  --accent-2: #e24a4a;        /* Sanftes Rot */
  --accent-3: #50c878;        /* Sanftes Grün */
  --success: #50c878;
  --error: #e24a4a;
  --warning: #f5a623;
  --info: #4a90e2;
}
```

#### 🍇 **Grape Purple** (Modern, trendig)
```css
/* Grape Dark - Purple Vibes */
:root {
  --bg-primary: #1a0033;      /* Deep Purple */
  --bg-secondary: #2d0052;
  --bg-tertiary: #4a0080;
  --text-primary: #e6d5ff;
  --text-secondary: #cc99ff;
  --accent: #b366ff;          /* Helles Purple */
  --accent-2: #ff66cc;        /* Pink */
  --accent-3: #66ffcc;        /* Cyan */
  --success: #66ffcc;
  --error: #ff66cc;
  --warning: #ffcc66;
  --info: #b366ff;
}
```

#### 🔥 **Fire Orange** (Energisch, warm)
```css
/* Fire Orange Theme */
:root {
  --bg-primary: #1a1410;
  --bg-secondary: #2d2416;
  --bg-tertiary: #3d3219;
  --text-primary: #f5e6d3;
  --text-secondary: #d4b5a0;
  --accent: #ff8c42;          /* Orange */
  --accent-2: #ff4757;        /* Rot */
  --accent-3: #ffd93d;        /* Gold */
  --success: #ffd93d;
  --error: #ff4757;
  --warning: #ff8c42;
  --info: #ff8c42;
}
```

### Farben verstehen

```css
/* HEX-Format (häufigster Standard) */
#ffffff    /* Weiß */
#000000    /* Schwarz */
#ff0000    /* Reines Rot */
#00ff00    /* Reines Grün */
#0000ff    /* Reines Blau */

/* RGB Alternative (äquivalent) */
rgb(255, 255, 255)            /* Weiß */
rgb(255, 0, 0)                /* Rot */

/* Mit Transparenz (RGBA) */
rgba(255, 0, 0, 0.5)          /* Semi-transparentes Rot (50%) */
```

### Theme-Design Tipps

✅ **Gutes Design:**
- Ausreichend Kontrast zwischen Text und Hintergrund
- Text-Farbe auf Hintergrund: mindestens 4.5:1 Verhältnis
- Konsistente Farb-Palette (2-3 Hauptfarben)
- Accent-Farbe hervorhebend aber nicht aggressiv

❌ **Vermeiden:**
- Gelber Text auf Weiß (zu wenig Kontrast)
- Zu viele unterschiedliche Farben (verwirrend)
- Sehr helle/intensive Farben als Hintergrund (Augen-belastung)
- Schwarzer Text auf Dunkelblau (Kontrast-Probleme)

### Theme testen & anfeinern

1. CSS-Datei speichern
2. Browser neu starten
3. Einstellungen → Theme → Dein Theme
4. Nicht zufrieden? CSS-Datei bearbeiten → Speichern → Neustarten

**Tipp**: Öffne die Datei in VS Code für Syntax-Highlighting und besseres Editing!

---

## 🛡️ Adblock-System

### Wie es funktioniert

VibeBrowser blockt unerwünschte Inhalte automatisch basierend auf **Filterlisten**:

**Blockierte Domains/URLs:**
- Google Ads & Analytics
- Facebook Pixel & Tracker
- Microsoft Advertising
- Amazon-Ads (ASIN)
- Criteo, DoubleClick, AdNXS (Adtech-Giants)

### Blocking-Regeln

Rule-Dateien:
```
C:\Users\<DeinName>\AppData\Roaming\VibeBrowser\
├── adblock-rules.txt       (Standard-Regeln)
└── adblock-custom.txt      (Deine Custom-Regeln)
```

### Eigene Regel hinzufügen

1. Öffne `adblock-custom.txt`
2. Füge eine Zeile ein:

```
||beispiel.com^              ! Blocke ganze Domain
||ads.*.beispiel.com^        ! Wildcard-Pattern
@@||google.com^              ! Whitelist (mit @@)
```

3. **Speichern** - wird sofort aktiv

Beispiele für Custom-Regeln:
```
! Blockiere YouTube-Ads Server
||youtube.com/get_video_info?^

! Blockiere Google Tracking
||google-analytics.com^

! Whitelist GitHub (nicht blockieren)
@@||github.com^

! Whitelist Google.com selbst
@@||google.com^
```

### Adblock deaktivieren (für spezifische Seiten)

Weiß-liste in `adblock-custom.txt`:
```
! Für diese Seite keine Ads blockieren:
@@||beispiel.com^
```

---

## 📊 Suchverlauf & Suggestions

### Verlauf ansehen

- **Tastenkombination**: `Ctrl+H`
- **Button**: 🕐 in der Toolbar
- **Suchfunktion**: Live-Suche nach URLs/Titeln

### Auto-Suggestions

Wenn du in der URL-Bar tippst, bekommst du Vorschläge aus:
- Besuchte URLs (History)
- Lesezeichen
- Populäre Seiten (Häufigkeit)

**Beispiel:**
```
Getippte Eingabe: "git"
↓
Vorschläge:
1. github.com
2. https://github.com/myproject
3. git-scm.com
```

---

## 📁 Datenspeicherung

**Alle Daten lokal, kein Cloud-Upload:**

```
C:\Users\<DeinName>\AppData\Roaming\VibeBrowser\
├── tabs.json                 # Zuletzt offene Tabs
├── history.json              # Verlauf (max 1000 Einträge)
├── bookmarks.json            # Deine Lesezeichen
├── settings.json             # Einstellungen
├── themes/                   # Deine Custom Themes
│   ├── nord.css
│   └── mein-theme.css
├── default-themes/           # Eingebaute Themes
│   ├── catppuccin-mocha.css
│   ├── catppuccin-latte.css
│   └── ...
└── adblock-*/                # Blocking-Regeln
    ├── adblock-rules.txt
    └── adblock-custom.txt
```

---

**Hinweis**: Das Auto-Update-System funktioniert nur mit signierten Releases. In der Entwicklung werden Update-Checks übersprungen.
