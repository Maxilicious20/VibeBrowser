# VibeBrowser Changelog

Alle wichtigen Änderungen des Projekts sind in dieser Datei dokumentiert.

## [1.2.1] - 2026-02-27

### 📋 What's Included in This Release

### 🐛 Bug Fixes

#### Critical Fixes
✅ Download-Badge aktualisiert jetzt korrekt bei abgeschlossenen Downloads
✅ "just now"/"gerade" Zeitformat folgt jetzt sauber der gewählten Sprache
✅ Update-Toast im Renderer nutzt jetzt Sprachumschaltung (EN/DE) statt hartcodiertem Deutsch

#### Important Fixes
✅ App-Info Fallback-Versionen auf 1.2.1 angehoben
✅ Statische Versionsanzeigen im Settings/Changelog-Modal auf 1.2.1 aktualisiert
✅ Default `lastSeenVersion` für Neuinstallationen auf 1.2.1 gesetzt

### ⚡ Performance Improvements

#### Update & Download Pipeline
- Update-Download-Progress-Events aus dem Main Process werden jetzt throttled gesendet
- Schutz gegen `webContents.send` auf zerstörte Fenster/WebContents hinzugefügt
- Download-Liste rendert nur noch, wenn das Download-Dropdown tatsächlich geöffnet ist
- Reduzierter Renderer-Overhead durch Entfernen unnötiger Download-Debug-Logs

### 📋 Technical Changes

#### Updated Files
- `src/renderer/app.ts`
- `src/main/auto-updater.ts`
- `src/main/storage.ts`
- `src/main/ipc/handlers.ts`
- `src/renderer/index.html`
- `package.json`

### 📦 Build Artifacts (v1.2.1)

#### Ready to Distribute
✅ `release/VibeBrowser 1.2.1.exe`
✅ `release/VibeBrowser-1.2.1.exe`
✅ `release/VibeBrowser-v1.2.1-win64.zip`

---

## [1.2.0] - 2026-02-27

### 📋 What's Included in This Release

### ✨ New Features

#### 📥 Download Manager (Complete)
- Vollständige Download-Verwaltung: Download, Pause, Fortsetzen, Abbrechen, Öffnen
- Download-Dropdown UI mit Progress-Indikatoren und Status-Aktionen
- Download-Historie innerhalb der Session verfügbar
- Download-Badge zeigt aktive Downloads direkt in der Toolbar
- Pause/Resume jederzeit über die UI steuerbar
- Auto-Open-Support für heruntergeladene Dateien
- Echtzeit-Progress pro Download

#### 🧠 Revolutionary Tabs System
- Settings/Bookmarks/History laufen als echte Tabs statt Sidebars
- Custom Tab-URLs für interne Seiten:
  - `vibebrowser://settings`
  - `vibebrowser://bookmarks`
  - `vibebrowser://history`
- Tab-Reuse: Interne Seiten werden in bestehendem Tab wiederverwendet (kein Duplizieren)
- Dynamische HTML-Generierung on-the-fly
- Toolbar-Buttons öffnen interne Seiten als echte Tabs
- `window.app` global verfügbar für HTML onclick-Handler

#### 💾 Session Management & Crash Recovery
- Auto-Save der Session im 30-Sekunden-Intervall
- Crash-Recovery mit automatischer Tab-Wiederherstellung
- Persistente Session-Daten in LocalStorage/AppData
- Unterstützung für mehrere unabhängige Sessions

#### 🌐 Localization & Update UX (Neu in 1.2.0 Final)
- Browser ist standardmäßig Englisch
- Sprache in Settings zwischen Englisch und Deutsch umschaltbar
- Sprachpräferenz wird persistent gespeichert
- Update-Checks laufen alle 5 Minuten
- Update-Dialog unterstützt „in 5 Minuten erinnern“
- Manueller „Check for updates now“-Flow in den Einstellungen

#### 🔔 Auto-Update Verhalten (für Nutzer auf v1.2.0)
- v1.2.0 prüft automatisch beim Start und danach alle 5 Minuten auf neue Versionen
- Wenn eine neuere Version (z. B. v1.2.1) verfügbar ist, erscheint ein „Update verfügbar“-Dialog
- Nutzer können direkt herunterladen, später erinnern oder Update verschieben
- Nach Download erscheint „Update bereit“ mit Neustart-Option

