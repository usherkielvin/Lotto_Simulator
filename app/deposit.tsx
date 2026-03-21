import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { useBalance } from '@/hooks/use-balance';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const MIN_DEPOSIT = 50;

function parsePesoAmount(raw: string) {
  const normalized = raw.trim();
  if (!normalized) {
    return { value: null as number | null, error: 'Enter a deposit amount.' };
  }

  if (!/^\d+$/.test(normalized)) {
    return { value: null as number | null, error: 'Use whole numbers only.' };
  }

  const value = Number(normalized);
  if (!Number.isSafeInteger(value)) {
    return { value: null as number | null, error: 'Amount is too large.' };
  }

  if (value < MIN_DEPOSIT) {
    return { value: null as number | null, error: 'Minimum deposit is ₱50.' };
  }

  return { value, error: '' };
}

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

export default function DepositScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session } = useSession();
  const { setBalanceValue, refreshBalance } = useBalance();
  const userId = session?.userId;

  const [amount, setAmount] = useState('');
  const [busy,   setBusy]   = useState(false);
  const [msg,    setMsg]    = useState('');
  const [isErr,  setIsErr]  = useState(false);
  const [newBal, setNewBal] = useState<number | null>(null);

  const confirm = async () => {
    const parsed = parsePesoAmount(amount);

    if (!userId) {
      setIsErr(true);
      setMsg('Session expired. Please sign in again.');
      return;
    }

    if (parsed.error || parsed.value === null) {
      setIsErr(true);
      setMsg(parsed.error);
      return;
    }

    const val = parsed.value;

    Alert.alert(
      'Confirm Deposit',
      `Add ${formatPHP(val)} to your demo balance?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deposit',
          onPress: async () => {
            setBusy(true); setMsg(''); setIsErr(false);
            try {
              const res = await apiFetch<{ balance: number }>('/bets/balance', {
                method: 'POST', userId, body: { type: 'deposit', amount: val },
              });
              const updatedBalance = Number(res.balance);
              setNewBal(updatedBalance);
              setBalanceValue(updatedBalance);
              refreshBalance().catch(() => {});
              setAmount('');
              setIsErr(false);
              setMsg(`Successfully deposited ${formatPHP(val)}.`);
            } catch (e: unknown) {
              setIsErr(true);
              setMsg(e instanceof Error ? e.message : 'Deposit failed.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop,    { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>Deposit</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Icon + label */}
        <View style={[s.iconWrap, { backgroundColor: '#d1fae5' }]}>
          <Ionicons name="arrow-down-circle-outline" size={40} color="#059669" />
        </View>
        <Text style={[s.title, { color: p.textStrong }]}>Add Demo Credits</Text>
        <Text style={[s.sub, { color: p.textSoft }]}>Minimum deposit is ₱50</Text>

        {/* New balance after success */}
        {newBal !== null && (
          <View style={[s.balCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <Text style={[s.balLabel, { color: p.textSoft }]}>New Balance</Text>
            <Text style={[s.balValue, { color: '#059669' }]}>{formatPHP(newBal)}</Text>
          </View>
        )}

        {/* Quick amounts */}
        <View style={s.quickRow}>
          {QUICK_AMOUNTS.map((a) => (
            <Pressable
              key={a}
              onPress={() => { setAmount(String(a)); setMsg(''); }}
              style={[s.quickChip, { backgroundColor: amount === String(a) ? p.chipActive : p.chipIdle }]}
            >
              <Text style={[s.quickChipText, { color: amount === String(a) ? p.accentText : p.chipIdleText }]}>
                {formatPHP(a)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Input */}
        <View style={[s.inputWrap, { backgroundColor: p.cardBg, borderColor: isErr ? '#dc2626' : p.cardBorder }]}>
          <Text style={[s.inputPrefix, { color: p.textSoft }]}>₱</Text>
          <TextInput
            style={[s.input, { color: p.textStrong }]}
            placeholder="0"
            placeholderTextColor={p.textSoft}
            keyboardType="number-pad"
            value={amount}
            onChangeText={(v) => {
              setAmount(v.replace(/[^\d]/g, ''));
              setMsg('');
              setIsErr(false);
            }}
          />
        </View>

        {!!msg && (
          <Text style={[s.msg, { color: isErr ? '#dc2626' : '#059669' }]}>{msg}</Text>
        )}

        <Pressable
          onPress={confirm}
          disabled={busy || !amount.trim()}
          style={[s.confirmBtn, { backgroundColor: '#059669', opacity: busy ? 0.6 : 1 }]}
        >
          {busy
            ? <ActivityIndicator color="#ffffff" />
            : <Text style={s.confirmBtnText}>Confirm Deposit</Text>
          }
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80,   right: -85,   opacity: 0.45 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.35 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 17, fontWeight: '800', fontFamily: Fonts.rounded },
  scroll:    { padding: 24, gap: 16, alignItems: 'center' },
  iconWrap:  { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:     { fontSize: 22, fontWeight: '800', fontFamily: Fonts.rounded },
  sub:       { fontSize: 13, fontFamily: Fonts.sans, marginBottom: 8 },
  balCard:   { width: '100%', borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center' },
  balLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  balValue:  { fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded, marginTop: 4 },
  quickRow:  { flexDirection: 'row', gap: 8, width: '100%' },
  quickChip: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  quickChipText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
  inputWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 4 },
  inputPrefix:{ fontSize: 20, fontWeight: '700', fontFamily: Fonts.mono, marginRight: 6 },
  input:     { flex: 1, fontSize: 28, fontWeight: '800', fontFamily: Fonts.rounded, paddingVertical: 10 },
  msg:       { fontSize: 13, fontFamily: Fonts.sans, textAlign: 'center' },
  confirmBtn:{ width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  confirmBtnText: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.mono, color: '#ffffff' },
});
