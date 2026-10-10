import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { isUnlocked } from '@/store/useLicense';
import type { RootNav } from './types';

/** For screens whose whole job is logging: after the free week, swap them for the paywall. */
export function useRequireUnlock() {
  const navigation = useNavigation<RootNav>();
  useEffect(() => {
    if (!isUnlocked()) navigation.replace('Paywall');
  }, [navigation]);
}
