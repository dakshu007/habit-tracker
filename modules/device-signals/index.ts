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
}

/** Android-only native helpers (see android/…/DeviceSignalsModule.kt). Null where unavailable. */
export const DeviceSignals = requireOptionalNativeModule<DeviceSignalsModule>('DeviceSignals');
