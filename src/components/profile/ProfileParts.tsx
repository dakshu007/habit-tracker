import { useMemo, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';

import { Txt } from '@/components/ui/Txt';
import { Field } from '@/components/ui/Field';
import { Button, PressableScale } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { CameraIcon, CheckIcon, EditIcon, FlameIcon, LockIcon, SparkleIcon, TrashIcon } from '@/components/ui/icons';
import { useHabitStore } from '@/store/useHabitStore';
import { useTheme } from '@/theme/ThemeContext';
import { getProfileStyle, profileStyles } from '@/data/profileStyles';
import { bestCurrentStreak, levelFor, levelTitle, perfectDays, totalCompletions, xpFor } from '@/logic/habits';
import { computeAchievements, type Achievement } from '@/logic/achievements';
import { MONTH_LABELS } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';
import { Gift } from '@/components/ui/lucide';
import { isUnlocked, rewardsFor, useUnlockedAchievements } from '@/logic/unlocks';
import { Alert } from 'react-native';

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

export function Avatar({ size, ring = 'rgba(255,255,255,0.85)' }: { size: number; ring?: string }) {
  const profile = useHabitStore((s) => s.profile);
  const style = getProfileStyle(profile.cardStyle);
  const initial = (profile.name || 'You').trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: ring, overflow: 'hidden', backgroundColor: style.colors[1] }}>
      {profile.photoUri ? (
        <Image source={{ uri: profile.photoUri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Txt variant="title" color="white" style={{ fontSize: size * 0.4 }}>
            {initial}
          </Txt>
        </LinearGradient>
      )}
    </View>
  );
}

/** Pick a square photo and keep a private copy in app storage. */
export async function pickProfilePhoto(): Promise<boolean> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
  if (res.canceled || !res.assets?.[0]) return false;
  const dest = new File(Paths.document, `avatar-${Date.now()}.jpg`);
  await new File(res.assets[0].uri).copy(dest);
  const { profile, setProfile } = useHabitStore.getState();
  removePhotoFile(profile.photoUri);
  setProfile({ photoUri: dest.uri });
  return true;
}

function removePhotoFile(uri?: string) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* already gone */
  }
}

export function removeProfilePhoto() {
  const { profile, setProfile } = useHabitStore.getState();
  removePhotoFile(profile.photoUri);
  setProfile({ photoUri: undefined });
}

/* ------------------------------------------------------------------ */
/* Identity card                                                       */
/* ------------------------------------------------------------------ */

