import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LiquidGlassCard } from '@/components/liquid-glass-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STATS = [
  { icon: '🎰', label: 'Total Plays',  value: '47'   },
  { icon: '🏆', label: 'Prizes Won',   value: '9'    },
  { icon: '⭐', label: 'Best Match',   value: '4 / 6' },
  { icon: '📊', label: 'Win Rate',     value: '19 %'  },
];

const LUCKY_NUMBERS = [7, 14, 22, 33, 40, 49];

const SETTINGS = [
  { icon: '🔔', label: 'Draw notifications' },
  { icon: '🌊', label: 'Liquid glass effects' },
  { icon: '🎨', label: 'App theme' },
  { icon: '❓', label: 'Help & support' },
  { icon: '🔐', label: 'Privacy & data' },
];

function LuckyBall({ n, tint }: { n: number; tint: string }) {
  return (
    <View style={[styles.luckyBall, { borderColor: tint }]}>
      <Text style={[styles.luckyBallText, { color: tint }]}>{n}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tint = Colors[colorScheme ?? 'light'].tint;

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: tint }]}>
            <Text style={styles.avatarInitial}>U</Text>
          </View>
          <ThemedText type="title" style={styles.name}>Player One</ThemedText>
          <ThemedText style={styles.memberSince}>Member since Jan 2026</ThemedText>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {STATS.map(({ icon, label, value }) => (
            <LiquidGlassCard
              key={label}
              style={styles.statCard}
              effect="regular"
              borderRadius={20}
            >
              <Text style={styles.statIcon}>{icon}</Text>
              <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
              <ThemedText style={styles.statLabel}>{label}</ThemedText>
            </LiquidGlassCard>
          ))}
        </View>

        {/* Lucky numbers */}
        <LiquidGlassCard style={styles.section} effect="clear" borderRadius={22}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Your Lucky Numbers</ThemedText>
          <View style={styles.luckyRow}>
            {LUCKY_NUMBERS.map((n) => (
              <LuckyBall key={n} n={n} tint={tint} />
            ))}
          </View>
        </LiquidGlassCard>

        {/* Settings */}
        <ThemedText type="subtitle" style={styles.sectionHeader}>Settings</ThemedText>
        <LiquidGlassCard style={styles.settingsCard} effect="clear" borderRadius={22}>
          {SETTINGS.map(({ icon, label }, index) => (
            <View key={label}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsIcon}>{icon}</Text>
                <ThemedText style={styles.settingsLabel}>{label}</ThemedText>
                <Text style={[styles.chevron, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>›</Text>
              </View>
              {index < SETTINGS.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
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

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarInitial: { color: '#fff', fontSize: 34, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  memberSince: { fontSize: 13, opacity: 0.5 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 18,
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 12, opacity: 0.6 },

  section: { marginBottom: 20 },
  sectionTitle: { marginBottom: 14 },
  luckyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  luckyBall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,163,74,0.08)',
  },
  luckyBallText: { fontSize: 14, fontWeight: '800' },

  sectionHeader: { marginBottom: 10, opacity: 0.7 },
  settingsCard: { marginBottom: 20, paddingVertical: 4 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingsIcon: { fontSize: 18, width: 32 },
  settingsLabel: { flex: 1, fontSize: 15 },
  chevron: { fontSize: 22, fontWeight: '300' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(156,163,175,0.2)',
    marginLeft: 32,
  },
});
