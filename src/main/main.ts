/**
 * Haupt-Einstiegspunkt des Electron-Applikation (Main Process)
 */

import { app } from 'electron';
import { AppWindow } from './window';

let appWindow: AppWindow;

app.disableHardwareAcceleration();

app.on('ready', () => {
  appWindow = new AppWindow();
  appWindow.create();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!appWindow.getWindow()) {
    appWindow = new AppWindow();
    appWindow.create();
  }
});
