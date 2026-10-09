import { useState } from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Glass';
import { overlay } from '@/components/ui/Overlay';
import { HeartHandshake } from '@/components/ui/lucide';
import { useHabitStore } from '@/store/useHabitStore';
import { sendToBuddy } from '@/services/buddy';
import { t } from '@/i18n';

/** Set (or change) the accountability buddy. */
export function BuddySheet({ sendAfter = false }: { sendAfter?: boolean }) {
  const buddy = useHabitStore((s) => s.extras.buddy);
  const setBuddy = useHabitStore((s) => s.setBuddy);
  const [name, setName] = useState(buddy?.name ?? '');
  const [phone, setPhone] = useState(buddy?.phone ?? '');

  const save = () => {
    setBuddy(name.trim() ? { name: name.trim(), phone: phone.trim() || undefined } : undefined);
    overlay.close();
    if (sendAfter && name.trim()) setTimeout(() => sendToBuddy(), 300);
  };

  return (
    <View style={{ padding: 22, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <HeartHandshake size={30} color="#25A55F" strokeWidth={1.8} />
        <View style={{ flex: 1 }}>
          <Txt variant="h2">{t('Accountability buddy')}</Txt>
          <Txt variant="small" color="secondary">
            {t('Someone who cheers you on. Send them your daily check-in in one tap.')}
          </Txt>
        </View>
      </View>
      <Field label={t('Name')} value={name} onChangeText={setName} placeholder={t('e.g. Priya')} maxLength={24} />
      <Field
        label={t('WhatsApp number (optional)')}
        value={phone}
        onChangeText={setPhone}
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
        maxLength={20}
      />
      <Txt variant="small" color="secondary">
        {t('With a number, check-ins open straight in WhatsApp. Without one, you pick the app each time.')}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {buddy ? (
          <Button
            label={t('Remove')}
            variant="glass"
            onPress={() => {
              setBuddy(undefined);
              overlay.close();
            }}
            style={{ flex: 1 }}
          />
        ) : (
          <Button label={t('Cancel')} variant="glass" onPress={overlay.close} style={{ flex: 1 }} />
        )}
        <Button label={sendAfter ? t('Save & send') : t('Save')} color="#25A55F" onPress={save} disabled={!name.trim()} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
