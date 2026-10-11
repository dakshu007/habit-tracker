import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Txt } from '@/components/ui/Txt';
import { Button, GlassButton, PressableScale } from '@/components/ui/Glass';
import { CloseIcon } from '@/components/ui/icons';
import { ArrowUp, Flag, MessageCircleHeart, Sparkles } from '@/components/ui/lucide';
import { useTheme } from '@/theme/ThemeContext';
import { hexToRgba } from '@/theme/color';
import { fonts } from '@/theme/tokens';
import { useCoachStore, type CoachMessage } from '@/store/useCoachStore';
import { useUnlocked } from '@/store/useLicense';
import { reportReply, sendToCoach, weeklyInsight, type CoachResult } from '@/services/coach';
import { backendEnabled } from '@/config/backend';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

const VIOLET = ['#5B6CF0', '#8E5CF5'] as const;

const PROMPTS = ['Why do I keep skipping?', 'Plan a better week for me', 'How can I sleep better?', 'Which habit should I focus on?'];

const reasonText = (r: Exclude<CoachResult, { ok: true }>['reason']) =>
  r === 'limit'
    ? t('You’ve used this month’s coach replies. They refresh soon.')
    : r === 'pro'
      ? t('Chatting with the coach is part of Pro.')
      : r === 'offline'
        ? t('No connection. Check your internet and try again.')
        : t('The coach couldn’t answer just now. Please try again.');

/**
 * The AI coach: a chat that knows your habits (a short summary of goals,
 * streaks and the last 14 days is sent with each question). Opt-in, never
 * pops up by itself. Replies can be reported.
 */
