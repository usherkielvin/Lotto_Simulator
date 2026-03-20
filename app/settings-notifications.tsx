import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    DEPOSIT_ALERTS_ENABLED_KEY,
    DRAW_NOTIFICATIONS_ENABLED_KEY,
    JACKPOT_ALERTS_ENABLED_KEY,
} from '@/constants/settings';
import { Fonts } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

type ToggleItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
};

function parseBool(raw: string | null, fallback: boolean) {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return fallback;
}

export default function NotificationSettingsScreen() {
  const p = usePalette();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [drawNotificationsEnabled, setDrawNotificationsEnabled] = useState(false);
  const [jackpotAlertsEnabled, setJackpotAlertsEnabled] = useState(true);
  const [depositAlertsEnabled, setDepositAlertsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([
      DRAW_NOTIFICATIONS_ENABLED_KEY,
      JACKPOT_ALERTS_ENABLED_KEY,
      DEPOSIT_ALERTS_ENABLED_KEY,
    ])
      .then((pairs) => {
        const asMap = new Map(pairs);
        setDrawNotificationsEnabled(parseBool(asMap.get(DRAW_NOTIFICATIONS_ENABLED_KEY) ?? null, false));
        setJackpotAlertsEnabled(parseBool(asMap.get(JACKPOT_ALERTS_ENABLED_KEY) ?? null, true));
        setDepositAlertsEnabled(parseBool(asMap.get(DEPOSIT_ALERTS_ENABLED_KEY) ?? null, true));
      })
      .catch(() => {
        setFeedback('Using defaults. Could not read saved values.');
      })
      .finally(() => setLoading(false));
  }, []);

  const saveToggle = async (key: string, nextValue: boolean, setter: (next: boolean) => void) => {
    setter(nextValue);
    setFeedback('');

    try {
      await AsyncStorage.setItem(key, nextValue ? '1' : '0');
      setFeedback('Saved');
    } catch {
      setFeedback('Could not save this preference right now.');
    }
  };

  const rows: ToggleItem[] = [
    {
      key: DRAW_NOTIFICATIONS_ENABLED_KEY,
      title: 'Draw reminders',
      subtitle: 'Notifies you before scheduled draws.',
      icon: 'notifications-outline',
      value: drawNotificationsEnabled,
    },
    {
      key: JACKPOT_ALERTS_ENABLED_KEY,
      title: 'Jackpot movement alerts',
      subtitle: 'Alerts you when the demo jackpot value changes.',
      icon: 'sparkles-outline',
      value: jackpotAlertsEnabled,
    },
    {
      key: DEPOSIT_ALERTS_ENABLED_KEY,
      title: 'Wallet funding updates',
      subtitle: 'Shows confirmations for deposits and withdrawals.',
      icon: 'wallet-outline',
      value: depositAlertsEnabled,
    },
  ];

  const handleToggle = async (item: ToggleItem, nextValue: boolean) => {
    if (item.key === DRAW_NOTIFICATIONS_ENABLED_KEY) {
      await saveToggle(item.key, nextValue, setDrawNotificationsEnabled);
      return;
    }

    if (item.key === JACKPOT_ALERTS_ENABLED_KEY) {
      await saveToggle(item.key, nextValue, setJackpotAlertsEnabled);
      return;
    }

    await saveToggle(item.key, nextValue, setDepositAlertsEnabled);
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>Draw Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.infoCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.infoTitle, { color: p.textStrong }]}>Notification controls</Text>
          <Text style={[s.infoCopy, { color: p.textSoft }]}>These settings are saved locally for this device profile.</Text>
        </View>

        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          {loading ? (
            <ActivityIndicator color={p.accent} style={{ paddingVertical: 16 }} />
          ) : (
            rows.map((item, idx) => (
              <View key={item.key}>
                <View style={s.row}>
                  <View style={[s.iconWrap, { backgroundColor: p.chipIdle }]}>
                    <Ionicons name={item.icon} size={16} color={p.chipIdleText} />
                  </View>

                  <View style={s.copyWrap}>
                    <Text style={[s.rowTitle, { color: p.textStrong }]}>{item.title}</Text>
                    <Text style={[s.rowSubtitle, { color: p.textSoft }]}>{item.subtitle}</Text>
                  </View>

                  <Switch
                    value={item.value}
                    onValueChange={(next) => { void handleToggle(item, next); }}
                    disabled={loading}
                    trackColor={{ false: p.chipIdle, true: p.accent }}
                    thumbColor="#ffffff"
                  />
                </View>
                {idx < rows.length - 1 && <View style={[s.divider, { backgroundColor: p.cardBorder }]} />}
              </View>
            ))
          )}
        </View>

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
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  infoTitle: { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  infoCopy: { marginTop: 4, fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans },
  card: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  copyWrap: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  rowSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 42 },
  feedback: { textAlign: 'center', fontSize: 12, fontFamily: Fonts.sans },
});
