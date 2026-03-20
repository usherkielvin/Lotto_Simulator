import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    ANALYTICS_ENABLED_KEY,
    BIOMETRIC_LOCK_ENABLED_KEY,
    DEPOSIT_ALERTS_ENABLED_KEY,
    DRAW_NOTIFICATIONS_ENABLED_KEY,
    JACKPOT_ALERTS_ENABLED_KEY,
} from '@/constants/settings';
import { Fonts } from '@/constants/theme';
import { setThemeMode } from '@/hooks/theme-mode-store';
import { usePalette } from '@/hooks/use-palette';

function parseBool(raw: string | null, fallback: boolean) {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return fallback;
}

export default function PrivacySettingsScreen() {
  const p = usePalette();
  const router = useRouter();

  const [biometricLockEnabled, setBiometricLockEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    AsyncStorage.multiGet([BIOMETRIC_LOCK_ENABLED_KEY, ANALYTICS_ENABLED_KEY])
      .then((pairs) => {
        const map = new Map(pairs);
        setBiometricLockEnabled(parseBool(map.get(BIOMETRIC_LOCK_ENABLED_KEY) ?? null, false));
        setAnalyticsEnabled(parseBool(map.get(ANALYTICS_ENABLED_KEY) ?? null, true));
      })
      .catch(() => {
        setFeedback('Could not load privacy preferences.');
      });
  }, []);

  const saveBool = async (key: string, nextValue: boolean, setter: (next: boolean) => void) => {
    setter(nextValue);
    setFeedback('');

    try {
      await AsyncStorage.setItem(key, nextValue ? '1' : '0');
      setFeedback('Saved');
    } catch {
      setFeedback('Could not save this preference.');
    }
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset local settings?',
      'This restores notification and privacy toggles, and sets the app theme back to system.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                DRAW_NOTIFICATIONS_ENABLED_KEY,
                JACKPOT_ALERTS_ENABLED_KEY,
                DEPOSIT_ALERTS_ENABLED_KEY,
                BIOMETRIC_LOCK_ENABLED_KEY,
                ANALYTICS_ENABLED_KEY,
              ]);
              await setThemeMode('system');
              setBiometricLockEnabled(false);
              setAnalyticsEnabled(true);
              setFeedback('Settings reset to defaults.');
            } catch {
              setFeedback('Could not reset all preferences.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>Privacy and Data</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: p.chipIdle }]}>
              <Ionicons name="finger-print-outline" size={16} color={p.chipIdleText} />
            </View>
            <View style={s.copyWrap}>
              <Text style={[s.rowTitle, { color: p.textStrong }]}>Biometric lock</Text>
              <Text style={[s.rowSubtitle, { color: p.textSoft }]}>Require biometrics to open your wallet actions.</Text>
            </View>
            <Switch
              value={biometricLockEnabled}
              onValueChange={(next) => saveBool(BIOMETRIC_LOCK_ENABLED_KEY, next, setBiometricLockEnabled)}
              trackColor={{ false: p.chipIdle, true: p.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={[s.divider, { backgroundColor: p.cardBorder }]} />

          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: p.chipIdle }]}>
              <Ionicons name="analytics-outline" size={16} color={p.chipIdleText} />
            </View>
            <View style={s.copyWrap}>
              <Text style={[s.rowTitle, { color: p.textStrong }]}>Anonymous analytics</Text>
              <Text style={[s.rowSubtitle, { color: p.textSoft }]}>Share usage metrics to improve the app experience.</Text>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={(next) => saveBool(ANALYTICS_ENABLED_KEY, next, setAnalyticsEnabled)}
              trackColor={{ false: p.chipIdle, true: p.accent }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <Pressable style={[s.resetBtn, { backgroundColor: '#fee2e2' }]} onPress={resetSettings}>
          <Ionicons name="refresh-outline" size={16} color="#b91c1c" />
          <Text style={s.resetText}>Reset Local Settings</Text>
        </Pressable>

        {!!feedback && <Text style={[s.feedback, { color: p.textSoft }]}>{feedback}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  orbTop: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -85, opacity: 0.45 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.35 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: Fonts.rounded },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  copyWrap: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  rowSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 42 },
  resetBtn: { borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resetText: { color: '#b91c1c', fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  feedback: { textAlign: 'center', fontSize: 12, fontFamily: Fonts.sans },
});
