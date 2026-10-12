import { useState } from 'react';
import { ScrollView, ToastAndroid, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { Button, PressableScale } from '@/components/ui/Glass';
import { FileText } from '@/components/ui/lucide';
import { useTheme } from '@/theme/ThemeContext';
import { monthLabel, recentMonths, shareCsvReport, sharePdfReport } from '@/services/report';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';

const ACCENT = '#056EBE';

/** Pick a month, then share it as a designed PDF or raw CSV. */
export function ReportSheet() {
  const { theme } = useTheme();
  const months = recentMonths(6);
  const [pick, setPick] = useState(months[0]);
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);

  const run = async (kind: 'pdf' | 'csv') => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === 'pdf') await sharePdfReport(pick.year, pick.month);
      else await shareCsvReport(pick.year, pick.month);
      haptic.success();
    } catch {
      ToastAndroid.show(t('Couldn’t create the report'), ToastAndroid.SHORT);
    }
    setBusy(null);
  };

  return (
    <View style={{ padding: 22, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FileText size={28} color={ACCENT} strokeWidth={1.8} />
        <View style={{ flex: 1 }}>
          <Txt variant="h2">{t('Monthly report')}</Txt>
          <Txt variant="small" color="secondary">
            {t('A one-page PDF of your month, or every entry as a spreadsheet (CSV).')}
          </Txt>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {months.map((m) => {
          const on = m.year === pick.year && m.month === pick.month;
          return (
            <PressableScale key={`${m.year}-${m.month}`} silent onPress={() => (haptic.tick(), setPick(m))}>
              <View style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, justifyContent: 'center', backgroundColor: on ? ACCENT : theme.inputBg }}>
                <Txt variant="label" color={on ? 'white' : 'primary'}>
                  {monthLabel(m.year, m.month)}
                </Txt>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      <Button label={busy === 'pdf' ? t('Creating PDF…') : t('Share PDF report')} color={ACCENT} onPress={() => run('pdf')} disabled={!!busy} />
      <Button label={busy === 'csv' ? t('Creating CSV…') : t('Share CSV data')} variant="glass" onPress={() => run('csv')} disabled={!!busy} />
    </View>
  );
}
