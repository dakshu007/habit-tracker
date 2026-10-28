import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Pressable, TextInput, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { DeviceSignals } from '../../modules/device-signals';
import { Txt } from '@/components/ui/Txt';
import { Button, PressableScale } from '@/components/ui/Glass';
import { CloseIcon } from '@/components/ui/icons';
import { ArrowUp, Bot, Flag, Mic, SquarePen } from '@/components/ui/lucide';
import { HabitArt } from '@/components/art/HabitArt';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/tokens';
import { useCoachStore, type CoachMessage } from '@/store/useCoachStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useUnlocked } from '@/store/useLicense';
import { refreshRemaining, reportReply, sendToCoach, weeklyInsight, type CoachResult } from '@/services/coach';
import { backendEnabled } from '@/config/backend';
import { haptic } from '@/utils/haptics';
import { getLang } from '@/i18n/core';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

/** Mild, calm colours (habit apps live in soft pastels). */
const INK = '#2E3A33';
const ACCENT = '#5E8C74';

type Topic = { key: 'insight' | 'skip' | 'plan'; title: string; sub: string; art: string; light: string; dark: string };
const TOPICS: Topic[] = [
  { key: 'insight', title: 'This week’s insight', sub: 'One pattern from your week, and one small idea', art: 'aura-lotus', light: '#E3EEE6', dark: '#2B3A32' },
  { key: 'skip', title: 'Why do I keep skipping?', sub: 'Find what’s getting in the way', art: 'aura-shoe', light: '#F6E6DA', dark: '#3B2F28' },
  { key: 'plan', title: 'Plan a better week for me', sub: 'A simple plan around your habits', art: 'aura-drop', light: '#E9E5F5', dark: '#312D3E' },
];

const reasonText = (r: Exclude<CoachResult, { ok: true }>['reason']) =>
  r === 'limit'
    ? t('You’ve used this month’s coach replies. They refresh soon.')
    : r === 'pro'
      ? t('Chatting with the coach is part of Pro.')
      : r === 'offline'
        ? t('No connection. Check your internet and try again.')
        : r === 'down'
          ? t('Your coach is offline right now. Your habits and streaks still work. Please try again in a little while.')
          : t('The coach couldn’t answer just now. Please try again.');

/**
 * The AI coach. Empty chat: a big greeting and a stack of soft suggestion
 * cards (tap the front one to ask it, tap a card behind to bring it forward).
 * Then a clean chat with a rounded input box, voice input and send.
 */
