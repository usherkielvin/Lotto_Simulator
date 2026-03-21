import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { BalanceProvider } from '@/hooks/use-balance';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/hooks/use-session';

function RootLayoutNav() {
  const { session, loading } = useSession();
  const router = useRouter();
  const prevSession = useRef(session);

  useEffect(() => {
    if (loading) return;

    const hadSession = prevSession.current;
    prevSession.current = session;

    // Session just cleared — go to login
    if (hadSession && !session) {
      router.replace('/login' as never);
      return;
    }

    // Session just set — go to tabs
    if (!hadSession && session) {
      router.replace('/(tabs)' as never);
    }
  }, [session, loading, router]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="deposit" />
      <Stack.Screen name="withdraw" />
      <Stack.Screen name="funding-history" />
      <Stack.Screen name="settings-theme" />
      <Stack.Screen name="settings-notifications" />
      <Stack.Screen name="settings-help" />
      <Stack.Screen name="settings-privacy" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="about" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SessionProvider>
        <BalanceProvider>
          <ThemeProvider value={theme}>
            <RootLayoutNav />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </ThemeProvider>
        </BalanceProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
