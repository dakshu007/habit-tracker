import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from './Txt';
import { PressableScale } from './Glass';
import { CheckIcon } from './icons';
import { useTheme } from '@/theme/ThemeContext';
import { MOTION_ORDER, MOTION_PRESETS, type MotionPreset } from '@/theme/motion';
import { useHabitStore } from '@/store/useHabitStore';
import { haptic } from '@/utils/haptics';

const ACCENT = '#4C8DF6';
const BALL = 34;

/**
 * Animation style chooser. Picking a style replays a demo with that style's
 * exact physics, so the user feels the difference before leaving the screen.
 */
export function MotionPicker() {
  const { theme, isDark } = useTheme();
  const preset = useHabitStore((s) => s.settings.motionPreset);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  const [trackW, setTrackW] = useState(0);
  const [side, setSide] = useState(0);

  const x = useSharedValue(0);
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);

  const play = (id: MotionPreset, to: number) => {
    const m = MOTION_PRESETS[id];
    const travel = Math.max(0, trackW - BALL - 8);
    if (id === 'off') {
      x.value = to * travel;
      return;
    }
    if (id === 'minimal') {
      fade.value = withSequence(withTiming(0.2, { duration: 120 }), withTiming(1, { duration: 160 }));
      x.value = withTiming(to * travel, { duration: 160 });
      return;
    }
    x.value = withSpring(to * travel, m.ui);
    if (m.pop) scale.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, m.release));
  };

  useEffect(() => {
    if (trackW) x.value = side * Math.max(0, trackW - BALL - 8);
    // Only snap into place on first layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackW]);

  const choose = (id: MotionPreset) => {
    haptic.tick();
    updateSettings({ motionPreset: id });
    const to = side ? 0 : 1;
    setSide(to);
    play(id, to);
  };

  const ballStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: scale.value }], opacity: fade.value }));

  return (
    <View style={{ gap: 14 }}>
      <PressableScale silent onPress={() => choose(preset)} accessibilityLabel="Replay animation preview">
        <View
          onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
          style={{ height: BALL + 8, borderRadius: (BALL + 8) / 2, backgroundColor: theme.inputBg, justifyContent: 'center', paddingHorizontal: 4 }}
        >
          <Txt variant="micro" color="tertiary" style={{ position: 'absolute', alignSelf: 'center' }}>
            Tap to preview
          </Txt>
          <Animated.View style={[{ width: BALL, height: BALL, borderRadius: BALL / 2, overflow: 'hidden' }, ballStyle]}>
            <LinearGradient colors={['#6CC3F7', '#8E7CF5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          </Animated.View>
        </View>
      </PressableScale>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {MOTION_ORDER.map((id) => {
          const p = MOTION_PRESETS[id];
          const on = id === preset;
          return (
            <PressableScale key={id} silent onPress={() => choose(id)} accessibilityLabel={`${p.label} animations`} style={{ width: '48.5%' }}>
              <View
                style={{
                  padding: 12,
                  borderRadius: 18,
                  minHeight: 70,
                  gap: 2,
                  backgroundColor: on ? (isDark ? 'rgba(76,141,246,0.22)' : 'rgba(76,141,246,0.1)') : theme.inputBg,
                  borderWidth: 1.5,
                  borderColor: on ? ACCENT : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt variant="h3" color={on ? ACCENT : 'primary'}>
                    {p.label}
                  </Txt>
                  {on && <CheckIcon size={16} color={ACCENT} strokeWidth={3} />}
                </View>
                <Txt variant="small" color="secondary" numberOfLines={2}>
                  {p.description}
                </Txt>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