export function CoachScreen({ navigation }: RootScreenProps<'Coach'>) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const unlocked = useUnlocked();
  const name = useHabitStore((s) => s.profile.name);
  const messages = useCoachStore((s) => s.messages);
  const consent = useCoachStore((s) => s.consent);
  const remaining = useCoachStore((s) => s.remaining);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([0, 1, 2]);
  const [kbOpen, setKbOpen] = useState(false);
  const list = useRef<FlatList<CoachMessage>>(null);

  // Show the real replies-left count from the server as soon as the screen opens.
  useEffect(() => {
    if (unlocked && consent) refreshRemaining();
  }, [unlocked, consent]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKbOpen(true);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollDown = () => setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);

  const send = async (q: string) => {
    const msg = q.trim();
    if (!msg || busy) return;
    if (!unlocked) return navigation.navigate('Paywall');
    haptic.tick();
    setText('');
    setNote(null);
    setBusy(true);
    scrollDown();
    const res = await sendToCoach(msg);
    setBusy(false);
    if (!res.ok) setNote(reasonText(res.reason));
    scrollDown();
  };

  const askInsight = async () => {
    if (busy) return;
    haptic.tick();
    setNote(null);
    setBusy(true);
    const res = await weeklyInsight();
    setBusy(false);
    if (res.ok) {
      const store = useCoachStore.getState();
      const now = Date.now();
      store.add({ id: `wq${now}`, role: 'user', text: t('This week’s insight'), at: now });
      store.add({ id: `wa${now}`, role: 'assistant', text: res.text, at: now + 1 });
    } else setNote(reasonText(res.reason));
    scrollDown();
  };

  const pick = (topic: Topic) => (topic.key === 'insight' ? askInsight() : send(t(topic.title)));

  const listen = async () => {
    if (!DeviceSignals?.canRecognizeSpeech()) return ToastAndroid.show(t('Voice input isn’t available on this phone.'), ToastAndroid.SHORT);
    const results = await DeviceSignals.recognizeSpeech(t('Ask your coach'), getLang() === 'hi' ? 'hi-IN' : null).catch(() => [] as string[]);
    if (results[0]) setText((cur) => (cur ? `${cur} ${results[0]}` : results[0]));
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

  const newChat = () => {
    if (!messages.length) return;
    haptic.tick();
    useCoachStore.getState().clear();
    setNote(null);
  };

  const ink = isDark ? '#F2F1EE' : INK;
  const iconBtn = { width: 42, height: 42, borderRadius: 21, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: theme.inputBg };

  const header = (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <PressableScale onPress={() => navigation.goBack()} accessibilityLabel={t('Close')} style={iconBtn}>
        <CloseIcon size={19} color={ink} />
      </PressableScale>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Bot size={18} color={ACCENT} strokeWidth={2.2} />
          <Txt variant="h3" color={ink}>
            {t('Your coach')}
          </Txt>
        </View>
        {unlocked && remaining != null ? (
          <Txt variant="small" color="tertiary" style={{ fontSize: 11.5 }}>
            {t('{n} replies left', { n: remaining })}
          </Txt>
        ) : null}
      </View>
      <PressableScale onPress={newChat} accessibilityLabel={t('New chat')} style={[iconBtn, { opacity: messages.length ? 1 : 0.4 }]}>
        <SquarePen size={18} color={ink} strokeWidth={2} />
      </PressableScale>
    </View>
  );

  if (!backendEnabled()) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.screenBase }}>
        {header}
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
        {header}
        <View style={{ padding: 22, gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#2B3A32' : '#E3EEE6' }}>
            <Bot size={28} color={ACCENT} strokeWidth={2} />
          </View>
          <Txt variant="display" color={ink}>
            {t('Meet your AI coach')}
          </Txt>
          {[
            t('Ask about motivation, routines, sleep or why a habit isn’t sticking. It sees a short summary of your habits (names, goals, streaks and the last 14 days) to give personal answers.'),
            t('Replies come from an AI (Claude, by Anthropic). It can be wrong, and it isn’t medical or mental-health advice.'),
            t('Your chat stays on this phone. Each question and your habit summary are sent to answer it, then not stored.'),
            t('The coach is for people aged 18 and over.'),
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 9, backgroundColor: ACCENT }} />
              <Txt variant="bodyRegular" style={{ flex: 1 }}>
                {line}
              </Txt>
            </View>
          ))}
          <Button label={t('I’m 18 or older, continue')} color={ACCENT} onPress={() => (haptic.success(), useCoachStore.getState().setConsent(true))} style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  const empty = messages.length === 0;
  const firstName = name.trim().split(/\s+/)[0] ?? '';

  const greeting = (
    <View style={{ gap: 26, paddingTop: 10 }}>
      <View>
        <Txt variant="display" color={ink} numberOfLines={3} maxFontSizeMultiplier={1.1} style={{ fontSize: 34, lineHeight: 40, letterSpacing: -1 }}>
          {firstName ? t('Hi {name}, how can I help you?', { name: firstName }) : t('Hi, how can I help you?')}
        </Txt>
      </View>

      {/* Stacked suggestion cards, like a hand of cards */}
      <View style={{ height: 330 }}>
        {[...order].reverse().map((idx, i, arr) => {
          const depth = arr.length - 1 - i; // 0 = front
          const topic = TOPICS[idx];
          const isFront = depth === 0;
          return (
            <View
              key={topic.key}
              style={{
                position: 'absolute',
                left: depth * 14,
                right: depth * 14,
                top: (2 - depth) * 22,
                bottom: depth * 16,
                transform: [{ rotate: depth === 2 ? '-3deg' : depth === 1 ? '2deg' : '0deg' }],
              }}
            >
              <Pressable
                onPress={() => {
                  if (isFront) return pick(topic);
                  haptic.tick();
                  setOrder((cur) => [idx, ...cur.filter((x) => x !== idx)]);
                }}
                accessibilityRole="button"
                accessibilityLabel={t(topic.title)}
                style={{ flex: 1, borderRadius: 28, backgroundColor: isDark ? topic.dark : topic.light, padding: 18, boxShadow: isFront ? '0px 14px 30px rgba(0,0,0,0.10)' : undefined }}
              >
                {/* Cards behind show only their colour; text on them would be cut off. */}
                {isFront && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                    <HabitArt artId={topic.art} mode="thumb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3" color={ink} numberOfLines={1}>
                      {t(topic.title)}
                    </Txt>
                    <Txt variant="small" color={isDark ? 'rgba(255,255,255,0.7)' : '#5F6B64'} numberOfLines={1}>
                      {t(topic.sub)}
                    </Txt>
                  </View>
                </View>}
                {isFront && (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 150, height: 150, borderRadius: 75, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: 'rgba(255,255,255,0.7)' }}>
                      <HabitArt artId={topic.art} mode="thumb" />
                    </View>
                    <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.75)' }}>
                      <Bot size={14} color={ACCENT} strokeWidth={2.2} />
                      <Txt variant="label" color={ink}>
                        {topic.key === 'insight' || unlocked ? t('Tap to ask') : t('Pro')}
                      </Txt>
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
      {/* Which card is in front; tap a card behind to bring it forward. */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: -10 }}>
        {TOPICS.map((tp, i) => (
          <PressableScale key={tp.key} onPress={() => setOrder((cur) => [i, ...cur.filter((x) => x !== i)])} accessibilityLabel={t(tp.title)} style={{ padding: 4 }}>
            <View style={{ width: order[0] === i ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: order[0] === i ? ACCENT : theme.hairline }} />
          </PressableScale>
        ))}
      </View>
      {!unlocked && (
        <Txt variant="small" color="secondary" style={{ textAlign: 'center' }}>
          {t('Free plan: one insight a week. Pro: ask your coach anything.')}
        </Txt>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.screenBase }} behavior="padding">
      {header}

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16, gap: 14, flexGrow: 1 }}
        onContentSizeChange={() => !empty && list.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={empty ? greeting : null}
        renderItem={({ item: m }) =>
          m.role === 'user' ? (
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ maxWidth: '84%', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, borderBottomRightRadius: 6, backgroundColor: isDark ? '#3A4A41' : INK }}>
                <Txt variant="bodyRegular" color="#FFFFFF">
                  {m.text}
                </Txt>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#2B3A32' : '#E3EEE6' }}>
                <Bot size={16} color={ACCENT} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Pressable onLongPress={() => report(m)} delayLongPress={350}>
                  <Txt variant="bodyRegular" color={ink} style={{ lineHeight: 23 }}>
                    {m.text}
                  </Txt>
                </Pressable>
                <PressableScale onPress={() => report(m)} accessibilityLabel={t('Report this reply')} style={{ alignSelf: 'flex-start', paddingVertical: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Flag size={11} color={theme.textTertiary} strokeWidth={2} />
                    <Txt variant="small" color="tertiary" style={{ fontSize: 11 }}>
                      {t('Report')}
                    </Txt>
                  </View>
                </PressableScale>
              </View>
            </View>
          )
        }
        ListFooterComponent={
          <View style={{ gap: 10 }}>
            {busy && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#2B3A32' : '#E3EEE6' }}>
                  <Bot size={16} color={ACCENT} strokeWidth={2.2} />
                </View>
                <ActivityIndicator size="small" color={ACCENT} />
                <Txt variant="small" color="secondary">
                  {t('Thinking…')}
                </Txt>
              </View>
            )}
            {note && (
              <View style={{ padding: 12, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,176,32,0.16)' : '#FFF4DE' }}>
                <Txt variant="small">{note}</Txt>
              </View>
            )}
          </View>
        }
      />

      {/* Input card */}
      <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: kbOpen ? 10 : insets.bottom + 10, gap: 8 }}>
        {unlocked ? (
          <View
            style={{
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 10,
              gap: 8,
              backgroundColor: isDark ? theme.cardElevated : '#FFFFFF',
              borderWidth: 1,
              borderColor: theme.hairline,
              boxShadow: '0px 6px 18px rgba(0,0,0,0.06)',
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('Message your coach…')}
              placeholderTextColor={theme.textTertiary}
              multiline
              maxLength={600}
              maxFontSizeMultiplier={1.3}
              style={{ minHeight: 24, maxHeight: 110, padding: 0, color: theme.textPrimary, fontFamily: fonts.medium, fontSize: 16, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              {text.trim() ? (
                <PressableScale onPress={() => send(text)} disabled={busy} accessibilityLabel={t('Send')}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: busy ? theme.inputBg : ACCENT }}>
                    <ArrowUp size={19} color={busy ? theme.textTertiary : '#FFFFFF'} strokeWidth={2.5} />
                  </View>
                </PressableScale>
              ) : (
                <PressableScale onPress={listen} accessibilityLabel={t('Speak your question')}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                    <Mic size={20} color={ink} strokeWidth={2} />
                  </View>
                </PressableScale>
              )}
            </View>
          </View>
        ) : (
          <Button label={t('Chat with your coach with Pro')} color={ACCENT} onPress={() => navigation.navigate('Paywall')} />
        )}
        {!kbOpen && (
          <Txt variant="small" color="tertiary" style={{ textAlign: 'center', fontSize: 11.5 }}>
            {t('Your coach can make mistakes, so double-check it. Not medical advice.')}
          </Txt>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
