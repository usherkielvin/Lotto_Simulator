import { Tabs, useRouter, useSegments } from 'expo-router';
import React from 'react';

import { GlassTabBar, TabItem } from '@/components/glass-tab-bar';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TABS: TabItem[] = [
  {
    key: 'index',
    label: 'Home',
    icon: (color) => <IconSymbol size={22} name="house.fill" color={color} />,
  },
  {
    key: 'explore',
    label: 'Explore',
    icon: (color) => <IconSymbol size={22} name="paperplane.fill" color={color} />,
  },
];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  // Derive active index from current route segment
  const activeIndex = TABS.findIndex((t) => segments.includes(t.key as never));
  const safeIndex = activeIndex < 0 ? 0 : activeIndex;

  const handleTabPress = (index: number) => {
    const routes = ['/(tabs)/', '/(tabs)/explore'] as const;
    router.push(routes[index] as any);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: 'none' }, // hide default bar; we render our own
      }}
      tabBar={() => (
        <GlassTabBar
          tabs={TABS}
          activeIndex={safeIndex}
          onTabPress={handleTabPress}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
