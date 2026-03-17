import React, { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { LiquidGlassCard } from '@/components/liquid-glass-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BALL_COLORS = [
  '#16a34a', '#15803d', '#166534',
  '#4ade80', '#22c55e', '#86efac',
];

function pickSix(): number[] {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  const picked: number[] = [];
  while (picked.length < 6) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.sort((a, b) => a - b);
}

function NumberBall({ num, index }: { num: number; index: number }) {
  return (
    <View style={[styles.ball, { backgroundColor: BALL_COLORS[index % BALL_COLORS.length] }]}>
      <Text style={styles.ballText}>{num}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;
  const [numbers, setNumbers] = useState<number[]>([]);
  const [played, setPlayed] = useState(false);

  function quickPick() {
    setNumbers(pickSix());
    setPlayed(false);
  }

  function playTicket() {
    if (numbers.length === 6) setPlayed(true);
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>🎰 Lotto</ThemedText>
          <ThemedText style={styles.subtitle}>Pick your lucky numbers</ThemedText>
        </View>

        {/* Ticket Card */}
        <LiquidGlassCard style={styles.ticketCard} effect="regular" borderRadius={28}>
          <ThemedText type="subtitle" style={styles.ticketLabel}>Your Ticket</ThemedText>

          <View style={styles.ballRow}>
            {numbers.length === 6
              ? numbers.map((n, i) => <NumberBall key={n} num={n} index={i} />)
              : Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={[styles.ball, styles.emptyBall]}>
                    <Text style={styles.emptyBallText}>?</Text>
                  </View>
                ))}
          </View>

          {played && (
            <View style={[styles.playedBadge, { borderColor: tint }]}>
              <Text style={[styles.playedText, { color: tint }]}>Ticket Submitted!</Text>
            </View>
          )}
        </LiquidGlassCard>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnSecondary,
              pressed && styles.pressed,
            ]}
            onPress={quickPick}
          >
            <Text style={styles.btnSecondaryText}>⚡ Quick Pick</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: numbers.length < 6 ? '#6B7280' : tint },
              pressed && styles.pressed,
            ]}
            onPress={playTicket}
            disabled={numbers.length < 6}
          >
            <Text style={styles.btnText}>▶  Play</Text>
          </Pressable>
        </View>

        {/* Info Cards */}
        <LiquidGlassCard style={styles.infoCard} effect="clear" borderRadius={20}>
          <ThemedText type="defaultSemiBold">How to play</ThemedText>
          <ThemedText style={styles.infoText}>
            Tap Quick Pick to get 6 random numbers (1–49), then press Play to submit your ticket.
            Match all 6 to hit the jackpot!
          </ThemedText>
        </LiquidGlassCard>

        <LiquidGlassCard style={styles.infoCard} effect="clear" borderRadius={20}>
          <ThemedText type="defaultSemiBold">💰 Prize tiers</ThemedText>
          <View style={styles.prizeTable}>
            {[
              ['6 / 6', 'Jackpot'],
              ['5 / 6', 'Major prize'],
              ['4 / 6', 'Minor prize'],
              ['3 / 6', 'Free play'],
            ].map(([match, label]) => (
              <View key={match} style={styles.prizeRow}>
                <Text style={[styles.prizeMatch, { color: tint }]}>{match}</Text>
                <ThemedText style={styles.prizeLabel}>{label}</ThemedText>
              </View>
            ))}
          </View>
        </LiquidGlassCard>

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

  ticketCard: { marginBottom: 20 },
  ticketLabel: { marginBottom: 16, textAlign: 'center' },
  ballRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ball: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  ballText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBall: {
    backgroundColor: 'rgba(156,163,175,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(156,163,175,0.4)',
    borderStyle: 'dashed',
  },
  emptyBallText: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '700',
  },
  playedBadge: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'center',
  },
  playedText: { fontSize: 13, fontWeight: '700' },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: 'rgba(156,163,175,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(156,163,175,0.3)',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondaryText: { color: '#9CA3AF', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },

  infoCard: { marginBottom: 14 },
  infoText: { marginTop: 6, opacity: 0.7, lineHeight: 20 },
  prizeTable: { marginTop: 8, gap: 8 },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prizeMatch: { fontSize: 15, fontWeight: '800', width: 48 },
  prizeLabel: { fontSize: 14, opacity: 0.75 },
});

