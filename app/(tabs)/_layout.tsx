import { Tabs } from 'expo-router';
import React from 'react';

import { LiquidTabBar } from '@/components/liquid-tab-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session } = useSession();
  const isAdmin = session?.role === 'admin';

  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'My Bets',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="ticket.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Results',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="trophy.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
