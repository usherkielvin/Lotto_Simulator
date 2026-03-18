import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Fonts } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { apiFetch } from '@/hooks/use-api';

interface DrawRecord {
  id: string;
  gameId: string;
  gameName: string;
  numbers: number[];
  stake: number;
  drawDateKey: string;
  placedAt: string;
  status: string;
  matches: number | null;
  payout: number | null;
  officialNumbers: number[] | null;
}

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

function statusInfo(matched: number | null): { label: string; iconName: keyof typeof Ionicons.glyphMap } {
  if (matched === 6)                   return { label: 'JACKPOT',          iconName: 'trophy' };
  if (matched != null && matched >= 4) return { label: `${matched}/6 WIN`, iconName: 'star' };
  if (matched === 3)                   return { label: `${matched}/6 WIN`, iconName: 'ribbon' };
  if (matched != null && matched > 0)  return { label: `${matched}/6`,     iconName: 'ellipse' };
  return                                      { label: 'NO MATCH',          iconName: 'close-circle' };
}

export default function HistoryScreen() {
  const p = usePalette();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const [history, setHistory] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    apiFetch<DrawRecord[]>('/bets/history', { userId: Number(userId) })
      .then(setHistory)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load history.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const totalStaked = history.reduce((s, r) => s + r.stake, 0);
  const totalPayout = history.reduce((s, r) => s + (r.payout ?? 0), 0);
  const bestMatch   = history.length > 0 ? Math.max(...history.map((r) => r.matches ?? 0)) : 0;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop,    { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={[s.hero, { backgroundColor: p.heroBg }]}>
          <Text style={[s.heroTag,   { color: 'rgba(255,255,255,0.70)' }]}>PCSO LOTTO SIMULATOR</Text>
          <Text style={[s.heroTitle, { color: '#ffffff' }]}>Bet History</Text>
          <Text style={[s.heroSub,   { color: 'rgba(255,255,255,0.70)' }]}>All your settled draw tickets</Text>

          <View style={s.statsRow}>
            {[
              { label: 'Total Staked', value: formatPHP(totalStaked) },
              { label: 'Total Payout', value: formatPHP(totalPayout) },
              { label: 'Best Match',   value: `${bestMatch}/6`       },
            ].map(({ label, value }) => (
              <View key={label} style={[s.stat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.70)' }]}>{label}</Text>
                <Text style={[s.statValue, { color: p.accent }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 24 }} color={p.accent} />}
        {!!error && <Text style={[s.emptyText, { color: p.warning }]}>{error}</Text>}
        {!loading && !error && history.length === 0 && (
          <Text style={[s.emptyText, { color: p.textSoft }]}>No settled bets yet. Place your first bet to start tracking outcomes.</Text>
        )}

        {history.map((record) => {
          const { label, iconName } = statusInfo(record.matches);
          const won = (record.payout ?? 0) > 0;

          const ticketBg    = won ? p.accent                 : p.cardBg;
          const cardText    = won ? '#3d2800'                : p.textStrong;
          const cardSubText = won ? 'rgba(61,40,0,0.65)'    : p.textSoft;
          const ballBg      = won ? 'rgba(0,0,0,0.12)'      : p.secondaryButton;
          const ballText    = won ? '#3d2800'                : p.secondaryButtonText;
          const badgeBg     = won ? 'rgba(0,0,0,0.12)'      : p.chipIdle;
          const badgeText   = won ? '#3d2800'                : p.chipIdleText;
          const borderCol   = won ? 'transparent'            : p.cardBorder;
          const winning     = record.officialNumbers ?? [];

          return (
            <View key={record.id} style={[s.card, { backgroundColor: ticketBg, borderColor: borderCol }]}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardGame, { color: cardText    }]}>{record.gameName}</Text>
                  <Text style={[s.cardDate, { color: cardSubText }]}>{record.drawDateKey}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: badgeBg }]}>
                  <Ionicons name={iconName} size={12} color={badgeText} />
                  <Text style={[s.badgeLabel, { color: badgeText }]}>{label}</Text>
                </View>
              </View>

              <View style={s.ballsRow}>
                {record.numbers.map((n) => {
                  const isMatch = (record.matches ?? 0) >= 3 && winning.includes(n);
                  return (
                    <View key={n} style={[s.ball, { backgroundColor: isMatch ? '#3d2800' : ballBg }, isMatch && s.ballHighlight]}>
                      <Text style={[s.ballText, { color: isMatch ? '#f4b400' : ballText, fontWeight: isMatch ? '900' : '700' }]}>{n}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={s.cardFooter}>
                <Text style={[s.footerText, { color: cardSubText }]}>
                  Stake: <Text style={{ color: cardText, fontFamily: Fonts.mono }}>{formatPHP(record.stake)}</Text>
                </Text>
                {won && (
                  <Text style={[s.footerText, { color: cardText, fontWeight: '800' }]}>
                    Payout: <Text style={{ fontFamily: Fonts.mono }}>{formatPHP(record.payout ?? 0)}</Text>
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80,   right: -85,   opacity: 0.55 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.42 },
  scroll: { padding: 16, gap: 14 },
  hero: { borderRadius: 18, padding: 16 },
  heroTag:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono },
  heroTitle: { marginTop: 4, fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded },
  heroSub:   { marginTop: 4, fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
  statsRow:  { marginTop: 12, flexDirection: 'row', gap: 8 },
  stat:      { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  statValue: { marginTop: 4, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  emptyText: { marginTop: 20, textAlign: 'center', fontSize: 13, fontFamily: Fonts.sans, paddingHorizontal: 16 },
  card:    { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  cardGame:{ fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  cardDate:{ fontSize: 12, fontWeight: '500', marginTop: 2, fontFamily: Fonts.sans },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeLabel: { fontSize: 11, fontWeight: '800', fontFamily: Fonts.mono },
  ballsRow: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  ball:          { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ballHighlight: { borderWidth: 2, borderColor: '#3d2800' },
  ballText:      { fontSize: 12, fontFamily: Fonts.mono },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
});
