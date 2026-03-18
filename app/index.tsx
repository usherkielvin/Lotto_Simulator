import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';

type AuthPalette = {
  page: string;
  hero: string;
  heroTitle: string;
  heroSubtitle: string;
  card: string;
  cardBorder: string;
  label: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;
  primaryButton: string;
  primaryButtonText: string;
  secondaryButton: string;
  secondaryButtonText: string;
  error: string;
  helper: string;
  toggleBg: string;
  toggleText: string;
  orbOne: string;
  orbTwo: string;
  chipBg: string;
  chipText: string;
  buttonIcon: string;
};

const lightPalette: AuthPalette = {
  page: '#edf3ff',
  hero: '#0047ab',
  heroTitle: '#fdfefe',
  heroSubtitle: '#d9e8ff',
  card: '#ffffff',
  cardBorder: '#ccdbf5',
  label: '#123f80',
  inputBg: '#f8fbff',
  inputBorder: '#b8cdee',
  inputText: '#1a3261',
  placeholder: '#6f88b3',
  primaryButton: '#f4b400',
  primaryButtonText: '#2b250d',
  secondaryButton: '#0f5ec3',
  secondaryButtonText: '#e8f2ff',
  error: '#c22525',
  helper: '#456082',
  toggleBg: '#003984',
  toggleText: '#f1f7ff',
  orbOne: '#cddfff',
  orbTwo: '#e2ecff',
  chipBg: '#0d57b7',
  chipText: '#edf4ff',
  buttonIcon: '#3a2f08',
};

const darkPalette: AuthPalette = {
  page: '#08162d',
  hero: '#0c5ec8',
  heroTitle: '#edf6ff',
  heroSubtitle: '#d0e4ff',
  card: '#0f203d',
  cardBorder: '#274778',
  label: '#b6d2ff',
  inputBg: '#0a1830',
  inputBorder: '#34598e',
  inputText: '#e3efff',
  placeholder: '#85a3d0',
  primaryButton: '#f4b400',
  primaryButtonText: '#302605',
  secondaryButton: '#1a76e8',
  secondaryButtonText: '#e6f1ff',
  error: '#ff8f8f',
  helper: '#9bb9e3',
  toggleBg: '#08397f',
  toggleText: '#eef5ff',
  orbOne: '#0e2a54',
  orbTwo: '#153561',
  chipBg: '#084799',
  chipText: '#e8f2ff',
  buttonIcon: '#382b07',
};

