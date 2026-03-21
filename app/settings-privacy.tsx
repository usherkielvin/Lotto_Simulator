import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
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

const CREDS_KEY = 'lotto_saved_creds';

function parseBool(raw: string | null, fallback: boolean) {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return fallback;
}

export default function PrivacySettingsScreen() {
  const p = usePalette();
  const router = useRouter();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [biometricType, setBiometricType] = useState<'Face ID' | 'Fingerprint' | 'Biometrics'>('Biometrics');

  useEffect(() => {
    (async () => {
      // Check hardware support
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(hasHardware && isEnrolled);

      // Detect type for label
      if (hasHardware && isEnrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        }
      }

      // Load saved settings
      const pairs = await AsyncStorage.multiGet([BIOMETRIC_LOCK_ENABLED_KEY, ANALYTICS_ENABLED_KEY]);
      const map = new Map(pairs);
      setBiometricEnabled(parseBool(map.get(BIOMETRIC_LOCK_ENABLED_KEY) ?? null, false));
      setAnalyticsEnabled(parseBool(map.get(ANALYTICS_ENABLED_KEY) ?? null, true));
    })().catch(() => setFeedback('Could not load privacy preferences.'));
  }, []);

  // Called when user flips the biometric toggle
  const handleBiometricToggle = async (next: boolean) => {
    if (next) {
      // Check hardware first
      if (!biometricSupported) {
        setFeedback(`${biometricType} is not available on this device.`);
        return;
      }
      // Check saved creds exist
      const saved = await SecureStore.getItemAsync(CREDS_KEY);
      if (!saved) {
        setFeedback('Log in with your password first to enable biometric unlock.');
        return;
      }
      // Show confirmation modal
      setShowConfirmModal(true);
    } else {
      // Turning off — just save
      await AsyncStorage.setItem(BIOMETRIC_LOCK_ENABLED_KEY, '0');
      setBiometricEnabled(false);
      setFeedback('Biometric unlock disabled.');
    }
  };

  // User confirmed in modal — run actual biometric prompt to verify
  const confirmEnableBiometric = async () => {
    setShowConfirmModal(false);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricType} for Lotto Simulator`,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        await AsyncStorage.setItem(BIOMETRIC_LOCK_ENABLED_KEY, '1');
        setBiometricEnabled(true);
        setFeedback(`${biometricType} unlock enabled.`);
      } else {
        setFeedback('Verification cancelled. Biometric unlock not enabled.');
      }
    } catch {
      setFeedback('Biometric verification failed.');
    }
  };

  const saveBool = async (key: string, nextValue: boolean, setter: (v: boolean) => void) => {
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
              setBiometricEnabled(false);
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

      {/* ── Confirmation Modal ── */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <View style={[s.modalIconWrap, { backgroundColor: p.accent + '22' }]}>
              <Ionicons name="finger-print-outline" size={32} color={p.accent} />
            </View>
            <Text style={[s.modalTitle, { color: p.textStrong }]}>Use {biometricType}?</Text>
            <Text style={[s.modalBody, { color: p.textSoft }]}>
              Next time you open the app, you can sign in instantly using {biometricType} instead of your password.
            </Text>
            <Pressable
              style={[s.modalPrimary, { backgroundColor: p.accent }]}
              onPress={confirmEnableBiometric}>
              <Ionicons name="finger-print-outline" size={18} color={p.accentText} />
              <Text style={[s.modalPrimaryText, { color: p.accentText }]}>Enable {biometricType}</Text>
            </Pressable>
            <Pressable style={s.modalCancel} onPress={() => setShowConfirmModal(false)}>
              <Text style={[s.modalCancelText, { color: p.textSoft }]}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>Privacy and Data</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          {/* Biometric row */}
          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: biometricEnabled ? p.accent + '22' : p.chipIdle }]}>
              <Ionicons
                name="finger-print-outline"
                size={16}
                color={biometricEnabled ? p.accent : p.chipIdleText}
              />
            </View>
            <View style={s.copyWrap}>
              <Text style={[s.rowTitle, { color: p.textStrong }]}>{biometricType} unlock</Text>
              <Text style={[s.rowSubtitle, { color: p.textSoft }]}>
                {biometricSupported
                  ? `Sign in with ${biometricType} instead of your password.`
                  : `${biometricType} is not available on this device.`}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricSupported}
              trackColor={{ false: p.chipIdle, true: p.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={[s.divider, { backgroundColor: p.cardBorder }]} />

          {/* Analytics row */}
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
  root:       { flex: 1 },
  orbTop:     { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -85, opacity: 0.45 },
  orbBottom:  { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.35 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 17, fontWeight: '800', fontFamily: Fonts.rounded },
  scroll:     { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card:       { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  iconWrap:   { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  copyWrap:   { flex: 1 },
  rowTitle:   { fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  rowSubtitle:{ marginTop: 2, fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans },
  divider:    { height: 1, marginLeft: 42 },
  resetBtn:   { borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resetText:  { color: '#b91c1c', fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  feedback:   { textAlign: 'center', fontSize: 12, fontFamily: Fonts.sans },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalCard:      { width: '100%', borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center', gap: 10 },
  modalIconWrap:  { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalTitle:     { fontSize: 20, fontWeight: '900', fontFamily: Fonts.rounded, textAlign: 'center' },
  modalBody:      { fontSize: 14, lineHeight: 21, fontFamily: Fonts.sans, textAlign: 'center' },
  modalPrimary:   { marginTop: 8, width: '100%', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalPrimaryText:{ fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  modalCancel:    { paddingVertical: 10 },
  modalCancelText:{ fontSize: 14, fontWeight: '600', fontFamily: Fonts.sans },
});
