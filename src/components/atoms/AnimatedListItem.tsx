import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface AnimatedListItemProps {
  index: number;
  children: React.ReactNode;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({ index, children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current; // Subtle slide up

  useEffect(() => {
    // Stagger delay capped at 300ms to keep transitions snappy for long lists
    const delay = Math.min(index * 50, 300);

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [index, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

export default AnimatedListItem;