export function IdentityCard() {
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  const profile = useHabitStore((s) => s.profile);
  const style = getProfileStyle(profile.cardStyle);

  const stats = useMemo(() => {
    const lvl = levelFor(xpFor(habits, logs));
    return {
      lvl,
      streak: bestCurrentStreak(habits, logs, today, weekStart)?.streak.current ?? 0,
      checkins: totalCompletions(habits, logs),
      perfect: perfectDays(habits, logs),
    };
  }, [habits, logs, today, weekStart]);

  const joined = profile.joinedAt ?? habits.reduce<string | undefined>((min, h) => (!min || h.createdAt < min ? h.createdAt : min), undefined);
  const joinedLabel = joined ? `${MONTH_LABELS[new Date(joined).getMonth()]} ${new Date(joined).getFullYear()}` : null;

  return (
    <View style={{ borderRadius: 32, overflow: 'hidden', boxShadow: `0px 16px 36px ${style.colors[1]}55` }}>
      <LinearGradient colors={style.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, gap: 18 }}>
        {/* Glass: a soft sheen from the top-left and a fine light rim. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
          locations={[0, 0.45, 0.8]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)' }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <PressableScale accessibilityLabel={t('Change profile photo')} onPress={() => overlay.open(<EditProfileSheet />)}>
            <View style={{ padding: 3, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
              <Avatar size={72} />
            </View>
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0px 3px 8px rgba(0,0,0,0.18)',
              }}
            >
              <CameraIcon size={15} color="#1C1B22" strokeWidth={2.2} />
            </View>
          </PressableScale>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt variant="title" color="white" numberOfLines={1}>
              {profile.name || t('Add your name')}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
                <Txt variant="micro" color="white">
                  {t('Lv {n}', { n: stats.lvl.level })} · {t(levelTitle(stats.lvl.level))}
                </Txt>
              </View>
              {joinedLabel && (
                <Txt variant="small" color="rgba(255,255,255,0.85)" numberOfLines={1}>
                  {t('since {date}', { date: joinedLabel })}
                </Txt>
              )}
            </View>
          </View>
          <PressableScale accessibilityLabel={t('Edit profile')} onPress={() => overlay.open(<EditProfileSheet />)}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}>
              <EditIcon size={18} color="#FFFFFF" />
            </View>
          </PressableScale>
        </View>

        {profile.motto ? (
          <Txt variant="body" color="rgba(255,255,255,0.95)" style={{ fontStyle: 'italic' }}>
            “{profile.motto}”
          </Txt>
        ) : null}

        {/* XP progress */}
        <View style={{ gap: 6 }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.max(3, (stats.lvl.into / stats.lvl.span) * 100)}%`, backgroundColor: '#FFFFFF', borderRadius: 4 }} />
          </View>
          <Txt variant="small" color="rgba(255,255,255,0.85)">
            {t('{xp} XP to level {n}', { xp: stats.lvl.span - stats.lvl.into, n: stats.lvl.level + 1 })}
          </Txt>
        </View>

        {/* Stat strip */}
        <View style={{ flexDirection: 'row', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingVertical: 12 }}>
          <Stat icon={<FlameIcon size={16} />} value={stats.streak} label={t('Streak')} />
          <Divider />
          <Stat icon={<CheckIcon size={15} color="#FFFFFF" strokeWidth={3} />} value={stats.checkins} label={t('Check-ins')} />
          <Divider />
          <Stat icon={<SparkleIcon size={15} color="#FFFFFF" />} value={stats.perfect} label={t('Perfect days')} />
        </View>
      </LinearGradient>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {icon}
        <Txt variant="statSmall" color="white">
          {value}
        </Txt>
      </View>
      <Txt variant="small" color="rgba(255,255,255,0.82)">
        {label}
      </Txt>
    </View>
  );
}

const Divider = () => <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 }} />;

/* ------------------------------------------------------------------ */
/* Edit profile sheet                                                  */
/* ------------------------------------------------------------------ */

export function EditProfileSheet() {
  const { theme } = useTheme();
  const profile = useHabitStore((s) => s.profile);
  const setProfile = useHabitStore((s) => s.setProfile);
  const [name, setName] = useState(profile.name);
  const [motto, setMotto] = useState(profile.motto ?? '');
  const [styleId, setStyleId] = useState(getProfileStyle(profile.cardStyle).id);
  const unlocked = useUnlockedAchievements();

  const save = () => {
    setProfile({ name: name.trim(), motto: motto.trim() || undefined, cardStyle: styleId });
    haptic.success();
    overlay.close();
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18 }}>
      <Txt variant="h2">{t('Edit profile')}</Txt>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Avatar size={72} ring={theme.hairline} />
        <View style={{ flex: 1, gap: 8 }}>
          <Button label={profile.photoUri ? t('Change photo') : t('Add photo')} variant="glass" icon={<CameraIcon size={17} color={theme.textPrimary} />} onPress={() => pickProfilePhoto().catch(() => {})} />
          {profile.photoUri && <Button label={t('Remove photo')} variant="ghost" color={theme.danger} icon={<TrashIcon size={16} color={theme.danger} />} onPress={removeProfilePhoto} />}
        </View>
      </View>

      <Field label={t('Name')} value={name} onChangeText={setName} placeholder={t('Your name')} maxLength={24} />
      <Field label={t('Your motto')} value={motto} onChangeText={setMotto} placeholder={t('e.g. Small steps, every day.')} maxLength={60} />

      <View style={{ gap: 10 }}>
        <Txt variant="micro" color="secondary">
          {t('Card color')}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {profileStyles.map((p) => {
            const on = p.id === styleId;
            const locked = !isUnlocked(p.unlock, unlocked);
            return (
              <PressableScale
                key={p.id}
                silent
                onPress={() => {
                  if (locked) return showLocked(p.name, unlocked.get(p.unlock!));
                  haptic.tick();
                  setStyleId(p.id);
                }}
                accessibilityLabel={locked ? t('{name} (locked)', { name: p.name }) : p.name}
              >
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{ padding: 3, borderRadius: 18, borderWidth: 2, borderColor: on ? theme.textPrimary : 'transparent' }}>
                    <LinearGradient colors={p.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.45 : 1 }}>
                      {on && <CheckIcon size={16} color="#FFFFFF" strokeWidth={3} />}
                      {locked && <LockIcon size={15} color="#FFFFFF" strokeWidth={2.4} />}
                    </LinearGradient>
                  </View>
                  <Txt variant="small" color={on ? 'primary' : 'secondary'}>
                    {t(p.name)}
                  </Txt>
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label={t('Cancel')} variant="glass" onPress={overlay.close} style={{ flex: 1 }} />
        <Button label={t('Save')} onPress={save} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export function useAchievements(): Achievement[] {
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const today = useHabitStore((s) => s.today);
  const weekStart = useHabitStore((s) => s.settings.weekStart);
  return useMemo(() => computeAchievements({ habits, logs, today, weekStart }), [habits, logs, today, weekStart]);
}

export function Badge({ a, size = 64 }: { a: Achievement; size?: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', opacity: a.unlocked ? 1 : 0.55 }}>
      {a.unlocked ? (
        <LinearGradient colors={a.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <a.icon size={size * 0.46} color="#FFFFFF" strokeWidth={1.9} />
        </LinearGradient>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.inputBg }}>
          <a.icon size={size * 0.42} color={theme.textTertiary} strokeWidth={1.8} />
          <View style={{ position: 'absolute', right: size * 0.08, bottom: size * 0.08, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.cardElevated, alignItems: 'center', justifyContent: 'center' }}>
            <LockIcon size={11} color={theme.textSecondary} strokeWidth={2.4} />
          </View>
        </View>
      )}
    </View>
  );
}

export function AchievementsGrid() {
  const list = useAchievements();
  const unlocked = list.filter((a) => a.unlocked).length;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="h3">
          {t('{a} of {b} unlocked', { a: unlocked, b: list.length })}
        </Txt>
        <Txt variant="small" color="secondary">
          {t('Tap a badge')}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
        {list.map((a) => (
          <PressableScale key={a.id} silent onPress={() => (haptic.light(), overlay.open(<BadgeSheet a={a} />))} style={{ width: '25%', alignItems: 'center', gap: 6 }}>
            <Badge a={a} size={58} />
            <Txt variant="small" color={a.unlocked ? 'primary' : 'secondary'} numberOfLines={1} style={{ fontSize: 11.5 }}>
              {t(a.title)}
            </Txt>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

function BadgeSheet({ a }: { a: Achievement }) {
  const { theme } = useTheme();
  return (
    <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
      <Badge a={a} size={110} />
      <Txt variant="title">{t(a.title)}</Txt>
      <Txt variant="bodyRegular" color="secondary" style={{ textAlign: 'center' }}>
        {t(a.description)}
      </Txt>
      {rewardsFor(a.id).length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: theme.inputBg }}>
          <Gift size={15} color={theme.textPrimary} strokeWidth={2} />
          <Txt variant="small">{t('Unlocks: {list}', { list: rewardsFor(a.id).map((r) => t(r)).join(', ') })}</Txt>
        </View>
      )}
      <View style={{ alignSelf: 'stretch', gap: 6, marginTop: 6 }}>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: theme.progressTrack, overflow: 'hidden' }}>
          <LinearGradient colors={a.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${Math.max(4, (a.value / a.target) * 100)}%`, borderRadius: 5 }} />
        </View>
        <Txt variant="label" color={a.unlocked ? 'success' : 'secondary'} style={{ textAlign: 'center' }}>
          {a.unlocked ? t('Unlocked') : `${a.value} / ${a.target}`}
        </Txt>
      </View>
      <Button label={t('Close')} variant="glass" onPress={overlay.close} style={{ alignSelf: 'stretch', marginTop: 6 }} />
    </View>
  );
}

/** Explain how to earn a locked reward. */
export function showLocked(name: string, a?: Achievement) {
  haptic.warning();
  Alert.alert(
    t('{name} is locked', { name }),
    a ? t('Unlock it by earning “{title}”: {desc} ({value}/{target})', { title: t(a.title), desc: t(a.description), value: a.value, target: a.target }) : t('Keep going to unlock it.'),
  );
}
