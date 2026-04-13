import { BrowserWindow, globalShortcut, ipcMain, systemPreferences, screen } from 'electron';
import path from 'path';
import { transcriptionsApi } from '../api/transcriptions';
import clipboardService from './clipboard';
import { logger } from '../utils/logger';
import { isMac } from '../utils/platform';

class VoiceService {
  private overlayWindow: BrowserWindow | null = null;
  private isRecording: boolean = false;
  private currentAccelerator: string = '';
  private isRegistered: boolean = false;

  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    ipcMain.on('voice:ready', () => {
      logger.info('Voice overlay ready, recording started');
    });

    ipcMain.on('voice:audioData', async (_, data: number[] | null) => {
      this.isRecording = false;

      if (!data || data.length === 0) {
        logger.warn('No audio data received');
        this.closeOverlay();
        return;
      }

      try {
        const audioBuffer = Buffer.from(data);
        logger.info('Audio received:', audioBuffer.length, 'bytes. Transcribing...');

        const result = await transcriptionsApi.transcribeAndCorrect(audioBuffer);
        logger.info('Transcription response:', JSON.stringify(result));

        const raw = result as any;
        const textToPaste: string =
          raw.correction?.correctedText
          || raw.transcription?.text
          || '';

        if (textToPaste.trim().length === 0) {
          logger.warn('Empty transcription result');
          this.closeOverlay();
          return;
        }

        // Signal done to overlay before pasting
        if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
          this.overlayWindow.webContents.send('voice:done');
        }

        // Wait for the done animation, then close and paste
        setTimeout(async () => {
          this.closeOverlay();
          await clipboardService.replaceSelectedText(textToPaste);
        }, 600);
      } catch (error) {
        logger.error('Voice transcription error:', error instanceof Error ? error.message : error);
        this.closeOverlay();
      }
    });

    ipcMain.on('voice:error', (_, message: string) => {
      logger.error('Voice recording error:', message);
      this.isRecording = false;
      this.closeOverlay();
    });
  }

  private toAccelerator(shortcut: string): string {
    const parts = shortcut.split('+').map(k => k.trim());
    const mapped = parts.map(part => {
      switch (part.toUpperCase()) {
        case 'CTRL': case 'CONTROL': return 'Ctrl';
        case 'CMD': case 'COMMAND': case 'META': return 'Command';
        case 'ALT': case 'OPTION': return 'Alt';
        case 'SHIFT': return 'Shift';
        default: return part;
      }
    });
    return mapped.join('+');
  }

  register(shortcut: string): boolean {
    this.unregister();

    const accelerator = this.toAccelerator(shortcut);
    this.currentAccelerator = accelerator;

    try {
      const success = globalShortcut.register(accelerator, () => {
        this.toggle();
      });

      if (!success) {
        logger.error('Failed to register voice shortcut (may be in use):', accelerator);
        return false;
      }

      logger.info('Voice shortcut registered:', accelerator);
      this.isRegistered = true;
      return true;
    } catch (error) {
      logger.error('Error registering voice shortcut:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  unregister(): void {
    if (this.isRegistered && this.currentAccelerator) {
      try {
        globalShortcut.unregister(this.currentAccelerator);
      } catch (error) {
        logger.warn('Error unregistering voice shortcut:', error);
      }
      this.isRegistered = false;
    }
  }

  updateShortcut(shortcut: string): boolean {
    return this.register(shortcut);
  }

  private async toggle(): Promise<void> {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording(): Promise<void> {
    // Check microphone permission on macOS
    if (isMac()) {
      const micStatus = systemPreferences.getMediaAccessStatus('microphone');
      if (micStatus !== 'granted') {
        const granted = await systemPreferences.askForMediaAccess('microphone');
        if (!granted) {
          logger.error('Microphone permission denied');
          return;
        }
      }
    }

    this.isRecording = true;
    this.createOverlay();
  }

  private stopRecording(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.webContents.send('voice:stop');
    }
  }

  private createOverlay(): void {
    this.closeOverlay();

    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const { width: screenWidth, y: screenY } = display.workArea;
    const overlayWidth = 200;
    const overlayHeight = 44;

    this.overlayWindow = new BrowserWindow({
      width: overlayWidth,
      height: overlayHeight,
      x: Math.round(display.workArea.x + (screenWidth - overlayWidth) / 2),
      y: screenY + 12,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      show: false,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // MediaRecorder requires non-sandboxed for mic access
        preload: path.join(__dirname, '../preload', 'preload.js'),
      },
    });

    this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    this.overlayWindow.loadFile(path.join(__dirname, '../windows', 'voice-overlay.html'));

    this.overlayWindow.once('ready-to-show', () => {
      this.overlayWindow?.showInactive();
    });

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
      this.isRecording = false;
    });
  }

  private closeOverlay(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
    }
    this.overlayWindow = null;
  }

  destroy(): void {
    this.unregister();
    this.closeOverlay();
  }
}

export const voiceService = new VoiceService();
export default voiceService;
