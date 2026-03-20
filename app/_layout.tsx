import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceProvider } from '@/hooks/use-balance';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useConnectivity } from '@/hooks/use-connectivity';
import { SessionProvider, useSession } from '@/hooks/use-session';

function OfflineBanner() {
  const { isOnline } = useConnectivity();
  const insets = useSafeAreaInsets();

  if (isOnline) {
    return null;
  }

  return (
    <View style={[styles.offlineBanner, { paddingTop: Math.max(insets.top, 8) }]}>
      <Text style={styles.offlineBannerText}>Offline explore mode: browse tabs; reconnect to sign in and place bets</Text>
    </View>
  );
}

function RootLayoutNav() {
  const { session, loading } = useSession();
  const { isOnline } = useConnectivity();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const canBrowseOffline = !session && !isOnline;

  useEffect(() => {
    if (loading) return;

    const inTabs = segments[0] === '(tabs)';
    const onAuthRoute = pathname === '/' || pathname === '/login';

    if (session && onAuthRoute && !inTabs) {
      router.replace('/(tabs)');
      return;
    }

    if (canBrowseOffline) {
      if (!inTabs) {
        router.replace('/(tabs)');
      }
      return;
    }

    if (!session && pathname !== '/login') {
      router.replace('/login');
    }
  }, [session, loading, segments, pathname, router, canBrowseOffline]);

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // If online and no session, only show auth screens
  if (!session && !canBrowseOffline) {
    return <Stack key="auth" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
    </Stack>;
  }

  // If authenticated or offline-browse mode, show tabs
  return <Stack key={canBrowseOffline ? 'offline-app' : 'app'} screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    {session && <Stack.Screen name="deposit" />}
    {session && <Stack.Screen name="withdraw" />}
    {session && <Stack.Screen name="funding-history" />}
    {session && <Stack.Screen name="settings-theme" />}
    {session && <Stack.Screen name="settings-notifications" />}
    {session && <Stack.Screen name="settings-help" />}
    {session && <Stack.Screen name="settings-privacy" />}
    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
  </Stack>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SessionProvider>
        <BalanceProvider>
          <ThemeProvider value={theme}>
            <OfflineBanner />
            <RootLayoutNav />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </ThemeProvider>
        </BalanceProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 100,
    backgroundColor: '#9a3412',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  offlineBannerText: {
    color: '#fff7ed',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
});
