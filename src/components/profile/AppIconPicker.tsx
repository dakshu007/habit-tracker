import { useState } from 'react';
import { Alert, Image, Platform, ToastAndroid, View } from 'react-native';

import { DeviceSignals, type AppIconId } from '../../../modules/device-signals';
import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { CheckIcon } from '@/components/ui/icons';
import { useTheme } from '@/theme/ThemeContext';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';

const ICONS: { id: AppIconId; name: string; src: number }[] = [
  { id: 'sage', name: 'Sage', src: require('../../assets/app-icons/sage.png') },
  { id: 'ink', name: 'Ink', src: require('../../assets/app-icons/ink.png') },
  { id: 'midnight', name: 'Midnight', src: require('../../assets/app-icons/midnight.png') },
  { id: 'sand', name: 'Sand', src: require('../../assets/app-icons/sand.png') },
];

/** Choose the home-screen icon (Android launcher aliases, see plugins/with-alternate-icons). */
export function AppIconPicker() {
  const { theme } = useTheme();
  const [current, setCurrent] = useState<AppIconId>(() => {
    try {
      return DeviceSignals?.getAppIcon() ?? 'sage';
    } catch {
      return 'sage';
    }
  });

  if (Platform.OS !== 'android' || !DeviceSignals) return null;

  const apply = (id: AppIconId) => {
    try {
      if (!DeviceSignals?.setAppIcon(id)) return;
      setCurrent(id);
      haptic.success();
      ToastAndroid.show(t('App icon changed. Your home screen may take a few seconds to update.'), ToastAndroid.LONG);
    } catch {
      ToastAndroid.show(t('Couldn’t change the icon on this phone.'), ToastAndroid.SHORT);
    }
  };

  const choose = (id: AppIconId) => {
    if (id === current) return;
    haptic.tick();
    Alert.alert(
      t('Change app icon?'),
      t('Some home screens move or remove the old shortcut when the icon changes. The app always stays in your app drawer.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Change'), onPress: () => apply(id) },
      ],
    );
  };

  return (
    <View style={{ gap: 10 }}>
      <Txt variant="micro" color="secondary">
        {t('App icon')}
      </Txt>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {ICONS.map((ic) => {
          const on = ic.id === current;
          return (
            <PressableScale key={ic.id} silent onPress={() => choose(ic.id)} accessibilityLabel={t('{name} app icon', { name: t(ic.name) })} accessibilityState={{ selected: on }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ padding: 3, borderRadius: 22, borderWidth: 2.5, borderColor: on ? theme.textPrimary : 'transparent' }}>
                  <Image source={ic.src} style={{ width: 58, height: 58, borderRadius: 16 }} />
                  {on && (
                    <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.textPrimary, alignItems: 'center', justifyContent: 'center' }}>
                      <CheckIcon size={12} color={theme.screenBase} strokeWidth={3.4} />
                    </View>
                  )}
                </View>
                <Txt variant="small" color={on ? 'primary' : 'secondary'}>
                  {t(ic.name)}
                </Txt>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