export function CoachScreen({ navigation }: RootScreenProps<'Coach'>) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const unlocked = useUnlocked();
  const messages = useCoachStore((s) => s.messages);
  const consent = useCoachStore((s) => s.consent);
  const remaining = useCoachStore((s) => s.remaining);
  const weekly = useCoachStore((s) => s.weekly);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'chat' | 'weekly' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const list = useRef<FlatList<CoachMessage>>(null);

  const send = async (q: string) => {
    const msg = q.trim();
    if (!msg || busy) return;
    if (!unlocked) return navigation.navigate('Paywall');
    haptic.tick();
    setText('');
    setNote(null);
    setBusy('chat');
    const res = await sendToCoach(msg);
    setBusy(null);
    if (!res.ok) setNote(reasonText(res.reason));
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
  };

  const getWeekly = async () => {
    if (busy) return;
    setBusy('weekly');
    setNote(null);
    const res = await weeklyInsight();
    setBusy(null);
    if (!res.ok) setNote(reasonText(res.reason));
  };

  const report = (m: CoachMessage) =>
    Alert.alert(t('Report this reply?'), t('Tell us what’s wrong. It helps keep the coach safe and useful.'), [
      { text: t('Cancel'), style: 'cancel' },
      ...[t('Harmful or offensive'), t('Wrong or misleading'), t('Not helpful')].map((reason) => ({
        text: reason,
        onPress: async () => {
          const ok = await reportReply(m.text, reason);
          ToastAndroid.show(ok ? t('Thanks, we’ll review it.') : t('Couldn’t send. Try again later.'), ToastAndroid.SHORT);
        },
      })),
    ]);

  const header = (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' }}>
        <Sparkles size={22} color="#FFFFFF" strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="h2" color="white">
          {t('Your coach')}
        </Txt>
        <Txt variant="small" color="rgba(255,255,255,0.85)" numberOfLines={1}>
          {unlocked && remaining != null ? t('{n} replies left', { n: remaining }) : t('Knows your habits, here to help')}
        </Txt>
      </View>
      <GlassButton accessibilityLabel={t('Close')} fill="rgba(255,255,255,0.22)" onPress={() => navigation.goBack()}>
        <CloseIcon size={20} color="#FFFFFF" />
      </GlassButton>
    </View>
  );

  if (!backendEnabled()) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
        <LinearGradient colors={[...VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {header}
        </LinearGradient>
        <View style={{ padding: 24, gap: 8 }}>
          <Txt variant="h3">{t('The coach is coming soon')}</Txt>
          <Txt variant="body" color="secondary">
            {t('It isn’t switched on in this version yet.')}
          </Txt>
        </View>
      </View>
    );
  }

  // First visit: what the coach is, and that it's for adults.
  if (!consent) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
        <LinearGradient colors={[...VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {header}
        </LinearGradient>
        <View style={{ padding: 22, gap: 14 }}>
          <Txt variant="h2">{t('Meet your AI coach')}</Txt>
          {[
            t('Ask about motivation, routines, sleep or why a habit isn’t sticking. It sees a short summary of your habits (names, goals, streaks and the last 14 days) to give personal answers.'),
            t('Replies come from an AI (Claude, by Anthropic). It can be wrong, and it isn’t medical or mental-health advice.'),
            t('Your chat stays on this phone. Each question and your habit summary are sent to answer it, then not stored.'),
            t('The coach is for people aged 18 and over.'),
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 9, backgroundColor: VIOLET[0] }} />
              <Txt variant="bodyRegular" style={{ flex: 1 }}>
                {line}
              </Txt>
            </View>
          ))}
          <Button label={t('I’m 18 or older, continue')} color={VIOLET[0]} onPress={() => (haptic.success(), useCoachStore.getState().setConsent(true))} style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  const bubbleBg = isDark ? theme.cardElevated : '#FFFFFF';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.screenBase }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={[...VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {header}
      </LinearGradient>

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 6 }}>
            {/* Weekly insight: every plan gets one a week */}
            <PressableScale onPress={getWeekly} scaleTo={0.98} accessibilityLabel={t('This week’s insight')}>
              <View style={{ padding: 14, borderRadius: 20, gap: 6, backgroundColor: hexToRgba(VIOLET[0], isDark ? 0.22 : 0.08) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MessageCircleHeart size={18} color={VIOLET[0]} strokeWidth={2.2} />
                  <Txt variant="label" color={VIOLET[0]}>
                    {t('This week’s insight')}
                  </Txt>
                  {busy === 'weekly' && <ActivityIndicator size="small" color={VIOLET[0]} />}
                </View>
                <Txt variant="bodyRegular" color={weekly ? 'primary' : 'secondary'}>
                  {weekly?.text ?? t('Tap to see one pattern from your week and one small idea for the next.')}
                </Txt>
              </View>
            </PressableScale>
            {!unlocked && (
              <PressableScale onPress={() => navigation.navigate('Paywall')} scaleTo={0.98}>
                <View style={{ padding: 14, borderRadius: 20, backgroundColor: VIOLET[0], gap: 2 }}>
                  <Txt variant="label" color="white">
                    {t('Chat with your coach with Pro')}
                  </Txt>
                  <Txt variant="small" color="rgba(255,255,255,0.88)">
                    {t('Ask anything about your habits, any time. Tap to see plans.')}
                  </Txt>
                </View>
              </PressableScale>
            )}
          </View>
        }
        ListEmptyComponent={
          unlocked ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Txt variant="small" color="secondary">
                {t('Try asking')}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PROMPTS.map((p) => (
                  <PressableScale key={p} onPress={() => send(t(p))}>
                    <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: bubbleBg, borderWidth: 1, borderColor: theme.hairline }}>
                      <Txt variant="label">{t(p)}</Txt>
                    </View>
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item: m }) => {
          const mine = m.role === 'user';
          return (
            <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <Pressable onLongPress={mine ? undefined : () => report(m)} delayLongPress={350} style={{ maxWidth: '86%' }}>
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderBottomRightRadius: mine ? 6 : 20,
                    borderBottomLeftRadius: mine ? 20 : 6,
                    backgroundColor: mine ? VIOLET[0] : bubbleBg,
                    borderWidth: mine ? 0 : 1,
                    borderColor: theme.hairline,
                  }}
                >
                  <Txt variant="bodyRegular" color={mine ? 'white' : 'primary'}>
                    {m.text}
                  </Txt>
                </View>
              </Pressable>
              {!mine && (
                <PressableScale onPress={() => report(m)} accessibilityLabel={t('Report this reply')} style={{ padding: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Flag size={12} color={theme.textTertiary} strokeWidth={2} />
                    <Txt variant="small" color="tertiary" style={{ fontSize: 11 }}>
                      {t('Report')}
                    </Txt>
                  </View>
                </PressableScale>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          <View style={{ gap: 8 }}>
            {busy === 'chat' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={VIOLET[0]} />
                <Txt variant="small" color="secondary">
                  {t('Thinking…')}
                </Txt>
              </View>
            )}
            {note && (
              <View style={{ padding: 12, borderRadius: 16, backgroundColor: hexToRgba('#FFB020', isDark ? 0.16 : 0.12) }}>
                <Txt variant="small">{note}</Txt>
              </View>
            )}
            {messages.length > 0 && (
              <Txt variant="small" color="tertiary" style={{ textAlign: 'center', fontSize: 11 }}>
                {t('AI can make mistakes. Not medical advice.')}
              </Txt>
            )}
          </View>
        }
      />

      {unlocked && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderTopColor: theme.hairline, backgroundColor: theme.screenBase }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('Ask your coach…')}
            placeholderTextColor={theme.textTertiary}
            multiline
            maxLength={600}
            style={{ flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 23, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, backgroundColor: theme.inputBg, color: theme.textPrimary, fontFamily: fonts.medium, fontSize: 15.5 }}
          />
          <PressableScale onPress={() => send(text)} disabled={!text.trim() || !!busy} accessibilityLabel={t('Send')}>
            <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() && !busy ? VIOLET[0] : theme.inputBg }}>
              <ArrowUp size={22} color={text.trim() && !busy ? '#FFFFFF' : theme.textTertiary} strokeWidth={2.4} />
            </View>
          </PressableScale>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
