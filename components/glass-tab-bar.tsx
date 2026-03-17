import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

export interface TabItem {
  key: string;
  label: string;
  icon: (color: string, focused: boolean) => React.ReactNode;
}

interface GlassTabBarProps {
  tabs: TabItem[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

function TabButton({
  tab,
  focused,
  onPress,
  isDark,
}: {
  tab: TabItem;
  focused: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pillScale = useRef(new Animated.Value(focused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pillOpacity, {
        toValue: focused ? 1 : 0,
        useNativeDriver: true,
        tension: 180,
        friction: 14,
      }),
      Animated.spring(pillScale, {
        toValue: focused ? 1 : 0.7,
        useNativeDriver: true,
        tension: 180,
        friction: 14,
      }),
    ]).start();
  }, [focused]);

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, tension: 300, friction: 10 }).start();

  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();

  const activeColor = isDark ? '#a3e635' : '#16a34a';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)';
  const pillBg = isDark ? 'rgba(163,230,53,0.18)' : 'rgba(22,163,74,0.13)';
  const pillBorder = isDark ? 'rgba(163,230,53,0.35)' : 'rgba(22,163,74,0.25)';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {/* Active pill background */}
        <Animated.View
          style={[
            styles.activePill,
            {
              backgroundColor: pillBg,
              borderColor: pillBorder,
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            },
          ]}
        />
        {/* Icon */}
        <View style={styles.iconWrap}>
          {tab.icon(focused ? activeColor : inactiveColor, focused)}
        </View>
        {/* Label */}
        <Text
          style={[
            styles.label,
            { color: focused ? activeColor : inactiveColor },
            focused && styles.labelFocused,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function GlassTabBar({ tabs, activeIndex, onTabPress }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.outer, { bottom: bottomPad + 8 }]} pointerEvents="box-none">
      {/* Main pill */}
      <View style={[styles.pill, isDark ? styles.pillDark : styles.pillLight]}>
        {/* Blur layer — works in Expo Go */}
        <BlurView
          intensity={isDark ? 72 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Top specular sheen — mimics iOS 26 glass refraction */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0)']
              : ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sheen}
          pointerEvents="none"
        />

        {/* Inner border ring */}
        <View
          style={[styles.innerRing, isDark ? styles.innerRingDark : styles.innerRingLight]}
          pointerEvents="none"
        />

        {/* Tab buttons */}
        <View style={styles.tabRow}>
          {tabs.map((tab, i) => (
            <TabButton
              key={tab.key}
              tab={tab}
              focused={i === activeIndex}
              onPress={() => onTabPress(i)}
              isDark={isDark}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const PILL_RADIUS = 32;

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'stretch',
  },
  pill: {
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
    // shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  pillDark: {
    backgroundColor: 'rgba(12,16,14,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pillLight: {
    backgroundColor: 'rgba(240,248,242,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  sheen: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 28,
    borderRadius: PILL_RADIUS,
  },
  innerRing: {
    position: 'absolute',
    inset: 2,
    borderRadius: PILL_RADIUS - 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  innerRingDark: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  innerRingLight: {
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 56,
  },
  activePill: {
    position: 'absolute',
    inset: 0,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.1,
  },
  labelFocused: {
    fontWeight: '700',
  },
});