type SessionResult = {
  userId: number;
  username: string;
  displayName: string;
  role: string;
  demo: boolean;
};

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const { signIn } = useSession();
  const isWeb = Platform.OS === 'web';
  const [useWebDark, setUseWebDark] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const heroEntrance = useRef(new Animated.Value(0)).current;
  const cardEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroEntrance, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardEntrance, {
        toValue: 1,
        duration: 620,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardEntrance, heroEntrance]);

  const isDark = isWeb ? useWebDark : scheme === 'dark';
  const palette = isDark ? darkPalette : lightPalette;

  const enterHome = async (session: SessionResult) => {
    await signIn({
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      demo: session.demo,
    });
    router.replace('/(tabs)');
  };

  const onLogin = async () => {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Enter both username and password to continue.');
      return;
    }
    if (cleanPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const session = await apiFetch<SessionResult>('/auth/login', {
        method: 'POST',
        body: { username: cleanUsername, password: cleanPassword },
      });
      enterHome(session);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async () => {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanDisplayName = displayName.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Username and password are required.');
      return;
    }
    if (cleanPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (!cleanDisplayName) {
      setError('Display name is required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const session = await apiFetch<SessionResult>('/auth/register', {
        method: 'POST',
        body: { username: cleanUsername, password: cleanPassword, displayName: cleanDisplayName },
      });
      enterHome(session);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const heroAnimatedStyle = {
    opacity: heroEntrance,
    transform: [
      {
        translateY: heroEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  const cardAnimatedStyle = {
    opacity: cardEntrance,
    transform: [
      {
        translateY: cardEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.page }]}>
      <View style={[styles.orbTop, { backgroundColor: palette.orbOne }]} />
      <View style={[styles.orbBottom, { backgroundColor: palette.orbTwo }]} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.hero, { backgroundColor: palette.hero }, heroAnimatedStyle]}>
          <Text style={[styles.heroTag, { color: palette.heroSubtitle }]}>PCSO DEMO DRAW HUB</Text>
          <Text style={[styles.heroTitle, { color: palette.heroTitle }]}>PCSO Lotto Simulator</Text>
          <Text style={[styles.heroSubtitle, { color: palette.heroSubtitle }]}>
            Place demo bets, track your tickets, and settle results on the daily 9:00 PM draw schedule.
          </Text>

          <View style={styles.heroChipRow}>
            <View style={[styles.heroChip, { backgroundColor: palette.chipBg }]}>
              <Text style={[styles.heroChipText, { color: palette.chipText }]}>6/42</Text>
            </View>
            <View style={[styles.heroChip, { backgroundColor: palette.chipBg }]}>
              <Text style={[styles.heroChipText, { color: palette.chipText }]}>6/55</Text>
            </View>
            <View style={[styles.heroChip, { backgroundColor: palette.chipBg }]}>
              <Text style={[styles.heroChipText, { color: palette.chipText }]}>9PM DRAW</Text>
            </View>
          </View>

          {isWeb ? (
            <Pressable
              style={[styles.toggleButton, { backgroundColor: palette.toggleBg }]}
              onPress={() => setUseWebDark((value) => !value)}>
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={15}
                color={palette.toggleText}
              />
              <Text style={[styles.toggleLabel, { color: palette.toggleText }]}>Theme</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            { backgroundColor: palette.card, borderColor: palette.cardBorder },
            cardAnimatedStyle,
          ]}>
          <Text style={[styles.cardTitle, { color: palette.label }]}>{isSignup ? 'Create Account' : 'Welcome Back'}</Text>

          <Text style={[styles.inputLabel, { color: palette.label }]}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={palette.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            style={[
              styles.input,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.inputBorder,
                color: palette.inputText,
              },
            ]}
          />

          {isSignup && (
            <>
              <Text style={[styles.inputLabel, styles.passwordLabel, { color: palette.label }]}>Display Name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter display name"
                placeholderTextColor={palette.placeholder}
                autoCapitalize="words"
                textContentType="name"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                    color: palette.inputText,
                  },
                ]}
              />
            </>
          )}

          <Text style={[styles.inputLabel, styles.passwordLabel, { color: palette.label }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={palette.placeholder}
            secureTextEntry
            textContentType="password"
            style={[
              styles.input,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.inputBorder,
                color: palette.inputText,
              },
            ]}
          />

          {error ? <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text> : null}

          <Pressable
            style={[styles.loginButton, { backgroundColor: palette.primaryButton, opacity: loading ? 0.7 : 1 }]}
            onPress={isSignup ? onSignup : onLogin}
            disabled={loading}>
            <Text style={[styles.loginLabel, { color: palette.primaryButtonText }]}>
              {loading ? (isSignup ? 'Creating…' : 'Signing in…') : (isSignup ? 'Create Account' : 'Login')}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={palette.buttonIcon} />
          </Pressable>

          <Pressable
            style={styles.toggleMode}
            onPress={() => {
              setIsSignup(!isSignup);
              setError('');
              setDisplayName('');
            }}>
            <Text style={[styles.toggleModeText, { color: palette.helper }]}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={[styles.toggleModeLink, { color: palette.secondaryButton }]}>
                {isSignup ? 'Login' : 'Sign up'}
              </Text>
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, right: -80,   top: -70,    opacity: 0.58 },
  orbBottom: { position: 'absolute', width: 300, height: 300, borderRadius: 150, left: -120,   bottom: -120, opacity: 0.45 },
  keyboardContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, gap: 14 },
  hero:         { borderRadius: 22, paddingHorizontal: 18, paddingVertical: 20 },
  heroTag:      { fontSize: 11, letterSpacing: 1, fontWeight: '700', textTransform: 'uppercase', fontFamily: Fonts.mono },
  heroTitle:    { marginTop: 8, fontSize: 30, fontWeight: '800', fontFamily: Fonts.rounded },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, fontWeight: '500', fontFamily: Fonts.sans },
  heroChipRow:  { marginTop: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroChip:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  heroChipText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
  toggleButton: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  toggleLabel:  { fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans },
  card:         { borderRadius: 22, borderWidth: 1, padding: 18, shadowColor: '#001d4c', shadowOpacity: 0.14, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  cardTitle:    { fontSize: 18, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 14 },
  inputLabel:   { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono },
  passwordLabel:{ marginTop: 14 },
  input:        { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.sans },
  errorText:    { marginTop: 12, fontSize: 13, fontWeight: '600', fontFamily: Fonts.sans },
  loginButton:  { marginTop: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingVertical: 13 },
  loginLabel:   { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
  toggleMode:   { marginTop: 14, alignItems: 'center' },
  toggleModeText: { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
  toggleModeLink: { fontWeight: '700' },
});