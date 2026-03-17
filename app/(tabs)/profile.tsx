import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

const STATS = [
  { icon: '🎰', label: 'Total Plays', value: '47'    },
  { icon: '🏆', label: 'Prizes Won',  value: '9'     },
  { icon: '⭐', label: 'Best Match',  value: '4 / 6' },
  { icon: '📊', label: 'Win Rate',    value: '19%'   },
];

const LUCKY_NUMBERS = [7, 14, 22, 33, 40, 49];

const SETTINGS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'notifications-outline', label: 'Draw notifications' },
  { icon: 'color-palette-outline', label: 'App theme'          },
  { icon: 'help-circle-outline',   label: 'Help & support'     },
  { icon: 'lock-closed-outline',   label: 'Privacy & data'     },
];

export default function ProfileScreen() {
  const p = usePalette();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      {/* Orbs */}
      <View style={[s.orbTop,    { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero / avatar */}
        <View style={[s.hero, { backgroundColor: p.heroBg }]}>
          <Text style={[s.heroTag, { color: 'rgba(255,255,255,0.70)' }]}>PCSO LOTTO SIMULATOR</Text>
          <View style={s.avatarRow}>
            <View style={[s.avatar, { backgroundColor: p.accent }]}>
              <Text style={[s.avatarInitial, { color: p.accentText }]}>P</Text>
            </View>
            <View>
              <Text style={[s.playerName, { color: '#ffffff' }]}>Player One</Text>
              <Text style={[s.memberSince, { color: 'rgba(255,255,255,0.70)' }]}>Member since Jan 2026</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            {STATS.map(({ icon, label, value }) => (
              <View key={label} style={[s.stat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={s.statIcon}>{icon}</Text>
                <Text style={[s.statValue, { color: p.accent }]}>{value}</Text>
                <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.70)' }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Lucky numbers */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: p.textStrong }]}>Your Lucky Numbers</Text>
          <View style={s.luckyRow}>
            {LUCKY_NUMBERS.map((n) => (
              <View key={n} style={[s.luckyBall, { backgroundColor: p.secondaryButton }]}>
                <Text style={[s.luckyBallText, { color: p.secondaryButtonText }]}>{n}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: p.textStrong }]}>Settings</Text>
          {SETTINGS.map(({ icon, label }, i) => (
            <View key={label}>
              <Pressable style={s.settingsRow}>
                <View style={[s.settingsIconWrap, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name={icon} size={16} color={p.chipIdleText} />
                </View>
                <Text style={[s.settingsLabel, { color: p.textStrong }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={p.textSoft} />
              </Pressable>
              {i < SETTINGS.length - 1 && (
                <View style={[s.divider, { backgroundColor: p.cardBorder }]} />
              )}
            </View>
          ))}
          <View style={[s.divider, { backgroundColor: p.cardBorder }]} />
          <Pressable style={s.settingsRow} onPress={() => router.replace('/')}>
            <View style={[s.settingsIconWrap, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="exit-outline" size={16} color="#dc2626" />
            </View>
            <Text style={[s.settingsLabel, { color: '#dc2626' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={16} color="#dc2626" />
          </Pressable>
        </View>

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

  hero:    { borderRadius: 18, padding: 16 },
  heroTag: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono, marginBottom: 14 },

  avatarRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar:        { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded },
  playerName:    { fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded },
  memberSince:   { fontSize: 12, fontWeight: '500', marginTop: 2, fontFamily: Fonts.sans },

  statsRow: { flexDirection: 'row', gap: 8 },
  stat:     { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue:{ fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  statLabel:{ fontSize: 10, fontWeight: '600', marginTop: 2, fontFamily: Fonts.sans },

  card:         { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 14 },

  luckyRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  luckyBall:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  luckyBallText:{ fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono },

  settingsRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  settingsIconWrap:{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingsLabel:   { flex: 1, fontSize: 14, fontWeight: '600', fontFamily: Fonts.sans },
  divider:         { height: StyleSheet.hairlineWidth, marginLeft: 44 },
});
