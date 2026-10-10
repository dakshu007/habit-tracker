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
}

export type AppIconId = 'sage' | 'ink' | 'midnight' | 'sand';

/** Android-only native helpers (see android/…/DeviceSignalsModule.kt). Null where unavailable. */
export const DeviceSignals = requireOptionalNativeModule<DeviceSignalsModule>('DeviceSignals');