#### 🔎 Browser Productivity Features
- Trust Radar Score in der Toolbar (Heuristik auf URL/Host/Protokoll)
- Reopen Closed Tab via `Ctrl+Shift+T`
- Find in Page via `Ctrl+F` im aktiven Browser-Tab
- Custom Background Upload + persistente Speicherung
- Editor CSS Speicherung mit Live-Anwendung

### 🐛 Bugs Fixed

#### Critical Bugs
✅ Extreme UI-Lags durch unendliche CSS-Animationen entfernt (badgePulse/progressGlow)
✅ Download-Liste mit zu häufigen Updates entschärft (debounced Rendering)
✅ Mehrfach-Registrierung von Event-Listenern verhindert (Registration Flags)
✅ Fehlendes Styling wiederhergestellt (vibe.css Recovery)
✅ Wiederholtes `.bind(this)` in Hot Paths durch stabile Handler ersetzt
✅ Download-Manager IPC-Flows korrigiert (Renderer/Main wieder synchron)

#### Important Fixes
✅ Double-Registration-Prevention für Setup-Methoden vereinheitlicht
✅ Legacy-Code-Bereinigung (alte Sidebar-Pfade, veraltete JS-Hooks)
✅ Konsistentes Error-Handling in asynchronen Operationen
✅ Maximieren-Button-Handler in der Toolbar korrigiert
✅ Settings-Merge beim Speichern verbessert (keine unbeabsichtigten Feld-Resets)
✅ Fallback-Version im App-Info-IPC auf 1.2.0 korrigiert

### ⚡ Performance Improvements

#### Renderer Optimizations
- Debounced DOM-Updates reduzieren unnötige Repaints
- Delegated Event Handling statt per-Item Listenern
- Einmalige Registrierung von Download-Action-Handlern
- Striktere Listener-Lifecycle-Kontrolle gegen Memory Leaks
- Reduzierte UI-Stotterer bei Downloads und Settings-Navigation

### 📋 Technical Changes

#### Refactored Components
- `app.ts`: Download-Handling, Lokalisierung, Event-Listener-Härtung, UI-Performance
- `tab-manager.ts`: Custom Tab-Types und interne Seitenlogik
- `index.html`: Toolbar/Settings-Struktur für Tab- und Sprach-Flow angepasst
- `vibe.css`: Download-UI + Performance-orientierte Animation-Anpassungen
- `storage.ts`: persistentes `language`-Setting (`en`/`de`)

#### IPC Channels (Key)
- `downloads:get-all`
- `downloads:pause`
- `downloads:resume`
- `downloads:cancel`
- `downloads:open`
- `downloads:clear-completed`
- `session:save`
- `session:restore`
- `find:in-page`
- `find:stop`

### 📦 Build Artifacts (v1.2.0)

#### Ready to Distribute
✅ `release/VibeBrowser 1.2.0.exe`
✅ `release/VibeBrowser-1.2.0.exe`
✅ `release/VibeBrowser-v1.2.0-win64.zip`

#### Build Status
✅ Webpack Production Build erfolgreich
✅ TypeScript Compilation ohne Fehler
✅ Electron Builder Dist erfolgreich erzeugt

### ✅ Final Verification Checklist

- [x] Download Manager vollständig funktionsfähig (Pause/Resume/Cancel/Open)
- [x] Settings, Bookmarks und History als echte Tabs aktiv
- [x] Session Auto-Save + Recovery aktiv
- [x] Trust Radar aktiv und konfigurierbar
- [x] Englisch als Default-Sprache gesetzt
- [x] Deutsch-Umschaltung in Settings persistent
- [x] 5-Minuten Update-Checks und manueller Update-Check vorhanden
- [x] Kritische Lag-/Listener-Probleme behoben
- [x] Release-Artefakte für Windows erstellt

---

## [1.1.0] - 2026-02-26

### 🎨 Neue Features

#### Custom CSS Themes (Vencord-Stil)
- **Benutzerdefinierte Themes**: Erstelle eigene Themes mit CSS wie Discord/Vencord
- **4 Built-in Themes enthalten**:
  - Catppuccin Mocha (Dark, elegant)
  - Catppuccin Latte (Light, clean)
  - Dark Minimal (Stark schwarzer Hintergrund)
  - Light Clean (Modernes Weiß)
