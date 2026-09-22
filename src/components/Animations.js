import React, { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity } from 'react-native';

/* iOS-style staggered entrance: fade + rise with a gentle spring settle. */
export const FadeInUp = ({ delay = 0, distance = 16, duration = 420, style, children }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => progress.stopAnimation();
  }, [progress, delay, duration]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });

  return (
    <Animated.View
      style={[
        style,
        { opacity: progress, transform: [{ translateY }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/* Button press behaves like iOS: quick spring scale-down, elastic release. */
export const ScalePressable = ({
  onPress,
  style,
  activeScale = 0.96,
  children,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: activeScale,
      speed: 40,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 24,
      bounciness: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={0.85}
        style={style}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};