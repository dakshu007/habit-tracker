import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Shares the carousel's live position with the screen background so the tint
 * can morph in real time as cards are dragged — instead of swapping color only
 * after the swipe commits.
 */
export interface CarouselSync {
  /** Continuous carousel position in card units (unbounded). */
  pos: SharedValue<number>;
}

export const CarouselContext = createContext<CarouselSync | null>(null);

export function useCarouselSync(): CarouselSync | null {
  return useContext(CarouselContext);
}
