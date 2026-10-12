import { useEffect, type ReactNode } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useTheme } from '@/theme/ThemeContext';
import { useBlurTarget } from './Glass';
import { useMotion } from '@/theme/motion';
import { t } from '@/i18n';

type Variant = 'sheet' | 'dialog';

interface OverlayState {
  node: ReactNode | null;
  variant: Variant;
  key: number;
  open: (node: ReactNode, variant?: Variant) => void;
  close: () => void;
}

/** Imperative overlay API: `overlay.open(<MySheet />)`, `overlay.close()`. */
export const useOverlay = create<OverlayState>((set) => ({
  node: null,
  variant: 'sheet',
  key: 0,
  open: (node, variant = 'sheet') => set((s) => ({ node, variant, key: s.key + 1 })),
  close: () => set({ node: null }),
}));

export const overlay = {
  open: (node: ReactNode, variant?: Variant) => useOverlay.getState().open(node, variant),
  close: () => useOverlay.getState().close(),
};

/**
 * Renders the active sheet/dialog above the app with a live-blurred backdrop.
 * Lives outside the BlurTargetView so it can sample (and blur) the content.
 */
export function OverlayHost() {
  const { node, variant, key, close } = useOverlay();
  const { theme, isDark } = useTheme();
  const target = useBlurTarget();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const anim = m.enter !== 'spring';

  useEffect(() => {
    if (!node) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [node, close]);

  if (!node) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }} pointerEvents="box-none">
      <Animated.View entering={m.enter === 'none' ? undefined : FadeIn.duration(220 * m.speed)} exiting={m.enter === 'none' ? undefined : FadeOut.duration(180 * m.speed)} style={abs}>
        {target ? (
          <BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" intensity={28} tint={isDark ? 'dark' : 'light'} style={abs} />
        ) : null}
        <Pressable accessibilityLabel={t('Close')} onPress={close} style={[abs, { backgroundColor: theme.overlay }]} />
      </Animated.View>

      {variant === 'sheet' ? (
        <Animated.View
          key={key}
          entering={m.enter === 'none' ? undefined : anim ? FadeIn.duration(180) : SlideInDown.springify().damping(m.enterSpring.damping * 1.2).stiffness(m.enterSpring.stiffness * 1.4).mass(m.enterSpring.mass)}
          exiting={m.enter === 'none' ? undefined : anim ? FadeOut.duration(150) : SlideOutDown.duration(200)}
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            bottom: Math.max(insets.bottom, 8),
            maxHeight: '86%',
            borderRadius: 34,
            backgroundColor: theme.cardElevated,
            borderWidth: 1,
            borderColor: theme.glassRim,
            boxShadow: '0px -6px 40px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.hairline }} />
          </View>
          {node}
        </Animated.View>
      ) : (
        <View style={{ position: 'absolute', left: 20, right: 20, top: insets.top + 90 }} pointerEvents="box-none">
          <Animated.View
            key={key}
            entering={m.enter === 'none' ? undefined : anim ? FadeIn.duration(180) : ZoomIn.springify().damping(m.ui.damping).stiffness(m.ui.stiffness).mass(m.ui.mass)}
            exiting={m.enter === 'none' ? undefined : anim ? FadeOut.duration(150) : ZoomOut.duration(160)}
            style={{
              borderRadius: 30,
              backgroundColor: theme.cardElevated,
              borderWidth: 1,
              borderColor: theme.glassRim,
              boxShadow: '0px 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {node}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const abs = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
