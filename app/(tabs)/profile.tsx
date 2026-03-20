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

const PLAYER_SETTINGS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: SettingsRoute }[] = [
  { icon: 'color-palette-outline', label: 'App theme',          route: '/settings-theme' },
  { icon: 'notifications-outline', label: 'Draw notifications', route: '/settings-notifications' },
  { icon: 'receipt-outline',       label: 'Funding History',    route: '/funding-history' },
  { icon: 'lock-closed-outline',   label: 'Privacy & data',     route: '/settings-privacy' },
  { icon: 'help-circle-outline',   label: 'Help & support',     route: '/settings-help' },
];

const ADMIN_SETTINGS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: SettingsRoute }[] = [
  { icon: 'color-palette-outline', label: 'App theme',    route: '/settings-theme' },
  { icon: 'lock-closed-outline',   label: 'Privacy & data', route: '/settings-privacy' },
  { icon: 'help-circle-outline',   label: 'Help & support', route: '/settings-help' },
];

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

function SettingsRow({
  icon, label, onPress, danger, p,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  p: ReturnType<typeof usePalette>;
}) {
  return (
    <Pressable style={s.settingsRow} onPress={onPress}>
      <View style={[s.settingsIconWrap, { backgroundColor: danger ? '#fee2e2' : p.chipIdle }]}>
        <Ionicons name={icon} size={16} color={danger ? '#dc2626' : p.chipIdleText} />
      </View>
      <Text style={[s.settingsLabel, { color: danger ? '#dc2626' : p.textStrong }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={danger ? '#dc2626' : p.textSoft} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session, signOut } = useSession();
  const { balance: liveBalance } = useBalance();
  const userId = session?.userId;
  const isAdmin = session?.role === 'admin';

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
          <Text style={[s.guestSub, { color: p.textSoft }]}>Sign in to access your full profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initial = (profile?.displayName ?? session.displayName ?? 'A')[0].toUpperCase();
  const displayedBalance = liveBalance ?? profile?.balance ?? null;
  const settings = isAdmin ? ADMIN_SETTINGS : PLAYER_SETTINGS;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
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
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[s.playerName, { color: '#ffffff' }]}>{profile?.displayName ?? session.displayName ?? 'Admin'}</Text>
                    {isAdmin && (
                      <View style={[s.adminBadge, { backgroundColor: 'rgba(244,180,0,0.22)' }]}>
                        <Ionicons name="shield-checkmark-outline" size={11} color={p.accent} />
                        <Text style={[s.adminBadgeText, { color: p.accent }]}>Admin</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Player balance row */}
              {!isAdmin && (
                <View style={[s.balanceRow, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Text style={[s.balanceLabel, { color: 'rgba(255,255,255,0.70)' }]}>Demo Balance</Text>
                  <Text style={[s.balanceValue, { color: p.accent }]}>{displayedBalance !== null ? formatPHP(displayedBalance) : 'Unavailable'}</Text>
                  <View style={[s.balanceDivider, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
                  <View style={s.balanceActionsRow}>
                    <Pressable style={[s.balanceActionBtn, { borderColor: 'rgba(255,255,255,0.32)' }]} onPress={() => router.push('/deposit')}>
                      <Ionicons name="arrow-down-circle-outline" size={16} color="#ffffff" />
                      <Text style={[s.balanceActionText, { color: '#ffffff' }]}>Deposit</Text>
                    </Pressable>
                    <Pressable style={[s.balanceActionBtn, { borderColor: 'rgba(255,255,255,0.32)' }]} onPress={() => router.push('/withdraw')}>
                      <Ionicons name="arrow-up-circle-outline" size={16} color="#ffffff" />
                      <Text style={[s.balanceActionText, { color: '#ffffff' }]}>Withdraw</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Admin Quick Actions */}
        {isAdmin && (
          <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={[s.sectionTitle, { color: p.textStrong, marginBottom: 0 }]}>Admin Dashboard</Text>
            </View>

            <View style={s.adminActionsGrid}>
              <Pressable
                style={[s.adminActionBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, borderWidth: 1 }]}
                onPress={() => router.push('/admin' as never)}
              >
                <View style={[s.adminActionIcon, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="add-circle-outline" size={20} color={p.chipIdleText} />
                </View>
                <Text style={[s.adminActionLabel, { color: p.textStrong }]}>Add Result</Text>
              </Pressable>

              <Pressable
                style={[s.adminActionBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, borderWidth: 1 }]}
                onPress={() => router.push('/admin' as never)}
              >
                <View style={[s.adminActionIcon, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="clipboard-outline" size={20} color={p.chipIdleText} />
                </View>
                <Text style={[s.adminActionLabel, { color: p.textStrong }]}>Import Data</Text>
              </Pressable>

              <Pressable
                style={[s.adminActionBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, borderWidth: 1, width: '100%' }]}
                onPress={() => router.push('/admin' as never)}
              >
                <View style={[s.adminActionIcon, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={p.chipIdleText} />
                </View>
                <Text style={[s.adminActionLabel, { color: p.textStrong }]}>Open Admin Panel</Text>
                <Ionicons name="chevron-forward" size={16} color={p.textSoft} style={{ marginLeft: 'auto' }} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: p.textStrong }]}>Settings</Text>
          {settings.map(({ icon, label, route }, i) => (
            <View key={label}>
              <SettingsRow icon={icon} label={label} onPress={() => router.push(route)} p={p} />
              {i < settings.length - 1 && <View style={[s.divider, { backgroundColor: p.cardBorder }]} />}
            </View>
          ))}
          <View style={[s.divider, { backgroundColor: p.cardBorder }]} />
          <SettingsRow icon="exit-outline" label="Sign Out" onPress={handleSignOut} danger p={p} />
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
  adminBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  adminBadgeText:{ fontSize: 11, fontWeight: '700', fontFamily: Fonts.mono },
  balanceRow:    { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  balanceLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  balanceValue:  { fontSize: 22, fontWeight: '800', fontFamily: Fonts.rounded, marginTop: 4 },
  balanceDivider:{ height: StyleSheet.hairlineWidth, marginVertical: 10 },
  balanceActionsRow: { flexDirection: 'row', gap: 8 },
  balanceActionBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', gap: 4 },
  balanceActionText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
  card:          { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 14 },
  adminActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  adminActionBtn:   { width: '48.4%', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center', flexDirection: 'row', gap: 10 },
  adminActionIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  adminActionLabel: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  settingsRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  settingsIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingsLabel:    { flex: 1, fontSize: 14, fontWeight: '600', fontFamily: Fonts.sans },
  divider:          { height: StyleSheet.hairlineWidth, marginLeft: 44 },
  guestCard:  { margin: 16, marginTop: 30, borderRadius: 16, borderWidth: 1, padding: 18, alignItems: 'center' },
  guestTitle: { fontSize: 18, fontWeight: '800', fontFamily: Fonts.rounded, marginTop: 8 },
  guestSub:   { marginTop: 8, textAlign: 'center', fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans },
});
