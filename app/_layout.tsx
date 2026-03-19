import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/hooks/use-session';

function RootLayoutNav() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inTabs = segments[0] === '(tabs)';
    const inAdmin = segments[0] === 'admin';
    const onAuthRoute = pathname === '/' || pathname === '/login';

    console.log('Navigation check:', { session: !!session, segments, inTabs, inAdmin, pathname });

    if (session && onAuthRoute && !inTabs && !inAdmin) {
      console.log('Has session on root - redirecting to tabs');
      router.replace('/(tabs)');
      return;
    }

    if (!session && pathname !== '/login') {
      console.log('No session outside root - redirecting to login');
      router.replace('/login');
    }
  }, [session, loading, segments, pathname, router]);

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // If no session, only show login screen - use key to force remount
  if (!session) {
    return <Stack key="auth" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
    </Stack>;
  }

  // If has session, show tabs and other authenticated screens - use key to force remount
  return <Stack key="app" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="admin" />
    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
  </Stack>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootLayoutNav />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
