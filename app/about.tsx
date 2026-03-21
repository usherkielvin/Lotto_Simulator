import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

const VERSION = '1.0.0';
const BUILT   = 'March 2026';

const TECH_STACK = [
  { icon: 'phone-portrait-outline', label: 'React Native + Expo' },
  { icon: 'layers-outline',         label: 'Expo Router (file-based nav)' },
  { icon: 'server-outline',         label: 'Spring Boot 3 (Java 21)' },
  { icon: 'disc-outline',           label: 'MySQL · Spring Data JPA' },
  { icon: 'shield-checkmark-outline', label: 'BCrypt · Spring Security' },
];

const DISCLAIMER_POINTS = [
  'This app is a simulation only. No real money is involved.',
  'Results are based on official PCSO draw data for educational purposes.',
  'Lotto Simulator does not promote or encourage gambling.',
  'Odds and prize computations are approximations and may not reflect actual PCSO payouts.',
  'The developer is not affiliated with PCSO or any government lottery body.',
];

export default function AboutScreen() {
  const p = usePalette();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop,    { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>About</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── App identity ── */}
        <View style={[s.heroBanner, { backgroundColor: p.heroBg }]}>
          <View style={[s.appIconWrap, { backgroundColor: p.accent }]}>
            <Ionicons name="dice-outline" size={32} color={p.accentText} />
          </View>
          <Text style={s.appName}>Lotto Simulator</Text>
          <Text style={s.appTagline}>Practice your picks. No real money, all the fun.</Text>
          <View style={s.badgeRow}>
            <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={s.badgeText}>v{VERSION}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={s.badgeText}>{BUILT}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={s.badgeText}>PCSO Games</Text>
            </View>
          </View>
        </View>

        {/* ── Developer ── */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.sectionLabel, { color: p.textSoft }]}>Developer</Text>
          <View style={s.devRow}>
            <View style={[s.devAvatar, { backgroundColor: p.secondaryButton }]}>
              <Text style={s.devAvatarText}>U</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.devName, { color: p.textStrong }]}>Usher Kielvin Ponce</Text>
              <Text style={[s.devRole, { color: p.textSoft }]}>Full-Stack Developer · Designer</Text>
            </View>
          </View>
          <View style={[s.divider, { backgroundColor: p.cardBorder }]} />
          <View style={s.devDetails}>
            <View style={s.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={p.textSoft} />
              <Text style={[s.detailText, { color: p.textSoft }]}>Built in {BUILT}</Text>
            </View>
            <View style={s.detailRow}>
              <Ionicons name="location-outline" size={14} color={p.textSoft} />
              <Text style={[s.detailText, { color: p.textSoft }]}>Philippines</Text>
            </View>
            <View style={s.detailRow}>
              <Ionicons name="code-slash-outline" size={14} color={p.textSoft} />
              <Text style={[s.detailText, { color: p.textSoft }]}>Solo project — design, frontend & backend</Text>
            </View>
          </View>
        </View>

        {/* ── Tech stack ── */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.sectionLabel, { color: p.textSoft }]}>Built With</Text>
          {TECH_STACK.map(({ icon, label }, i) => (
            <View key={label}>
              <View style={s.techRow}>
                <View style={[s.techIcon, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={15} color={p.chipIdleText} />
                </View>
                <Text style={[s.techLabel, { color: p.textStrong }]}>{label}</Text>
              </View>
              {i < TECH_STACK.length - 1 && <View style={[s.divider, { backgroundColor: p.cardBorder }]} />}
            </View>
          ))}
        </View>

        {/* ── Disclaimer ── */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <View style={s.disclaimerHeader}>
            <View style={[s.disclaimerIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="warning-outline" size={16} color="#d97706" />
            </View>
            <Text style={[s.sectionLabel, { color: p.textSoft, marginBottom: 0 }]}>Disclaimer</Text>
          </View>
          <View style={{ gap: 10, marginTop: 12 }}>
            {DISCLAIMER_POINTS.map((point, i) => (
              <View key={i} style={s.disclaimerRow}>
                <View style={[s.bullet, { backgroundColor: p.chipIdle }]} />
                <Text style={[s.disclaimerText, { color: p.textSoft }]}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Open source note ── */}
        <Pressable
          style={[s.githubBtn, { backgroundColor: p.chipIdle }]}
          onPress={() => Linking.openURL('mailto:ponce.usher@gmail.com').catch(() => {})}
        >
          <Ionicons name="mail-outline" size={18} color={p.chipIdleText} />
          <Text style={[s.githubText, { color: p.chipIdleText }]}>ponce.usher@gmail.com</Text>
        </Pressable>

        <Text style={[s.copyright, { color: p.textSoft }]}>
          © {BUILT} Usher Kielvin Ponce. All rights reserved.{'\n'}
          Lotto Simulator is not affiliated with PCSO.
        </Text>

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
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: Fonts.rounded },
  scroll:    { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  // Hero
  heroBanner:  { borderRadius: 18, padding: 22, alignItems: 'center', gap: 8 },
  appIconWrap: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  appName:     { fontSize: 22, fontWeight: '900', fontFamily: Fonts.rounded, color: '#ffffff' },
  appTagline:  { fontSize: 13, fontFamily: Fonts.sans, color: 'rgba(255,255,255,0.70)', textAlign: 'center' },
  badgeRow:    { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' },
  badge:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:   { fontSize: 11, fontWeight: '700', fontFamily: Fonts.mono, color: 'rgba(255,255,255,0.85)' },

  // Card
  card:        { borderRadius: 14, borderWidth: 1, padding: 14, gap: 0 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: Fonts.mono, marginBottom: 12 },
  divider:     { height: StyleSheet.hairlineWidth, marginVertical: 0 },

  // Developer
  devRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  devAvatar:   { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  devAvatarText:{ fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded, color: '#ffffff' },
  devName:     { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  devRole:     { fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 },
  devDetails:  { gap: 8, marginTop: 12 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText:  { fontSize: 13, fontFamily: Fonts.sans },

  // Tech stack
  techRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  techIcon:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  techLabel:   { fontSize: 13, fontWeight: '600', fontFamily: Fonts.sans },

  // Disclaimer
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclaimerIcon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  disclaimerRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet:           { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  disclaimerText:   { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans },

  // Footer
  githubBtn:   { borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  githubText:  { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono },
  copyright:   { textAlign: 'center', fontSize: 11, fontFamily: Fonts.sans, lineHeight: 17 },
});
