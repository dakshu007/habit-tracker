import { Alert, Image, ToastAndroid, View } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';

import { Screen, Card, SectionTitle, Toggle, Row } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ArchiveIcon, CheckIcon, ChevronRight, DownloadIcon, MotionIcon, PlusIcon, RefreshIcon, ShareIcon, VibrateIcon, CalendarSmallIcon, WidgetIcon } from '@/components/ui/icons';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme, type ThemeMode } from '@/theme/ThemeContext';
import { exportBackup, pickBackup } from '@/services/backup';
import { AchievementsGrid, IdentityCard } from '@/components/profile/ProfileParts';
import { SwipeToggle } from '@/components/ui/SwipeToggle';
import { MotionPicker } from '@/components/ui/MotionPicker';
import { requestPinWidget } from 'react-native-android-widget';
import { CARD_WIDGET, LIST_WIDGET } from '@/widget/TodayWidget';
import { getProfileStyle } from '@/data/profileStyles';
import { CalendarCheck, CloudUpload, FaceSlightlySmiling, FileText, Gem, HeartHandshake, Languages, ShieldCheck } from '@/components/ui/lucide';
import { BuddySheet } from '@/components/profile/BuddySheet';
import { LANGUAGES, t } from '@/i18n';
import { haptic } from '@/utils/haptics';
import type { RootNav } from '@/navigation/types';

const toast = (msg: string) => ToastAndroid.show(msg, ToastAndroid.SHORT);


