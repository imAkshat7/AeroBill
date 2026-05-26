import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing as themeSpacing } from '../../styles/theme';
import { useToastStore } from '../../stores/toastStore';

export const Toast: React.FC = () => {
  const { message, type, visible, hideToast } = useToastStore();
  const { colors, borderRadius, spacing, typography } = useTheme();

  // Animation values
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current; // Start offscreen

  useEffect(() => {
    if (visible) {
      // Fade in and slide down
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50, // Floating position from top
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out and slide up
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!message && !visible) return null;

  // Determine colors based on toast type
  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          bg: colors.dangerLight,
          border: colors.danger,
          text: colors.danger,
        };
      case 'warning':
        return {
          bg: colors.warningLight,
          border: colors.warning,
          text: colors.warning,
        };
      case 'success':
      default:
        return {
          bg: colors.successLight,
          border: colors.success,
          text: colors.success,
        };
    }
  };

  const toastColors = getColors();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: toastColors.bg,
          borderColor: toastColors.border,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          ...colors.cardShadow,
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={hideToast} style={styles.touchable}>
        <Text
          style={[
            styles.text,
            {
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.medium,
            },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: themeSpacing.lg,
    right: themeSpacing.lg,
    alignSelf: 'center',
    borderWidth: 1.5,
    zIndex: 9999,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
});
export default Toast;
