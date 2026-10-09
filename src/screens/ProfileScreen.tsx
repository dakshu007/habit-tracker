import { useMemo, useState } from 'react';
import { Alert, ToastAndroid, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';

import { Screen, Card, SectionTitle, Toggle, Row } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button, PressableScale } from '@/components/ui/Glass';
import { Field } from '@/components/ui/Field';
import { overlay } from '@/components/ui/Overlay';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ArchiveIcon, ChevronRight, DownloadIcon, EditIcon, MotionIcon, PlusIcon, RefreshIcon, ShareIcon, VibrateIcon, CalendarSmallIcon, SwipeIcon, WidgetIcon } from '@/components/ui/icons';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme, type ThemeMode } from '@/theme/ThemeContext';
import { levelFor, levelTitle, xpFor } from '@/logic/habits';
import { exportBackup, pickBackup } from '@/services/backup';
import { SwipeToggle } from '@/components/ui/SwipeToggle';
import { MotionPicker } from '@/components/ui/MotionPicker';
import { requestPinWidget } from 'react-native-android-widget';
import { WIDGET_NAME } from '@/widget/TodayWidget';
import { haptic } from '@/utils/haptics';
import type { RootNav } from '@/navigation/types';

const toast = (msg: string) => ToastAndroid.show(msg, ToastAndroid.SHORT);

function NameDialog() {
  const name = useHabitStore((s) => s.profile.name);
  const setProfile = useHabitStore((s) => s.setProfile);
  const [text, setText] = useState(name);
  const save = () => {
    setProfile({ name: text.trim() });
    overlay.close();
  };
  return (
    <View style={{ padding: 22, gap: 18 }}>
      <Txt variant="h2">What should we call you?</Txt>
      <Field autoFocus value={text} onChangeText={setText} placeholder="Your name" maxLength={24} onSubmitEditing={save} returnKeyType="done" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Cancel" variant="glass" onPress={overlay.close} style={{ flex: 1 }} />
        <Button label="Save" onPress={save} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const navigation = useNavigation<RootNav>();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const profile = useHabitStore((s) => s.profile);
  const settings = useHabitStore((s) => s.settings);
  const updateSettings = useHabitStore((s) => s.updateSettings);
  const importSnapshot = useHabitStore((s) => s.importSnapshot);
  const resetAll = useHabitStore((s) => s.resetAll);

  const lvl = useMemo(() => levelFor(xpFor(habits, logs)), [habits, logs]);
  const activeCount = habits.filter((h) => !h.archived).length;
  const archivedCount = habits.length - activeCount;
  const initial = (profile.name || 'You').trim().charAt(0).toUpperCase();

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

  const addWidget = async () => {
    const ok = await requestPinWidget({ widgetName: WIDGET_NAME }).catch(() => false);
    if (!ok) {
      Alert.alert(
        'Add the widget',
        'Long-press an empty spot on your home screen → Widgets → Habit Tracker, then drag “Today’s habits” onto your screen.',
      );
    }
  };

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
    <Screen title="Profile" accent="#34C7A0">
      {/* Identity */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <LinearGradient colors={['#5ED3B3', '#4C8DF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.7)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt variant="title" color="white">
              {initial}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="title" color="white" numberOfLines={1}>
              {profile.name || 'Add your name'}
            </Txt>
            <Txt variant="small" color="rgba(255,255,255,0.88)">
              Level {lvl.level} · {levelTitle(lvl.level)} · {activeCount} habits
            </Txt>
          </View>
          <PressableScale accessibilityLabel="Edit name" onPress={() => overlay.open(<NameDialog />, 'dialog')}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
              <EditIcon size={18} color="#FFFFFF" />
            </View>
          </PressableScale>
        </LinearGradient>
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
          icon={<SwipeIcon size={19} color="#34C7A0" />}
          iconBg="#34C7A0"
          title="Swipe between tabs"
          subtitle="Swipe left or right on any screen"
          right={<Toggle value={settings.swipeTabs} onChange={(v) => updateSettings({ swipeTabs: v })} />}
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