- **Theme Verwaltung**: Themes können in `AppData\Roaming\VibeBrowser\themes\` erstellt werden
- **Live Theme-Wechsel**: Themes werden sofort angewendet ohne Neustart
- **Theme-Vorschau** in den Einstellungen mit Live-Farben
- **Persistent Theme-Preference**: Gewähltes Theme wird gespeichert

#### Built-in Adblock System
- **URL-Blockierung**: Blockiert automatisch bekannte Ad Networks
- **15+ vorgeladene Blockierungsregeln**:
  - Google Ads & DoubleClick
  - Facebook Pixel & Tracker
  - Microsoft Ads
  - Amazon Ads
  - Criteo & Ads.com
  - Unbounce
  - Outbrain
  - Taboola
  - Chartbeat
  - Mixpanel & Analytics
  - Weitere Ad-Network Rules
- **Custom Blockierungsregeln**: Benutzer können eigene Regeln hinzufügen
- **Whitelist-Unterstützung**: Mit `@@` Prefix können Seiten auf die Whitelist
- **Regelmanagement**: Separate Dateien für Standard- und Custom-Regeln
- **Adblock-Statistiken**: Zeigt Anzahl aktiver Regeln und Whitelist-Einträge
- **Regel-Reload**: Änderungen können ohne Neustart neu geladen werden

#### Smart Search Suggestions
- **History-basierte Vorschläge**: Suggests aus besuchten URLs
- **Bookmark-Vorschläge**: Lesezeichen werden als Suggestions gezeigt
- **Search-Extraktion**: Erkennt Suchbegriffe von Google, Bing, DuckDuckGo, YouTube, Wikipedia
- **Relevanz-Sortierung**:
  - Exakte Übereinstimmungen zuerst
  - Dann: Startet mit Suchterm
  - Dann: Beinhaltet Suchterm
- **Popularitäts-Tracking**: Verfolgt häufig suchte Begriffe
- **Debounced Input**: Verhindert zu häufige Abfragen

#### Verbesserte Einstellungen UI
- **Tabbed Settings Panel**: 4 Tabs statt flacher Ansicht
  - **General**: Homepage & Suchmaschine
  - **Themes**: Theme-Auswahl & Verwaltung
  - **Adblock**: Blockierungsregeln & Statistiken
  - **Advanced**: Speicherinformationen & Version
- **Theme-Vorschau**: Live-Anzeige der Theme-Farben
- **Descriptive Texts**: Hilfreiche Beschreibungen für alle Einstellungen
- **Inline Theme-Änderung**: Themes können sofort getestet werden

#### Update-Benachrichtigungen
- **Erste Laden nach Update**: Zeigt Benachrichtigung für 10 Sekunden
- **Vollständiger Changelog**: Klickbarer Link zum vollständigen Changelog
- **Auto-Dismiss**: Verschwindet automatisch nach 10 Sekunden

### 🐛 Bug Fixes

#### Critical Bugs
- **[CRITICAL]** Theme CSS wird nicht beim Settings-Öffnen geladen
  - Fix: CSS wird jetzt beim Öffnen von Einstellungen sofort appliziert
- **[CRITICAL]** Multiple Event Listener Registrierung (Memory Leak)
  - Fix: Setup-Flags verhindern Doppel-Registrierung bei jedem Settings-Öffnen
- **[CRITICAL]** Null Reference Errors bei fehlenden DOM-Elementen
  - Fix: Umfassende null-safety checks in allen Funktionen

#### Important Bugs
- Theme-Namen Inkonsistenz (mocha → catppuccin-mocha)
- Adblock Stats HTML-Struktur ungültig
- Typo in Variable: `featurHandlersSetup` → `featureHandlersSetup`
- Missing null checks in:
  - `loadBookmarks()` - Könnte crashes verursachen
  - `displayHistory()` - Könnte crashes verursachen
  - `saveSettings()` - Keine Validation vor Zugriff
- Theme CSS könnte null sein bei Fehler beim Laden
- **[NEW]** Hardcodierte GitHub URL mit "yourusername"
  - Fix: Dynamisch vom Main Process gelesen durch neuen `app:get-app-info` IPC Channel
  - GitHub Repo jetzt: `Maxilicious20/VibeBrowser`
- **[NEW]** Hardcodierte App-Version "1.1.0" in Renderer
  - Fix: Version wird dynamisch aus package.json gelesen im Main Process
  - Ermöglicht automatische Versionsverwaltung für Future-Updates

### 🎯 Verbesserungen

#### Stabilität
- Umfassende null-checks für alle DOM-Operationen
- Error handling für alle async Operationen
- Graceful fallbacks wenn UI-Elemente fehlen

#### Performance
- Debounced Search Suggestions (300ms)
- Lazy Setup von Event Listenern (einmalig statt mehrfach)
- Efficient DOM Updates (innerHTML nur wenn nötig)

#### User Experience
- Bessere Fehler-Meldungen in Alerts
- Visuelle Settings-Struktur durch Tabs
- Theme-Verwaltung ohne Datei-Bearbeitung
- Einfache Custom Adblock Rules
- Sofortige Theme-Vorschau

#### Code Quality
- Typos removed
- Konsistente Fehlerbehandlung
- Bessere Code-Struktur durch Setup-Flags
- Validierung vor kritischen Operationen

### 📋 Weitere Änderungen

#### Documentation
- **README.md**: 500+ Zeilen mit vollständiger Theme-Dokumentation
- **Theme Examples**: 4 Copy-Paste-fertige Beispiel-Themes
- **CHANGELOG.md**: Komplette Release Notes mit Kategorien
- **Adblock Guide**: Erklärung von Blockierungsregeln
- **Setup Instructions**: Schritt-für-Schritt Anleitung für Custom Themes

#### Infrastructure
- GitHub Releases Integration
- Auto-Update System (electron-updater)
- Portable EXE für einfache Verteilung
- Version Control in AppData

### ✨ Technische Details

**Built-in Themes Größe**: ~5 KB
**Adblock Rules**: ~8 KB (Default) + Unlimited (Custom)
**Search Suggestions**: Real-time aus lokalen Daten
**Theme CSS**: Beliebig groß, Support für beliebige CSS

---

## [1.0.0] - 2026-01-01

### 🎉 Initial Release

#### Core Features
- ✅ Multi-Tab Browser mit BrowserView API (echte Prozess-Isolation)
- ✅ Persistente Tabs (Speicherung & Wiederherstellung)
- ✅ Browser History mit Suche
- ✅ Bookmarks-System
- ✅ Zoom Controls (Ctrl++, Ctrl+-, Ctrl+0)
- ✅ Auto-Update System (GitHub Releases)
- ✅ 20+ Keyboard Shortcuts
- ✅ Custom Titlebar mit Window Controls
- ✅ URL-Bar mit Enter zum Navigieren
- ✅ Homepage Einstellung
- ✅ Suchmaschinen-Auswahl (Google/Bing/DuckDuckGo)
- ✅ Responsive UI mit Sidebar/Panel System

#### Technical Stack
- Electron 27.0.0
- TypeScript 5.3.3
- Webpack 5.89.0
- electron-updater 6.1.4
- electron-builder 24.6.4

#### Known Limitations
- Keine Custom Themes
- Keine Built-in Adblock
- Keine Search Suggestions
- Kein Private Mode
- Keine Browser Extensions

---

## Geplante Features (Backlog)

### 🔜 Nächste Priorität (v1.2.0)
- [ ] Context Menus (Rechts-Klick)
- [ ] Private Browsing Mode
- [ ] Download Manager
- [ ] Synchronisierte History zwischen Geräten

### 🎯 Mittelfristig (v1.3.0 - v2.0.0)
- [ ] Browser Extensions Support
- [ ] Password Manager Integration
- [ ] Session Restore
- [ ] Reader Mode (PDF-like Layout)
- [ ] Screenshot Tool
- [ ] Tab Groups
- [ ] Custom Search Engines
- [ ] Start Page mit Quick Links
- [ ] Dark Mode Toggle
- [ ] Plugins Architecture

### 🚀 Langfristig
- [ ] Sync with Cloud Services
- [ ] Developer Tools
- [ ] Network Inspector
- [ ] Performance Profiler
- [ ] Multi-User Support
- [ ] Cross-Platform Sync (iOS/Android)

---

## Contributing

Beiträge sind willkommen! Bitte:
1. Fork das Projekt
2. Feature Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

---

## Lizenz

Dieses Projekt ist unter der MIT Lizenz lizenziert.

---

**VibeBrowser** - Modernität trifft Anpassbarkeit

### 🔧 Technische Details

- Electron 27.0.0
- TypeScript 5.3.3
- Webpack 5 für Multi-Target-Bundling
- electron-builder 24.6.4 & electron-updater 6.1.4
- IPC-basierte Main↔Renderer Kommunikation
- Sichere contextBridge mit contextIsolation

### 📝 Dokumentation

- ✅ Umfassende README.md mit Installationsanleitung
- ✅ BUILD.md mit Schritt-für-Schritt EXE-Erstellung
- ✅ Dieses Changelog!

### 🎯 Known Limitations

- Kein eingebauter Adblock yet (v1.1 geplant)
- Keine Custom CSS Themes yet (v1.1 geplant)
- Keine Suchvorschläge basierend auf History (v1.1 geplant)
- Keine Context-Menus (Rechtsklick)
- Keine Private Browsing Mode yet

---

## [1.1.0] - GEPLANT ⏳

### ✨ Neu hinzugefügt

#### 🎨 Custom CSS Themes (wie Discord/Vencord)
- Custom CSS Themes speichern in `AppData\Roaming\VibeBrowser\themes\`
- 4 eingebaute Themes: Catppuccin Mocha/Latte, Dark Minimal, Light Clean
- Live-Preview beim Erstellen von Themes
- Theme-Manager mit Reload-Funktion

#### 🛡️ Built-in Adblock
- Standard-Blockierungslisten für populäre Ad-Networks
- Support für Custom-Blocking-Regeln
- Whitelist-Support (mit `@@` Prefix)
- Blocking-Statistiken und Reload-Funktion
- `adblock-rules.txt` & `adblock-custom.txt` für Konfiguration

#### 🔍 Smart Search Suggestions
- Suchvorschläge aus History und Bookmarks
- Auto-Vervollständigung in URL-Bar
- Beliebte Suchbegriffe-Statistik (häufig gesucht)
- Search-Term-Extraktion aus Google/Bing/DuckDuckGo/YouTube

### 🎯 Verbesserungen

- Bessere IPC-Error-Handling
- Performance-Optimierungen beim History-Loading
- Verbesserte Adblock-Rule-Matching-Performance
- Zusätzliche Theme-Variablen für erweiterte Anpassbarkeit

### 📝 Dokumentation

- Erweiterte README mit Custom CSS Theme-Anleitung
- Theme-Beispiele (Nord, Grape Purple, Fire Orange, Soft Light)
- Adblock-Konfiguration und Custom-Rules Anleitung
- Search-Suggestions Dokumentation

---

## Geplante Features (Backlog)

- [ ] Context-Menus (Rechtsklick auf Tabs/Links/Bilder)
- [ ] Download-Manager
- [ ] Find in Page (Seitensuche mit Ctrl+F)
- [ ] Tab-Gruppen / Tab-Collections
- [ ] Session-Restore (mehrere Browsing-Sessions)
- [ ] Private Browsing Mode
- [ ] Extensions/Plugins-System
- [ ] Reader-Mode (für Artikel)
- [ ] Screenshot-Tool
- [ ] Passwort-Manager Integration
- [ ] Touch-Gestures (für Tablets)
- [ ] Dark/Light Mode Auto-Switching (Systemeinstellungen)
- [ ] Vertical Tab-Bar (Alternative zu Top-Tabs)
- [ ] Tab-Search / Tab-Switcher (Cmd+Shift+A)
- [ ] Quick-Settings-Access
- [ ] Export/Import Bookmarks & Settings

---

## Update-Anleitung

### Automatisch
- VibeBrowser prüft automatisch alle 4 Stunden auf Updates
- Benutzer wird benachrichtigt, wenn Update verfügbar ist
- Ein-Klick-Installation nach Download

### Manuell
1. Besuche [GitHub Releases](https://github.com/Maxilicious20/VibeBrowser/releases)
2. Lade neueste Version herunter
3. Extrahiere und starte neue Version

---

## Versions-Historie

| Version | Datum | Highlights |
|---------|-------|-----------|
| 1.0.0 | 2024-01-01 | Initial Release - Multi-Tab Browser mit Persistenz |
| 1.1.0 | GEPLANT | Custom Themes + Adblock + Search-Suggestions |
| 2.0.0 | GEPLANT | Extensions-System, Private Mode, erweiterte Features |

---

## Contributing

Möchte Features hinzufügen oder Bugs fixen?

1. Fork das Repository
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Changes commiten (`git commit -m 'Add AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

Siehe [Contributing Guidelines](CONTRIBUTING.md) für Details.

---

**Last Updated**: January 1, 2024
