import { memo, useEffect } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Glyph } from '@/components/ui/glyphs';
import { getArt } from '@/data/art';
import { hexToRgba } from '@/theme/color';
import type { HabitColors } from '@/data/types';

interface HabitArtProps {
  artId: string;
  colors: HabitColors;
  /** Compact = thumbnails/pickers: no animation, glyph centred. */
  compact?: boolean;
}

/**
 * Habit artwork: the Figma illustration when one exists (fit to width, top
 * anchored so nothing crops), otherwise a generated aura cover in the habit's
 * colors. Fills its parent.
 */
export const HabitArt = memo(function HabitArt({ artId, colors, compact }: HabitArtProps) {
  const art = getArt(artId);

  if (art.kind === 'image') {
    const meta = Image.resolveAssetSource(art.source);
    const aspect = meta?.width && meta?.height ? meta.width / meta.height : 1;
    return (
      <View style={{ flex: 1, backgroundColor: colors.cardTint, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: aspect }}>
          <Image source={art.source} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </View>
      </View>
    );
  }

  return <AuraCover glyph={art.glyph} colors={colors} compact={compact} />;
});

function AuraCover({ glyph, colors, compact }: { glyph: Parameters<typeof Glyph>[0]['name']; colors: HabitColors; compact?: boolean }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    if (compact) return;
    bob.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [bob, compact]);
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -6 + bob.value * 12 }] }));

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <LinearGradient
        colors={[colors.bgTop, colors.cardTint]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Svg width="100%" height="100%" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="tint" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="82" cy="18" r="36" fill="url(#glow)" />
        <Circle cx="12" cy="58" r="34" fill="url(#tint)" />
        <Circle cx="70" cy="70" r="22" fill="url(#glow)" opacity={0.5} />
        <Path d="M0 74 C 18 64, 38 67, 54 72 S 84 80, 100 69 V140 H0Z" fill="#FFFFFF" opacity={0.28} />
        <Path d="M0 86 C 24 77, 48 88, 68 83 S 92 76, 100 80 V140 H0Z" fill="#FFFFFF" opacity={0.45} />
        {[
          [18, 18, 1.6],
          [30, 8, 1],
          [88, 48, 1.3],
          [60, 14, 0.9],
          [10, 34, 1],
        ].map(([x, y, s], i) => (
          <Path
            key={i}
            d={`M${x} ${y - 2.4 * s} L${x + 0.7 * s} ${y - 0.7 * s} L${x + 2.4 * s} ${y} L${x + 0.7 * s} ${y + 0.7 * s} L${x} ${y + 2.4 * s} L${x - 0.7 * s} ${y + 0.7 * s} L${x - 2.4 * s} ${y} L${x - 0.7 * s} ${y - 0.7 * s}Z`}
            fill="#FFFFFF"
            opacity={0.85}
          />
        ))}
      </Svg>

      {/* Frosted medallion with the glyph */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: compact ? 0 : '12%',
          bottom: compact ? 0 : undefined,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View style={compact ? undefined : bobStyle}>
          <View
            style={{
              width: compact ? 40 : 132,
              height: compact ? 40 : 132,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.42)',
              borderWidth: compact ? 1 : 1.5,
              borderColor: 'rgba(255,255,255,0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: compact ? undefined : `0px 14px 28px ${hexToRgba(colors.accent, 0.3)}`,
            }}
          >
            <Glyph name={glyph} size={compact ? 22 : 64} color={colors.accent} strokeWidth={compact ? 2 : 1.5} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
