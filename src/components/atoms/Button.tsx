import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { colors, borderRadius, spacing, typography } = useTheme();

  // Determine button styles based on variant
  const getVariantStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          button: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: colors.accent,
          },
          text: {
            color: colors.accent,
          },
        };
      case 'destructive':
        return {
          button: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: colors.danger,
          },
          text: {
            color: colors.danger,
          },
        };
      case 'primary':
      default:
        return {
          button: {
            backgroundColor: colors.accent,
          },
          text: {
            color: '#FFFFFF',
          },
        };
    }
  };

  const variantStyle = getVariantStyles();

  // Handle disabled styling
  const disabledButtonStyle: ViewStyle = disabled
    ? {
        backgroundColor: variant === 'primary' ? colors.border : 'transparent',
        borderColor: colors.border,
        opacity: 0.6,
      }
    : {};

  const disabledTextStyle: TextStyle = disabled
    ? {
        color: colors.placeholder,
      }
    : {};

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
        },
        variantStyle.button,
        disabledButtonStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : variant === 'destructive' ? colors.danger : colors.accent}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.semibold,
            },
            variantStyle.text,
            disabledTextStyle,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginVertical: 6,
  },
  text: {
    textAlign: 'center',
  },
});
