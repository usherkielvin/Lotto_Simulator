import {
    LiquidGlassContainerView,
    LiquidGlassView,
    isLiquidGlassSupported,
} from '@/modules/liquid-glass';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TabIconName = 'house.fill' | 'clock.fill' | 'person.fill';

function TabIcon({
  name,
  color,
  focused,
  isDark,
}: {
  name: TabIconName;
  color: string;
  focused: boolean;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.iconChip,
        focused
          ? [
              styles.iconChipFocused,
              {
                backgroundColor: isDark ? 'rgba(74, 222, 128, 0.22)' : 'rgba(22, 163, 74, 0.14)',
                borderColor: isDark ? 'rgba(134, 239, 172, 0.48)' : 'rgba(22, 163, 74, 0.28)',
              },
            ]
          : [
              styles.iconChipIdle,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)',
              },
            ],
      ]}
    >
      <IconSymbol size={20} name={name} color={color} />
    </View>
  );
}

/** Wraps BottomTabBar in native liquid glass on supported iOS, and a visual clone elsewhere. */
function LiquidGlassTabBar(props: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (Platform.OS === 'ios' && isLiquidGlassSupported) {
    return (
      <LiquidGlassContainerView spacing={10} style={styles.tabBarOuter}>
        <LiquidGlassView style={styles.nativeShell} effect="regular" colorScheme="system">
          <BottomTabBar {...props} />
        </LiquidGlassView>
      </LiquidGlassContainerView>
    );
  }

  // Expo Go / Android / web fallback that mirrors floating liquid-glass depth.
  return (
    <View style={styles.tabBarOuter} pointerEvents="box-none">
      <View
        style={[
          styles.fallbackShell,
          isDark ? styles.fallbackShellDark : styles.fallbackShellLight,
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.topSheen, isDark ? styles.topSheenDark : styles.topSheenLight]}
        />
        <View pointerEvents="none" style={styles.edgeRing} />
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => null,
        tabBarStyle: styles.tabBarBase,
        tabBarItemStyle: styles.tabBarItem,
      }}
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="house.fill" color={color} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="clock.fill" color={color} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person.fill" color={color} focused={focused} isDark={isDark} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
  },
  nativeShell: {
    borderRadius: 34,
    overflow: 'hidden',
  },
  fallbackShell: {
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 14,
  },
  fallbackShellDark: {
    backgroundColor: 'rgba(9, 13, 11, 0.86)',
  },
  fallbackShellLight: {
    backgroundColor: 'rgba(244, 250, 246, 0.78)',
  },
  topSheen: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: -8,
    height: 30,
    borderRadius: 18,
  },
  topSheenDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  topSheenLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  edgeRing: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 2,
    bottom: 2,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  tabBarBase: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: 8,
    paddingBottom: 8,
    height: 68,
  },
  tabBarItem: {
    borderRadius: 18,
    marginHorizontal: 4,
    marginTop: 2,
  },
  iconChip: {
    minWidth: 40,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipFocused: {
    transform: [{ translateY: -1 }],
  },
  iconChipIdle: {
    borderColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 0,
  },
});

