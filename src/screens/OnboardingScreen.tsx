import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { GradientBackground } from '@/components/ui/GradientBackground';
import { Txt } from '@/components/ui/Txt';
import { Field } from '@/components/ui/Field';
import { Button, GlassSurface, PressableScale } from '@/components/ui/Glass';
import { CheckIcon } from '@/components/ui/icons';
import { HabitArt } from '@/components/art/HabitArt';
import { useHabitStore } from '@/store/useHabitStore';
import { getTheme } from '@/data/themes';
import { DEFAULT_TEMPLATE_KEYS, habitFromTemplate, templates } from '@/data/templates';
import { ensurePermission } from '@/services/notifications';
import { spacing } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';
import { qty } from '@/utils/format';
import { useMotion } from '@/theme/motion';
import { BellRing } from '@/components/ui/lucide';
import { t } from '@/i18n';
import { scheduleLabel } from '@/logic/habits';

const STEP_COLORS = [getTheme('sky').bgTop, getTheme('lavender').bgTop, getTheme('mint').bgTop, getTheme('sunset').bgTop];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const finish = useHabitStore((s) => s.finishOnboarding);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>(DEFAULT_TEMPLATE_KEYS);
  const m = useMotion();

  const pos = useSharedValue(0);
  useEffect(() => {
    pos.value = withSpring(step, { damping: 20, stiffness: 90 });
  }, [step, pos]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep((s) => s - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const next = () => {
    haptic.light();
    setStep((s) => s + 1);
  };

  const complete = async (withReminders: boolean) => {
    if (withReminders) {
      const ok = await ensurePermission();
      updateSettings({ nudge: { enabled: ok, hour: 20, minute: 30 } });
    } else {
      updateSettings({ nudge: { enabled: false, hour: 20, minute: 30 } });
    }
    haptic.success();
    const chosen = templates.filter((t) => picked.includes(t.key)).map(habitFromTemplate);
    finish(name, chosen);
  };

  return (
    <GradientBackground colors={STEP_COLORS} pos={pos}>
      {/* KeyboardAvoidingView owns paddingBottom, so the safe-area padding lives on an inner view. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i <= step ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }} />
          ))}
        </View>

        <Animated.View key={step} entering={m.enter === 'none' ? undefined : m.enter === 'fade' ? FadeIn.duration(200) : FadeInRight.springify().damping(m.enterSpring.damping).stiffness(m.enterSpring.stiffness)} exiting={m.enter === 'none' ? undefined : FadeOutLeft.duration(180 * m.speed)} style={{ flex: 1 }}>
          {step === 0 && <Welcome onNext={next} />}
          {step === 1 && (
            <View style={{ flex: 1, paddingHorizontal: spacing.screenX + 4, gap: 22, justifyContent: 'center' }}>
              <Txt variant="display" color="white">
                {t('First things first:\nwhat should we call you?')}
              </Txt>
              <GlassSurface radius={24} fill="rgba(255,255,255,0.85)">
                <View style={{ padding: 6 }}>
                  <Field autoFocus value={name} onChangeText={setName} placeholder={t('Your name')} maxLength={24} onSubmitEditing={next} returnKeyType="next" style={{ backgroundColor: 'transparent', color: '#1C1B22', fontSize: 20 }} />
                </View>
              </GlassSurface>
              <View style={{ flex: 1 }} />
              <Button label={name.trim() ? t('Nice to meet you, {name}', { name: name.trim() }) : t('Skip for now')} onPress={next} />
            </View>
          )}
          {step === 2 && <PickHabits picked={picked} setPicked={setPicked} onNext={next} />}
          {step === 3 && (
            <View style={{ flex: 1, paddingHorizontal: spacing.screenX + 4, gap: 18, justifyContent: 'center' }}>
              <Animated.View entering={FadeInDown.delay(100)} style={{ alignSelf: 'center' }}>
                <Bell />
              </Animated.View>
              <Txt variant="display" color="white" style={{ textAlign: 'center' }}>
                {t('Want a gentle nudge?')}
              </Txt>
              <Txt variant="body" color="rgba(255,255,255,0.9)" style={{ textAlign: 'center' }}>
                {t('One quiet reminder in the evening, only on days you still have habits open. You can set per-habit reminders later.')}
              </Txt>
              <View style={{ flex: 1 }} />
              <Button label={t('Turn on reminders')} onPress={() => complete(true)} />
              <Button label={t('Maybe later')} variant="ghost" color="#FFFFFF" onPress={() => complete(false)} />
            </View>
          )}
        </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  const { width } = useWindowDimensions();
  const w = Math.min(230, width * 0.56);
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);
  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.screenX + 4 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <FloatingCard float={float} rot={-10} dx={-w * 0.42} invert w={w} artId="staircase-climbing" themeId="lavender" />
        <FloatingCard float={float} rot={10} dx={w * 0.42} invert w={w} artId="swimming" themeId="lagoon" />
        <FloatingCard float={float} rot={0} dx={0} w={w} artId="cycling" themeId="sky" />
      </View>
      <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ gap: 12 }}>
        <Txt variant="display" color="white" style={{ fontSize: 36, lineHeight: 42 }}>
          {t('Habits that feel\nlike a reward.')}
        </Txt>
        <Txt variant="body" color="rgba(255,255,255,0.92)">
          {t('Swipe through beautiful cards, slide to complete, and watch your streaks grow. All private, all on your phone.')}
        </Txt>
        <Button label={t('Get started')} onPress={onNext} style={{ marginTop: 10 }} />
      </Animated.View>
    </View>
  );
}

interface FloatingCardProps {
  float: SharedValue<number>;
  rot: number;
  dx: number;
  invert?: boolean;
  w: number;
  artId: string;
  themeId: string;
}

function FloatingCard({ float, rot, dx, invert, w, artId, themeId }: FloatingCardProps) {
  const c = getTheme(themeId);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: dx }, { translateY: (invert ? 1 - float.value : float.value) * 10 - 5 }, { rotate: `${rot}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute' }, style]}>
      <View style={{ width: w, height: w * 1.3, borderRadius: 30, overflow: 'hidden', backgroundColor: c.cardTint, borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)', boxShadow: '0px 18px 36px rgba(0,0,0,0.18)' }}>
        <HabitArt artId={artId} colors={c} />
      </View>
    </Animated.View>
  );
}

function PickHabits({ picked, setPicked, onNext }: { picked: string[]; setPicked: (p: string[]) => void; onNext: () => void }) {
  const { width } = useWindowDimensions();
  const col = (width - (spacing.screenX + 4) * 2 - 12) / 2;
  const toggle = (k: string) => {
    haptic.tick();
    setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: spacing.screenX + 4, gap: 6, marginBottom: 14 }}>
        <Txt variant="display" color="white">
          {t('Pick a few to start')}
        </Txt>
        <Txt variant="body" color="rgba(255,255,255,0.9)">
          {t('Start small. You can add, edit or remove any time.')}
        </Txt>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.screenX + 4, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 }}>
        {templates.map((tpl, i) => {
          const on = picked.includes(tpl.key);
          const c = getTheme(tpl.themeId);
          return (
            <Animated.View key={tpl.key} entering={FadeIn.delay(i * 30)}>
              <PressableScale onPress={() => toggle(tpl.key)} silent accessibilityLabel={t(tpl.title)}>
                <View
                  style={{
                    width: col,
                    height: col * 0.95,
                    borderRadius: 24,
                    overflow: 'hidden',
                    backgroundColor: c.cardTint,
                    borderWidth: 3,
                    borderColor: on ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                  }}
                >
                  <HabitArt artId={tpl.artId} colors={c} compact={false} />
                  {tpl.schedule.kind !== 'daily' && (
                    // Not every day: say so up front, so it isn't a surprise on Home.
                    <View style={{ position: 'absolute', top: 10, left: 10, right: 44, alignItems: 'flex-start' }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(28,27,34,0.72)' }}>
                        <Txt variant="micro" color="white" numberOfLines={1}>
                          {scheduleLabel(tpl.schedule)}
                        </Txt>
                      </View>
                    </View>
                  )}
                  <View style={{ position: 'absolute', left: 6, right: 6, bottom: 6, padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)' }}>
                    <Txt variant="label" color="#1C1B22" numberOfLines={1}>
                      {t(tpl.title)}
                    </Txt>
                    <Txt variant="small" color="#8A8A95" numberOfLines={1}>
                      {qty(tpl.goalValue, tpl.unit)}
                    </Txt>
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? '#34C759' : 'rgba(255,255,255,0.6)',
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                    }}
                  >
                    {on && <CheckIcon size={14} color="#FFFFFF" strokeWidth={3.2} />}
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.screenX + 4, paddingTop: 8 }}>
        <Button label={picked.length ? t('Continue with {n}', { n: picked.length }) : t('Start with an empty slate')} onPress={onNext} />
      </View>
    </View>
  );
}

function Bell() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-12 + r.value * 24}deg` }] }));
  return (
    <GlassSurface radius={60} fill="rgba(255,255,255,0.3)">
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={style}>
          <BellRing size={54} color="#FFFFFF" strokeWidth={1.7} />
        </Animated.View>
      </View>
    </GlassSurface>
  );
}
