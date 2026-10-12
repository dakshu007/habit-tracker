import { ActivityIndicator, Alert, View } from 'react-native';

import { Row } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { Button } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { ChevronRight } from '@/components/ui/icons';
import { CloudAlert, CloudCheck, CloudUpload } from '@/components/ui/lucide';
import { useTheme } from '@/theme/ThemeContext';
import { backupNowWithUi, connectDrive, disconnectDrive, driveBackupAvailable, restoreWithUi, useDriveBackup } from '@/services/driveBackup';
import { formatLastUpdated } from '@/utils/date';
import { t } from '@/i18n';

const BLUE = '#3BA4E6';
const GREEN = '#25A55F';
const ORANGE = '#F08A24';

function useStatus() {
  const { email, lastAt, needsReconnect, newerInDrive, busy } = useDriveBackup();
  if (email == null) return { on: false, busy, tone: BLUE, text: t('Keep your streaks safe if you lose or change your phone') };
  if (busy) return { on: true, busy, tone: BLUE, text: t('Backing up…') };
  if (needsReconnect) return { on: true, busy, tone: ORANGE, text: t('Tap to reconnect your Google account') };
  if (newerInDrive) return { on: true, busy, tone: ORANGE, text: t('A newer backup is in your Drive. Tap to choose') };
  return { on: true, busy, tone: GREEN, text: lastAt ? t('Last backup: {when}', { when: formatLastUpdated(new Date(lastAt).toISOString()) }) : t('Not backed up yet') };
}

/** Profile → Your data: the Google Drive backup row. */
export function DriveBackupRow() {
  const { theme } = useTheme();
  const s = useStatus();
  if (!driveBackupAvailable()) return null;
  const Icon = !s.on ? CloudUpload : s.tone === ORANGE ? CloudAlert : CloudCheck;
  return (
    <Row
      icon={<Icon size={19} color={s.tone} strokeWidth={2} />}
      iconBg={s.tone}
      title={s.on ? t('Google Drive backup') : t('Back up to Google Drive')}
      subtitle={s.text}
      onPress={() => {
        if (s.busy) return;
        if (!s.on) connectDrive().catch(() => {});
        else overlay.open(<DriveBackupSheet />);
      }}
      right={s.busy ? <ActivityIndicator size="small" color={BLUE} /> : <ChevronRight size={18} color={theme.textTertiary} />}
    />
  );
}

function DriveBackupSheet() {
  const email = useDriveBackup((st) => st.email);
  const s = useStatus();

  const turnOff = () =>
    Alert.alert(t('Turn off backup?'), t('Your last backup stays in your Google Drive, so you can still restore it later.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Turn off'),
        style: 'destructive',
        onPress: () => {
          overlay.close();
          disconnectDrive().catch(() => {});
        },
      },
    ]);

  return (
    <View style={{ padding: 22, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CloudCheck size={30} color={BLUE} strokeWidth={1.8} />
        <View style={{ flex: 1 }}>
          <Txt variant="h2">{t('Google Drive backup')}</Txt>
          {email ? (
            <Txt variant="small" color="secondary" numberOfLines={1}>
              {email}
            </Txt>
          ) : null}
        </View>
      </View>
      <Txt variant="body" color={s.tone === ORANGE ? ORANGE : 'primary'}>
        {s.text}
      </Txt>
      <Txt variant="small" color="secondary">
        {t('Your habits, streaks, history and runs are saved to a private app folder in your Google Drive. Only this app can open it, and we never see it. It backs up by itself when you leave the app.')}
      </Txt>
      <Button
        label={s.busy ? t('Backing up…') : t('Back up now')}
        color={BLUE}
        disabled={s.busy}
        icon={s.busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <CloudUpload size={18} color="#FFFFFF" strokeWidth={2} />}
        onPress={() => backupNowWithUi()}
      />
      <Button
        label={t('Restore from Drive')}
        variant="glass"
        disabled={s.busy}
        onPress={() => {
          overlay.close();
          setTimeout(() => restoreWithUi(), 250);
        }}
      />
      <Button label={t('Turn off backup')} variant="ghost" color="#E5484D" onPress={turnOff} />
    </View>
  );
}
