import { requireOptionalNativeModule } from 'expo';

export interface ScreenEvent {
  /** Epoch ms. */
  time: number;
  /** true = screen turned on, false = turned off. */
  on: boolean;
}

interface DeviceSignalsModule {
  hasUsageAccess(): boolean;
  openUsageAccessSettings(): boolean;
  getScreenEvents(from: number, to: number): Promise<ScreenEvent[]>;
  canRecognizeSpeech(): boolean;
  recognizeSpeech(prompt: string, language: string | null): Promise<string[]>;
  getAppIcon(): AppIconId;
  setAppIcon(id: AppIconId): boolean;
  canSetAlarm(): boolean;
  /** days: 0 = Sunday … 6 = Saturday; empty = one-time. */
  setAlarm(hour: number, minute: number, message: string, days: number[], skipUi: boolean): boolean;
  showAlarms(): boolean;
  getDeviceId(): string | null;
  /** Referrer string of the Play Store link this install came from, '' if none. */
  getInstallReferrer(): Promise<string>;
  /** Access token for the app's hidden Google Drive folder, or null if the user cancelled (or, when not interactive, if they'd have to choose or consent). */
  authorizeDrive(email: string | null, interactive: boolean): Promise<string | null>;
  revokeDrive(email: string): Promise<boolean>;
}

export type AppIconId = 'sage' | 'ink' | 'midnight' | 'sand';

/** Android-only native helpers (see android/…/DeviceSignalsModule.kt). Null where unavailable. */
export const DeviceSignals = requireOptionalNativeModule<DeviceSignalsModule>('DeviceSignals');
