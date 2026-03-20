import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { useBalance } from '@/hooks/use-balance';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

type ProfileData = {
  userId: number;
  username: string;
  displayName: string;
  memberSince: string;
  balance: number;
};

type SettingsRoute = '/settings-theme' | '/settings-notifications' | '/funding-history' | '/settings-privacy' | '/settings-help';

const SETTINGS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: SettingsRoute }[] = [
  { icon: 'color-palette-outline', label: 'App theme',          route: '/settings-theme' },
  { icon: 'notifications-outline', label: 'Draw notifications', route: '/settings-notifications' },
  { icon: 'receipt-outline',       label: 'Funding History',    route: '/funding-history' },
  { icon: 'lock-closed-outline',   label: 'Privacy & data',     route: '/settings-privacy' },
  { icon: 'help-circle-outline',   label: 'Help & support',     route: '/settings-help' },
];

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

export default function ProfileScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session, signOut } = useSession();
  const { balance: liveBalance } = useBalance();
  const userId = session?.userId;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    apiFetch<ProfileData>('/profile', { userId })
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (!session) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
        <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
        <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />
        <View style={[s.guestCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Ionicons name="person-circle-outline" size={52} color={p.textSoft} />
          <Text style={[s.guestTitle, { color: p.textStrong }]}>Guest Explore Mode</Text>
          <Text style={[s.guestSub, { color: p.textSoft }]}>Sign in to access your full profile and wallet actions.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initial = (profile?.displayName ?? session.displayName ?? 'P')[0].toUpperCase();
  const displayedBalance = liveBalance ?? profile?.balance ?? null;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.hero, { backgroundColor: p.heroBg }]}>
          <Text style={[s.heroTag, { color: 'rgba(255,255,255,0.70)' }]}>LOTTO SIMULATOR</Text>
          {loading ? (
            <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} />
          ) : (
            <>
              <View style={s.avatarRow}>
                <View style={[s.avatar, { backgroundColor: p.accent }]}>
                  <Text style={[s.avatarInitial, { color: p.accentText }]}>{initial}</Text>
                </View>
                <View>
                  <Text style={[s.playerName, { color: '#ffffff' }]}>{profile?.displayName ?? session.displayName ?? 'Player'}</Text>
                  <Text style={[s.memberSince, { color: 'rgba(255,255,255,0.70)' }]}>{profile?.memberSince ?? ''}</Text>
                </View>
              </View>
              <View style={[s.balanceRow, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[s.balanceLabel, { color: 'rgba(255,255,255,0.70)' }]}>Demo Balance</Text>
                <Text style={[s.balanceValue, { color: p.accent }]}>{displayedBalance !== null ? formatPHP(displayedBalance) : 'Unavailable'}</Text>
                <View style={[s.balanceDivider, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
                <View style={s.balanceActionsRow}>
                  <Pressable
                    style={[s.balanceActionBtn, { borderColor: 'rgba(255,255,255,0.32)' }]}
                    onPress={() => router.push('/deposit')}
                  >
                    <Ionicons name="arrow-down-circle-outline" size={16} color="#ffffff" />
                    <Text style={[s.balanceActionText, { color: '#ffffff' }]}>Deposit</Text>
                  </Pressable>
                  <Pressable
                    style={[s.balanceActionBtn, { borderColor: 'rgba(255,255,255,0.32)' }]}
                    onPress={() => router.push('/withdraw')}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={16} color="#ffffff" />
                    <Text style={[s.balanceActionText, { color: '#ffffff' }]}>Withdraw</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: p.textStrong }]}>Settings</Text>
          {SETTINGS.map(({ icon, label, route }) => (
            <View key={label}>
              <Pressable style={s.settingsRow} onPress={() => router.push(route)}>
                <View style={[s.settingsIconWrap, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name={icon} size={16} color={p.chipIdleText} />
                </View>
                <Text style={[s.settingsLabel, { color: p.textStrong }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={p.textSoft} />
              </Pressable>
              <View style={[s.divider, { backgroundColor: p.cardBorder }]} />
            </View>
          ))}
          {session.role === 'admin' && (
            <>
              <Pressable style={s.settingsRow} onPress={() => router.push('/admin')}>
                <View style={[s.settingsIconWrap, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={p.chipIdleText} />
                </View>
                <Text style={[s.settingsLabel, { color: p.textStrong }]}>Admin Panel</Text>
                <Ionicons name="chevron-forward" size={16} color={p.textSoft} />
              </Pressable>
              <View style={[s.divider, { backgroundColor: p.cardBorder }]} />
            </>
          )}
          <Pressable style={s.settingsRow} onPress={handleSignOut}>
            <View style={[s.settingsIconWrap, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="exit-outline" size={16} color="#dc2626" />
            </View>
            <Text style={[s.settingsLabel, { color: '#dc2626' }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={16} color="#dc2626" />
          </Pressable>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80,   right: -85,   opacity: 0.55 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.42 },
  scroll:    { padding: 16, gap: 14 },
  hero:      { borderRadius: 18, padding: 16 },
  heroTag:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono, marginBottom: 14 },
  avatarRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  avatar:        { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded },
  playerName:    { fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded },
  memberSince:   { fontSize: 12, fontWeight: '500', marginTop: 2, fontFamily: Fonts.sans },
  balanceRow:    { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  balanceLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  balanceValue:  { fontSize: 22, fontWeight: '800', fontFamily: Fonts.rounded, marginTop: 4 },
  balanceDivider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  balanceActionsRow: { flexDirection: 'row', gap: 8 },
  balanceActionBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  balanceActionText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
  card:          { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 14 },
  settingsRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  settingsIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingsLabel:    { flex: 1, fontSize: 14, fontWeight: '600', fontFamily: Fonts.sans },
  divider:          { height: StyleSheet.hairlineWidth, marginLeft: 44 },
  guestCard:  { margin: 16, marginTop: 30, borderRadius: 16, borderWidth: 1, padding: 18, alignItems: 'center' },
  guestTitle: { fontSize: 18, fontWeight: '800', fontFamily: Fonts.rounded, marginTop: 8 },
  guestSub:   { marginTop: 8, textAlign: 'center', fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans },
});