export function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const navigation = useNavigation<RootNav>();
  const habits = useHabitStore((s) => s.habits);
  const profile = useHabitStore((s) => s.profile);
  const settings = useHabitStore((s) => s.settings);
  const buddy = useHabitStore((s) => s.extras.buddy);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  const importSnapshot = useHabitStore((s) => s.importSnapshot);
  const resetAll = useHabitStore((s) => s.resetAll);

  const activeCount = habits.filter((h) => !h.archived).length;
  const archivedCount = habits.length - activeCount;

  const doImport = async () => {
    try {
      const snap = await pickBackup();
      if (!snap) return;
      Alert.alert(t('Restore this backup?'), t('It contains {n} habits. Your current data will be replaced.', { n: snap.habits.length }), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Restore'),
          style: 'destructive',
          onPress: () => {
            importSnapshot(snap);
            haptic.success();
            toast(t('Backup restored'));
          },
        },
      ]);
    } catch (e) {
      haptic.warning();
      Alert.alert(t('Couldn’t import'), e instanceof Error ? t(e.message) : t('Unknown error'));
    }
  };

  const addWidget = () => overlay.open(<WidgetPicker />);

  const doReset = () =>
    Alert.alert(t('Erase everything?'), t('All habits, history and settings will be deleted from this phone. This can’t be undone.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Erase'),
        style: 'destructive',
        onPress: () => {
          haptic.warning();
          resetAll();
        },
      },
    ]);

  return (
    <Screen title={t('Profile')} accent={getProfileStyle(profile.cardStyle).colors[1]}>
      <IdentityCard />

      <SectionTitle>{t('Achievements')}</SectionTitle>
      <Card>
        <AchievementsGrid />
      </Card>

      <SectionTitle>{t('Appearance')}</SectionTitle>
      <Card style={{ gap: 12 }}>
        <SegmentedControl<ThemeMode>
          options={[
            { key: 'light', label: t('Light') },
            { key: 'dark', label: t('Dark') },
            { key: 'system', label: t('System') },
          ]}
          value={mode}
          onChange={(m) => {
            haptic.tick();
            setMode(m);
          }}
        />
      </Card>

      <SectionTitle>{t('Animations')}</SectionTitle>
      <Card>
        <MotionPicker />
      </Card>

      <SectionTitle>{t('Experience')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon={<VibrateIcon size={19} color="#4C8DF6" />}
          iconBg="#4C8DF6"
          title={t('Haptics')}
          subtitle={t('Subtle taps as you interact')}
          right={<Toggle value={settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />}
        />
        <Row
          icon={<MotionIcon size={19} color="#B280FF" />}
          iconBg="#B280FF"
          title={t('Motion effects')}
          subtitle={t('Cards tilt with your phone')}
          right={<Toggle value={settings.motion} onChange={(v) => updateSettings({ motion: v })} />}
        />
        <Row
          icon={<FaceSlightlySmiling size={19} color="#34C7A0" strokeWidth={2} />}
          iconBg="#34C7A0"
          title={t('Mood check-ins')}
          subtitle={t('Ask how you feel after completing a habit')}
          right={<Toggle value={settings.moodPrompt} onChange={(v) => updateSettings({ moodPrompt: v })} />}
        />
        <Row
          icon={<CalendarCheck size={19} color="#7E6CF0" strokeWidth={2} />}
          iconBg="#7E6CF0"
          title={t('Weekly review')}
          subtitle={t('A Sunday-evening recap of your week')}
          right={<Toggle value={settings.weeklyReview} onChange={(v) => updateSettings({ weeklyReview: v })} />}
        />
        <Row
          icon={<Languages size={19} color="#E0457B" strokeWidth={2} />}
          iconBg="#E0457B"
          title={t('Language')}
          subtitle={LANGUAGES.find((l) => l.id === settings.language)?.native}
          onPress={() => overlay.open(<LanguageSheet />)}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row
          icon={<Gem size={19} color="#D49A00" strokeWidth={2} />}
          iconBg="#D49A00"
          title={t('Currency')}
          subtitle={t('Used for money saved in quit habits')}
          onPress={() => overlay.open(<CurrencySheet />)}
          right={
            <Txt variant="statSmall" color="secondary">
              {settings.currency}
            </Txt>
          }
        />
        <Row
          last
          icon={<CalendarSmallIcon size={19} color="#FF986D" />}
          iconBg="#FF986D"
          title={t('Week starts on')}
          right={
            <SwipeToggle<'1' | '0'>
              options={[
                { key: '1', label: t('Mon') },
                { key: '0', label: t('Sun') },
              ]}
              value={`${settings.weekStart}` as '1' | '0'}
              onChange={(v) => updateSettings({ weekStart: v === '1' ? 1 : 0 })}
            />
          }
        />
      </Card>

      <SectionTitle>{t('Habits')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon={<PlusIcon size={19} color="#34C759" />}
          iconBg="#34C759"
          title={t('New habit')}
          onPress={() => navigation.navigate('HabitEditor')}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row
          icon={<WidgetIcon size={19} color="#B280FF" />}
          iconBg="#B280FF"
          title={t('Add home-screen widget')}
          subtitle={t('Check off habits without opening the app')}
          onPress={addWidget}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row
          last
          icon={<ArchiveIcon size={19} color="#5E86A4" />}
          iconBg="#5E86A4"
          title={t('Manage habits')}
          subtitle={archivedCount ? t('{a} active · {b} archived', { a: activeCount, b: archivedCount }) : t('{a} active', { a: activeCount })}
          onPress={() => navigation.navigate('ManageHabits')}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
      </Card>

      <SectionTitle>{t('Friends')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          last
          icon={<HeartHandshake size={19} color="#25A55F" strokeWidth={2} />}
          iconBg="#25A55F"
          title={buddy ? t('Buddy: {name}', { name: buddy.name }) : t('Add an accountability buddy')}
          subtitle={buddy ? t('Tap to edit · send check-ins from the Day view') : t('Share your daily check-in with a friend')}
          onPress={() => overlay.open(<BuddySheet />)}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
      </Card>

      <SectionTitle>{t('Your data')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon={<ShareIcon size={19} color="#4C8DF6" />}
          iconBg="#4C8DF6"
          title={t('Export backup')}
          subtitle={t('Save a file to Drive, email or chat')}
          onPress={() => exportBackup().catch(() => toast(t('Export failed')))}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row
          icon={<DownloadIcon size={19} color="#34C759" />}
          iconBg="#34C759"
          title={t('Restore from backup')}
          onPress={doImport}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row
          icon={<CloudUpload size={19} color="#3BA4E6" strokeWidth={2} />}
          iconBg="#3BA4E6"
          title={t('Google backup')}
          subtitle={t('Automatic — Android backs up to your Google account')}
          onPress={() =>
            Alert.alert(
              t('Automatic Google backup'),
              t('Android backs up this app’s data to your Google account about once a day (on Wi-Fi, while charging). When you set up a new phone with the same Google account and reinstall the app, your habits come back. Check it in Android Settings → Google → Backup.'),
            )
          }
          right={<ShieldCheck size={18} color="#34C759" strokeWidth={2} />}
        />
        <Row
          icon={<FileText size={19} color="#8A8F98" strokeWidth={2} />}
          iconBg="#8A8F98"
          title={t('Privacy policy')}
          onPress={() => navigation.navigate('Privacy')}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row last danger icon={<RefreshIcon size={19} color={theme.danger} />} iconBg={theme.danger} title={t('Erase all data')} onPress={doReset} />
      </Card>

      <View style={{ alignItems: 'center', gap: 4, paddingTop: 8 }}>
        <Txt variant="small" color="tertiary">
          {t('Version {v}', { v: Constants.expoConfig?.version ?? '1.0.0' })}
        </Txt>
        <Txt variant="small" color="tertiary" style={{ textAlign: 'center' }}>
          {t('Offline-first · your data never leaves this phone')}
        </Txt>
      </View>
    </Screen>
  );
}

/** Choose which home-screen widget to pin. */
function WidgetPicker() {
  const { theme } = useTheme();
  const pin = async (widgetName: string) => {
    overlay.close();
    const ok = await requestPinWidget({ widgetName }).catch(() => false);
    if (!ok) {
      Alert.alert(t('Add the widget'), t('Long-press an empty spot on your home screen → Widgets → Habit Tracker, then drag it onto your screen.'));
    }
  };
  const option = (name: string, title: string, desc: string, preview: number) => (
    <PressableScale key={name} onPress={() => pin(name)} scaleTo={0.98}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 22, backgroundColor: theme.inputBg }}>
        <Image source={preview} resizeMode="contain" style={{ width: 96, height: 96 }} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt variant="h3">{title}</Txt>
          <Txt variant="small" color="secondary">
            {desc}
          </Txt>
        </View>
        <ChevronRight size={18} color={theme.textTertiary} />
      </View>
    </PressableScale>
  );
  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Txt variant="h2">{t('Add a widget')}</Txt>
      {option(CARD_WIDGET, t('Habit card'), t('Your habit card with the slider. Use ‹ › to switch habits.'), require('../../assets/widget-card-preview.png'))}
      {option(LIST_WIDGET, t('Today’s habits'), t('Every habit for today, with +1 and slide-to-complete.'), require('../../assets/widget-preview.png'))}
    </View>
  );
}

function LanguageSheet() {
  const { theme } = useTheme();
  const language = useHabitStore((s) => s.settings.language);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Txt variant="h2">{t('Language')}</Txt>
      {LANGUAGES.map((l) => {
        const on = l.id === language;
        return (
          <PressableScale
            key={l.id}
            onPress={() => {
              overlay.close();
              updateSettings({ language: l.id });
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: on ? 'rgba(76,141,246,0.12)' : theme.inputBg }}>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{l.native}</Txt>
                <Txt variant="small" color="secondary">
                  {l.label}
                </Txt>
              </View>
              {on && <CheckIcon size={18} color="#4C8DF6" strokeWidth={3} />}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const CURRENCIES = ['₹', '$', '€', '£', '¥', 'AED', 'R$', '₩'];

function CurrencySheet() {
  const { theme } = useTheme();
  const currency = useHabitStore((s) => s.settings.currency);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <Txt variant="h2">{t('Currency')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {CURRENCIES.map((c) => (
          <PressableScale
            key={c}
            onPress={() => {
              updateSettings({ currency: c });
              overlay.close();
            }}
          >
            <View style={{ minWidth: 64, height: 48, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c === currency ? '#4C8DF6' : theme.inputBg }}>
              <Txt variant="statSmall" color={c === currency ? 'white' : 'primary'}>
                {c}
              </Txt>
            </View>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}
