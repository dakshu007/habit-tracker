import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Txt } from './Txt';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/tokens';

interface FieldProps extends TextInputProps {
  label?: string;
  large?: boolean;
}

/** Themed text input with an optional caption label. */
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, large, style, ...rest }, ref) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <Txt variant="micro" color="secondary">
          {label}
        </Txt>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.textTertiary}
        maxFontSizeMultiplier={1.3}
        selectionColor={theme.textPrimary}
        cursorColor={theme.textPrimary}
        {...rest}
        style={[
          {
            backgroundColor: theme.inputBg,
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: large ? 16 : 13,
            fontFamily: large ? fonts.bold : fonts.medium,
            fontSize: large ? 22 : 15.5,
            color: theme.textPrimary,
          },
          style,
        ]}
      />
    </View>
  );
});
