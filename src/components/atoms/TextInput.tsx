import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput as RNTextInput, TextInputProps as RNTextInputProps, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type TextInputProps = RNTextInputProps & {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
};

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  required = false,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors, borderRadius, spacing, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const getBorderColor = () => {
    if (error) return colors.danger;
    if (isFocused) return colors.accent;
    return colors.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              {
                color: colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.medium,
                marginBottom: spacing.xs,
              },
            ]}
          >
            {label}
          </Text>
          {required ? (
            <Text
              style={[
                styles.asterisk,
                {
                  color: colors.danger,
                  fontSize: typography.fontSizes.sm,
                  marginLeft: 2,
                },
              ]}
            >
              *
            </Text>
          ) : null}
        </View>
      ) : null}
      <RNTextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderColor: getBorderColor(),
            borderRadius: borderRadius.md,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            fontSize: typography.fontSizes.md,
          },
          inputStyle,
        ]}
        placeholderTextColor={colors.placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {error ? (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.danger,
              fontSize: typography.fontSizes.xs,
              marginTop: spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {},
  asterisk: {},
  input: {
    borderWidth: 1.5,
    minHeight: 46,
  },
  errorText: {},
});
