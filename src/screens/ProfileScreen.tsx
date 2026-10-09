import { Alert, Image, ToastAndroid, View } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';

import { Screen, Card, SectionTitle, Toggle, Row } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { PressableScale } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ArchiveIcon, ChevronRight, DownloadIcon, MotionIcon, PlusIcon, RefreshIcon, ShareIcon, VibrateIcon, CalendarSmallIcon, WidgetIcon } from '@/components/ui/icons';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme, type ThemeMode } from '@/theme/ThemeContext';
import { exportBackup, pickBackup } from '@/services/backup';
import { AchievementsGrid, IdentityCard } from '@/components/profile/ProfileParts';
import { SwipeToggle } from '@/components/ui/SwipeToggle';
import { MotionPicker } from '@/components/ui/MotionPicker';
import { requestPinWidget } from 'react-native-android-widget';
import { CARD_WIDGET, LIST_WIDGET } from '@/widget/TodayWidget';
import { getProfileStyle } from '@/data/profileStyles';
import { haptic } from '@/utils/haptics';
import type { RootNav } from '@/navigation/types';

const toast = (msg: string) => ToastAndroid.show(msg, ToastAndroid.SHORT);


export function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const navigation = useNavigation<RootNav>();
  const habits = useHabitStore((s) => s.habits);
  const profile = useHabitStore((s) => s.profile);
  const settings = useHabitStore((s) => s.settings);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  const importSnapshot = useHabitStore((s) => s.importSnapshot);
  const resetAll = useHabitStore((s) => s.resetAll);

  const activeCount = habits.filter((h) => !h.archived).length;
  const archivedCount = habits.length - activeCount;

  const doImport = async () => {
    try {
      const snap = await pickBackup();
      if (!snap) return;
      Alert.alert('Restore this backup?', `It contains ${snap.habits.length} habits. Your current data will be replaced.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            importSnapshot(snap);
            haptic.success();
            toast('Backup restored');
          },
        },
      ]);
    } catch (e) {
      haptic.warning();
      Alert.alert('Couldn’t import', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const addWidget = () => overlay.open(<WidgetPicker />);

  const doReset = () =>
    Alert.alert('Erase everything?', 'All habits, history and settings will be deleted from this phone. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: () => {
          haptic.warning();
          resetAll();
        },
      },
    ]);

  return (
    <Screen title="Profile" accent={getProfileStyle(profile.cardStyle).colors[1]}>
      <IdentityCard />

      <SectionTitle>Achievements</SectionTitle>
      <Card>
        <AchievementsGrid />
      </Card>

      <SectionTitle>Appearance</SectionTitle>
      <Card style={{ gap: 12 }}>
        <SegmentedControl<ThemeMode>
          options={[
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
            { key: 'system', label: 'System' },
          ]}
          value={mode}
          onChange={(m) => {
            haptic.tick();
            setMode(m);
          }}
        />
      </Card>

      <SectionTitle>Animations</SectionTitle>
      <Card>
        <MotionPicker />
      </Card>

      <SectionTitle>Experience</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon={<VibrateIcon size={19} color="#4C8DF6" />}
          iconBg="#4C8DF6"
          title="Haptics"
          subtitle="Subtle taps as you interact"
          right={<Toggle value={settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />}
        />
        <Row
          icon={<MotionIcon size={19} color="#B280FF" />}
          iconBg="#B280FF"
          title="Motion effects"
          subtitle="Cards tilt with your phone"
          right={<Toggle value={settings.motion} onChange={(v) => updateSettings({ motion: v })} />}
        />
        <Row
          last
          icon={<CalendarSmallIcon size={19} color="#FF986D" />}
          iconBg="#FF986D"
          title="Week starts on"
          right={
            <SwipeToggle<'1' | '0'>
              options={[
                { key: '1', label: 'Mon' },
                { key: '0', label: 'Sun' },
              ]}
              value={`${settings.weekStart}` as '1' | '0'}
              onChange={(v) => updateSettings({ weekStart: v === '1' ? 1 : 0 })}
            />
          }
        />
      </Card>

      <SectionTitle>Habits</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon={<PlusIcon size={19} color="#34C759" />}
          iconBg="#34C759"
          title="New habit"
          onPress={() => navigation.navigate('HabitEditor')}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row
          icon={<WidgetIcon size={19} color="#B280FF" />}
          iconBg="#B280FF"
          title="Add home-screen widget"
          subtitle="Check off habits without opening the app"
          onPress={addWidget}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row
          last
          icon={<ArchiveIcon size={19} color="#5E86A4" />}
          iconBg="#5E86A4"
          title="Manage habits"
          subtitle={`${activeCount} active${archivedCount ? ` · ${archivedCount} archived` : ''}`}
          onPress={() => navigation.navigate('ManageHabits')}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon={<ShareIcon size={19} color="#4C8DF6" />}
          iconBg="#4C8DF6"
          title="Export backup"
          subtitle="Save a file to Drive, email or chat"
          onPress={() => exportBackup().catch(() => toast('Export failed'))}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row
          icon={<DownloadIcon size={19} color="#34C759" />}
          iconBg="#34C759"
          title="Restore from backup"
          onPress={doImport}
          right={<ChevronRight size={18} color={theme.textTertiary} />}
        />
        <Row last danger icon={<RefreshIcon size={19} color={theme.danger} />} iconBg={theme.danger} title="Erase all data" onPress={doReset} />
      </Card>

      <View style={{ alignItems: 'center', gap: 4, paddingTop: 8 }}>
        <Txt variant="small" color="tertiary">
          Version {Constants.expoConfig?.version ?? '1.0.0'}
        </Txt>
        <Txt variant="small" color="tertiary" style={{ textAlign: 'center' }}>
          Offline-first · your data never leaves this phone
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
      Alert.alert('Add the widget', 'Long-press an empty spot on your home screen → Widgets → Habit Tracker, then drag it onto your screen.');
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
      <Txt variant="h2">Add a widget</Txt>
      {option(CARD_WIDGET, 'Habit card', 'Your habit card with the slider. Use ‹ › to switch habits.', require('../../assets/widget-card-preview.png'))}
      {option(LIST_WIDGET, 'Today’s habits', 'Every habit for today, with +1 and slide-to-complete.', require('../../assets/widget-preview.png'))}
    </View>
  );
}
