import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LiquidGlassCard } from '@/components/liquid-glass-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface DrawRecord {
  id: string;
  date: string;
  numbers: number[];
  matched: number;
}

const HISTORY: DrawRecord[] = [
  { id: '1', date: 'Mar 15, 2026', numbers: [7, 14, 23, 31, 42, 6],  matched: 2 },
  { id: '2', date: 'Mar 12, 2026', numbers: [3, 11, 19, 28, 37, 45], matched: 0 },
  { id: '3', date: 'Mar 9, 2026',  numbers: [5, 17, 22, 33, 41, 8],  matched: 3 },
  { id: '4', date: 'Mar 6, 2026',  numbers: [2, 9,  20, 30, 40, 49], matched: 1 },
  { id: '5', date: 'Mar 3, 2026',  numbers: [12, 18, 25, 34, 43, 4], matched: 4 },
  { id: '6', date: 'Feb 28, 2026', numbers: [1, 16, 24, 36, 44, 10], matched: 0 },
  { id: '7', date: 'Feb 25, 2026', numbers: [8, 13, 21, 29, 38, 47], matched: 2 },
  { id: '8', date: 'Feb 22, 2026', numbers: [6, 15, 26, 35, 46, 3],  matched: 1 },
];

function matchLabel(matched: number) {
  if (matched === 6) return { label: 'JACKPOT!',    bg: '#16a34a', text: '#fff' };
  if (matched >= 4)  return { label: `${matched}/6 Match`, bg: '#15803d', text: '#fff' };
  if (matched === 3) return { label: `${matched}/6 Match`, bg: '#166534', text: '#fff' };
  if (matched > 0)   return { label: `${matched}/6`,       bg: 'rgba(100,116,139,0.25)', text: '#94a3b8' };
  return               { label: 'No match',                bg: 'rgba(239,68,68,0.1)',   text: '#f87171' };
}

function MiniDot({ n }: { n: number }) {
  return (
    <View style={styles.dot}>
      <Text style={styles.dotText}>{n}</Text>
    </View>
  );
}

function DrawCard({ record }: { record: DrawRecord }) {
  const badge = matchLabel(record.matched);
  return (
    <LiquidGlassCard style={styles.card} effect="clear" borderRadius={20}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.dateText}>{record.date}</ThemedText>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
      <View style={styles.dotsRow}>
        {record.numbers.map((n) => (
          <MiniDot key={n} n={n} />
        ))}
      </View>
    </LiquidGlassCard>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;

  const totalPlays  = HISTORY.length;
  const totalWins   = HISTORY.filter((d) => d.matched >= 3).length;
  const bestMatch   = Math.max(...HISTORY.map((d) => d.matched));

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>History</ThemedText>
          <ThemedText style={styles.subtitle}>Your past draws</ThemedText>
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          {[
            { value: String(totalPlays),    label: 'Plays'      },
            { value: String(totalWins),     label: 'Prizes'     },
            { value: `${bestMatch}/6`,      label: 'Best match' },
          ].map(({ value, label }) => (
            <LiquidGlassCard key={label} style={styles.summaryCard} effect="regular" borderRadius={18}>
              <Text style={[styles.summaryValue, { color: tint }]}>{value}</Text>
              <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
            </LiquidGlassCard>
          ))}
        </View>

        {/* Draw list */}
        {HISTORY.map((record) => (
          <DrawCard key={record.id} record={record} />
        ))}

        {/* Bottom spacer for floating tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 64 },
  header: { marginBottom: 24 },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontSize: 16, opacity: 0.6, marginTop: 4 },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },

  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: { fontSize: 14, opacity: 0.7 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(22,163,74,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(22,163,74,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { color: '#4ade80', fontSize: 13, fontWeight: '700' },
});
