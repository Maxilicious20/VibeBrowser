import { app, dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * VibeBrowser Theme Manager
 * Ermöglicht Custom CSS Themes wie Discord/Vencord
 * Themes werden gespeichert in AppData\VibeBrowser\themes\
 */
export class ThemeManager {
  private themesDir: string;
  private defaultThemesDir: string;
  private currentTheme: string = 'default';
  private customCssPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.themesDir = path.join(userDataPath, 'VibeBrowser', 'themes');
    this.defaultThemesDir = path.join(userDataPath, 'VibeBrowser', 'default-themes');
    this.customCssPath = path.join(app.getAppPath(), 'custom.css');
    
    this.initializeThemes();
    this.ensureCustomCssFile();
  }

  /**
   * Initialize theme directories and copy default themes
   */
  private initializeThemes(): void {
    // Create themes directory
    if (!fs.existsSync(this.themesDir)) {
      fs.mkdirSync(this.themesDir, { recursive: true });
    }

    // Create default themes directory
    if (!fs.existsSync(this.defaultThemesDir)) {
      fs.mkdirSync(this.defaultThemesDir, { recursive: true });
      this.createDefaultThemes();
    }
  }

  /**
   * Ensure custom.css exists in app folder
   */
  private ensureCustomCssFile(): void {
    if (fs.existsSync(this.customCssPath)) return;

    const exampleCss = `/* VibeBrowser Custom CSS */
/* Beispiel: Buttons runder machen */
.toolbar-btn, .nav-btn, .window-control {
  border-radius: 10px;
}

/* Beispiel: URL-Bar hervorheben */
.url-bar {
  border: 1px solid #89b4fa;
  box-shadow: 0 0 10px rgba(137, 180, 250, 0.2);
}
`;

    try {
      fs.writeFileSync(this.customCssPath, exampleCss, 'utf-8');
    } catch (error) {
      console.error('Failed to create custom.css:', error);
    }
  }

  /**
   * Get custom.css path
   */
  public getCustomCssPath(): string {
    return this.customCssPath;
  }

  /**
   * Load custom.css content
   */
  public loadCustomCss(): string {
    try {
      if (!fs.existsSync(this.customCssPath)) {
        this.ensureCustomCssFile();
      }
      return fs.readFileSync(this.customCssPath, 'utf-8');
    } catch (error) {
      console.error('Failed to load custom.css:', error);
      return '';
    }
  }

  /**
   * Open custom.css in default editor
   */
  public openCustomCss(): void {
    if (!fs.existsSync(this.customCssPath)) {
      this.ensureCustomCssFile();
    }
    shell.openPath(this.customCssPath);
  }

  /**
   * Create built-in themes
   */
  private createDefaultThemes(): void {
    const themes = {
      'catppuccin-mocha.css': this.getCatppuccinMocha(),
      'catppuccin-latte.css': this.getCatppuccinLatte(),
      'dark-minimal.css': this.getDarkMinimal(),
      'light-clean.css': this.getLightClean(),
    };

    for (const [filename, content] of Object.entries(themes)) {
      const filePath = path.join(this.defaultThemesDir, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
      }
    }
  }

  /**
   * List all available themes (custom + default)
   */
  public getAvailableThemes(): { name: string; path: string; isDefault: boolean }[] {
    const themes: { name: string; path: string; isDefault: boolean }[] = [];

    // Default themes
    if (fs.existsSync(this.defaultThemesDir)) {
      const defaultFiles = fs.readdirSync(this.defaultThemesDir);
      for (const file of defaultFiles) {
        if (file.endsWith('.css')) {
          themes.push({
            name: file.replace('.css', ''),
            path: path.join(this.defaultThemesDir, file),
            isDefault: true,
          });
        }
      }
    }

    // Custom themes
    if (fs.existsSync(this.themesDir)) {
      const customFiles = fs.readdirSync(this.themesDir);
      for (const file of customFiles) {
        if (file.endsWith('.css')) {
          themes.push({
            name: file.replace('.css', ''),
            path: path.join(this.themesDir, file),
            isDefault: false,
          });
        }
      }
    }

    return themes;
  }

  /**
   * Load theme CSS content
   */
  public loadTheme(themeName: string): string | null {
    const themes = this.getAvailableThemes();
    const theme = themes.find((t) => t.name === themeName);

    if (!theme) {
      return null;
    }

    try {
      return fs.readFileSync(theme.path, 'utf-8');
    } catch (error) {
      console.error(`Failed to load theme ${themeName}:`, error);
      return null;
    }
  }

  /**
   * Get path to themes directory
   */
  public getThemesDirectory(): string {
    return this.themesDir;
  }

  /**
   * Open themes folder in explorer
   */
  public openThemesFolder(): void {
    require('child_process').exec(`explorer "${this.themesDir}"`);
  }

  // ============ DEFAULT THEMES ============

  private getCatppuccinMocha(): string {
    return `/* Catppuccin Mocha Theme */
:root {
  --bg-primary: #1e1e2e;
  --bg-secondary: #313244;
  --bg-tertiary: #45475a;
  --text-primary: #cdd6f4;
  --text-secondary: #bac2de;
  --accent: #89b4fa;
  --accent-2: #f38ba8;
  --accent-3: #a6e3a1;
  --success: #a6e3a1;
  --error: #f38ba8;
  --warning: #f9e2af;
  --info: #89b4fa;
}`;
  }

  private getCatppuccinLatte(): string {
    return `/* Catppuccin Latte Theme */
:root {
  --bg-primary: #eff1f5;
  --bg-secondary: #e6e9f0;
  --bg-tertiary: #dce0e8;
  --text-primary: #4c4f69;
  --text-secondary: #5c5f77;
  --accent: #1e66f5;
  --accent-2: #d20f39;
  --accent-3: #40a02b;
  --success: #40a02b;
  --error: #d20f39;
  --warning: #df8e1d;
  --info: #1e66f5;
}`;
  }

  private getDarkMinimal(): string {
    return `/* Dark Minimal Theme */
:root {
  --bg-primary: #0a0e27;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --text-primary: #eaeaea;
  --text-secondary: #b0b0b0;
  --accent: #00d4ff;
  --accent-2: #ff006e;
  --accent-3: #00ff00;
  --success: #00ff00;
  --error: #ff006e;
  --warning: #ffbe0b;
  --info: #00d4ff;
}`;
  }

  private getLightClean(): string {
    return `/* Light Clean Theme */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #eeeeee;
  --text-primary: #212121;
  --text-secondary: #666666;
  --accent: #2196f3;
  --accent-2: #f44336;
  --accent-3: #4caf50;
  --success: #4caf50;
  --error: #f44336;
  --warning: #ff9800;
  --info: #2196f3;
}`;
  }
}
