export type TaskStatus = 'inProgress' | 'done';

/** Goal unit — varies per activity. */
export type TaskUnit = 'min' | 'km' | 'laps' | 'floors';

export interface Task {
  id: string;
  title: string;
  subtitle: string;

  goalValue: number;
  unit: TaskUnit;
  /** Celebratory copy shown on the slide control once complete. */
  doneLabel: string;

  /** Saturated brand color — drives Goal badge + accent elements. */
  accentColor: string;
  /** Top color of the screen background gradient when this task is active. */
  bgGradientTop: string;
  /** Card surface tint (the rounded card behind the illustration). */
  cardTint: string;

  currentValue: number;
  status: TaskStatus;
  /** ISO timestamp of the last progress update. */
  lastUpdated: string;

  /** Daily tasks reset each new day; weekly tasks persist across the week. */
  isDaily: boolean;
}
