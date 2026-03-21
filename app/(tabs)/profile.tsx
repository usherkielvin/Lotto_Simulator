import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type UnclaimedWin = {
  id: string;
  gameId: string;
  gameName: string;
  drawDateKey: string;
  numbers: number[];
  stake: number;
  payout: number;
  jackpot?: number | null;
  officialNumbers?: number[] | null;
};

type SettingsRoute = '/settings-theme' | '/settings-notifications' | '/payouts' | '/funding-history' | '/settings-privacy' | '/settings-help';

const PLAYER_SETTINGS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: SettingsRoute }[] = [
  { icon: 'color-palette-outline', label: 'App theme',          route: '/settings-theme' },
  { icon: 'notifications-outline', label: 'Draw notifications', route: '/settings-notifications' },
  { icon: 'wallet-outline',        label: 'Payouts & History',  route: '/payouts' },
  { icon: 'receipt-outline',       label: 'Funding History',    route: '/funding-history' },
  { icon: 'lock-closed-outline',   label: 'Privacy & data',     route: '/settings-privacy' },
  { icon: 'help-circle-outline',   label: 'Help & support',     route: '/settings-help' },
];

const ADMIN_SETTINGS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: SettingsRoute }[] = [
  { icon: 'color-palette-outline', label: 'App theme',       route: '/settings-theme' },
  { icon: 'wallet-outline',        label: 'Payouts & History', route: '/payouts' },
  { icon: 'lock-closed-outline',   label: 'Privacy & data',  route: '/settings-privacy' },
  { icon: 'help-circle-outline',   label: 'Help & support',  route: '/settings-help' },
];

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

function formatDate(key: string): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return `${m}/${d}/${y}`;
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
    <Pressable style={s.settingsRow} onPress={onPress} android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
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
  const { balance: liveBalance, refreshBalance } = useBalance();
  const userId = session?.userId;
  const isAdmin = session?.role === 'admin';

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [unclaimed, setUnclaimed] = useState<UnclaimedWin[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const loadData = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const [prof, hist] = await Promise.all([
        apiFetch<ProfileData>('/profile', { userId }),
        apiFetch<UnclaimedWin[]>('/bets/history', { userId }),
      ]);
      setProfile(prof);
      const unclaimedWins = hist.filter(bet => {
        const winning = bet.officialNumbers ?? [];
        if (winning.length === 0) return false;
        const isDigit = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(bet.gameId);
        let matchCount = 0;
        if (isDigit) {
          bet.numbers.forEach((n, idx) => { if (winning[idx] === n) matchCount++; });
        } else {
          bet.numbers.forEach(n => { if (winning.includes(n)) matchCount++; });
        }
        const isExactMatch = isDigit && matchCount === bet.numbers.length;
        const isLottoWin = !isDigit && matchCount >= 3;
        return (isExactMatch || isLottoWin) && (bet.payout === 0 || bet.payout === null);
      });
      setUnclaimed(unclaimedWins);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [userId]);

  const handleClaim = async (betId: string) => {
    if (!userId || claiming) return;
    setClaiming(betId);
    try {
      await apiFetch('/bets/claim', { method: 'POST', userId, body: { betId } });
      await loadData();
      refreshBalance();
    } catch { /* ignore */ }
    finally { setClaiming(null); }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try { await apiFetch('/auth/logout', { method: 'POST', userId }); } catch { /* ignore */ }
            await signOut();
          },
        },
      ],
    );
  };

  if (!session) return null;

  const initial = (profile?.displayName ?? session.displayName ?? 'A')[0].toUpperCase();
  const displayedBalance = liveBalance ?? profile?.balance ?? null;
  const settings = isAdmin ? ADMIN_SETTINGS : PLAYER_SETTINGS;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]} edges={['top']}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero card ── */}
        <View style={[s.hero, { backgroundColor: p.heroBg }]}>
          <Text style={[s.heroTag, { color: 'rgba(255,255,255,0.60)' }]}>LOTTO SIMULATOR</Text>

          {loading ? (
            <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} />
          ) : (
            <>
              {/* Avatar + name */}
              <View style={s.avatarRow}>
                <View style={[s.avatar, { backgroundColor: p.accent }]}>
                  <Text style={[s.avatarInitial, { color: p.accentText }]}>{initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={[s.playerName, { color: '#ffffff' }]} numberOfLines={1}>
                      {profile?.displayName ?? session.displayName ?? 'Admin'}
                    </Text>
                    {isAdmin && (
                      <View style={[s.adminBadge, { backgroundColor: 'rgba(244,180,0,0.22)' }]}>
                        <Ionicons name="shield-checkmark-outline" size={11} color={p.accent} />
                        <Text style={[s.adminBadgeText, { color: p.accent }]}>Admin</Text>
                      </View>
                    )}
                  </View>
                  {!isAdmin && profile?.memberSince && (
                    <Text style={[s.memberSince, { color: 'rgba(255,255,255,0.60)' }]}>
                      Member since {profile.memberSince}
                    </Text>
                  )}
                </View>
              </View>

              {/* Balance + actions — players only */}
              {!isAdmin && (
                <View style={[s.balanceBlock, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
                  {/* Balance label + value */}
                  <View style={s.balanceTop}>
                    <Text style={s.balanceLabel}>Demo Balance</Text>
                    <Text style={[s.balanceValue, { color: p.accent }]}>
                      {displayedBalance !== null ? formatPHP(displayedBalance) : '—'}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View style={[s.balanceDivider, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />

                  {/* Action buttons */}
                  <View style={s.actionRow}>
                    <Pressable
                      style={[s.actionBtn, { backgroundColor: '#059669' }]}
                      onPress={() => router.push('/deposit' as never)}
                    >
                      <View style={s.actionBtnIcon}>
                        <Ionicons name="add" size={16} color="#ffffff" />
                      </View>
                      <Text style={s.actionBtnText}>Deposit</Text>
                    </Pressable>

                    <Pressable
                      style={[s.actionBtn, { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }]}
                      onPress={() => router.push('/withdraw' as never)}
                    >
                      <View style={s.actionBtnIcon}>
                        <Ionicons name="arrow-up" size={16} color="#ffffff" />
                      </View>
                      <Text style={s.actionBtnText}>Withdraw</Text>
                    </Pressable>


                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Unclaimed Winnings ── */}
        {!isAdmin && unclaimed.length > 0 && (
          <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.accent, borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={[s.winIconWrap, { backgroundColor: p.accent + '22' }]}>
                <Ionicons name="trophy" size={20} color={p.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.sectionTitle, { color: p.textStrong, marginBottom: 0 }]}>Collect Winnings</Text>
                <Text style={[s.sectionSubtitle, { color: p.textSoft }]}>
                  {unclaimed.length} unclaimed ticket{unclaimed.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {unclaimed.map((win) => {
                const isDigitGame = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(win.gameId);
                const multiplier = isDigitGame ? (win.stake / 10) : 1;
                let calculatedPrize = 0;
                if (isDigitGame) {
                  calculatedPrize = (win.jackpot ?? 0) * multiplier;
                } else {
                  const winning = win.officialNumbers ?? [];
                  let matches = 0;
                  win.numbers.forEach(n => { if (winning.includes(n)) matches++; });
                  if (matches === 6) calculatedPrize = win.jackpot ?? 0;
                  else if (matches === 5) calculatedPrize = 50000;
                  else if (matches === 4) calculatedPrize = 1200;
                  else if (matches === 3) calculatedPrize = 24;
                }
                const winPayout = (win.payout ?? 0) > 0 ? (win.payout ?? 0) : calculatedPrize;

                return (
                  <View key={win.id} style={[s.winRow, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.winGame, { color: p.textStrong }]}>{win.gameName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={[s.winDate, { color: p.textSoft }]}>{formatDate(win.drawDateKey)}</Text>
                        <View style={[s.winBadge, { backgroundColor: p.chipIdle }]}>
                          <Text style={[s.winBadgeText, { color: p.chipIdleText }]}>Stake {formatPHP(win.stake)}</Text>
                        </View>
                      </View>
                      <Text style={[s.winAmount, { color: p.accent }]}>{formatPHP(winPayout)}</Text>
                    </View>
                    <Pressable
                      style={[s.claimBtn, { backgroundColor: p.accent, opacity: claiming === win.id ? 0.6 : 1 }]}
                      onPress={() => handleClaim(win.id)}
                      disabled={claiming !== null}
                    >
                      {claiming === win.id ? (
                        <ActivityIndicator size="small" color={p.accentText} />
                      ) : (
                        <>
                          <Ionicons name="wallet-outline" size={14} color={p.accentText} />
                          <Text style={[s.claimBtnText, { color: p.accentText }]}>Claim</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Admin Quick Actions ── */}
        {isAdmin && (
          <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <Text style={[s.sectionTitle, { color: p.textStrong }]}>Admin Dashboard</Text>
            <View style={s.adminActionsGrid}>
              <Pressable style={[s.adminActionBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, borderWidth: 1 }]} onPress={() => router.push('/admin' as never)}>
                <View style={[s.adminActionIcon, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="add-circle-outline" size={20} color={p.chipIdleText} />
                </View>
                <Text style={[s.adminActionLabel, { color: p.textStrong }]}>Add Result</Text>
              </Pressable>
              <Pressable style={[s.adminActionBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, borderWidth: 1 }]} onPress={() => router.push('/admin' as never)}>
                <View style={[s.adminActionIcon, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="clipboard-outline" size={20} color={p.chipIdleText} />
                </View>
                <Text style={[s.adminActionLabel, { color: p.textStrong }]}>Import Data</Text>
              </Pressable>
              <Pressable style={[s.adminActionBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, borderWidth: 1, width: '100%' }]} onPress={() => router.push('/admin' as never)}>
                <View style={[s.adminActionIcon, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={p.chipIdleText} />
                </View>
                <Text style={[s.adminActionLabel, { color: p.textStrong }]}>Open Admin Panel</Text>
                <Ionicons name="chevron-forward" size={16} color={p.textSoft} style={{ marginLeft: 'auto' }} />
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Settings ── */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: p.textStrong }]}>Settings</Text>
          {settings.map(({ icon, label, route }, i) => (
            <View key={label}>
              <SettingsRow icon={icon} label={label} onPress={() => router.push(route as never)} p={p} />
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

  // Hero
  hero:          { borderRadius: 20, padding: 18, overflow: 'hidden' },
  heroTag:       { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: Fonts.mono, marginBottom: 16 },
  avatarRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar:        { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: '800', fontFamily: Fonts.rounded },
  playerName:    { fontSize: 19, fontWeight: '800', fontFamily: Fonts.rounded },
  memberSince:   { fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 2 },
  adminBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  adminBadgeText:{ fontSize: 11, fontWeight: '700', fontFamily: Fonts.mono },

  // Balance block
  balanceBlock:  { borderRadius: 14, padding: 14 },
  balanceTop:    { marginBottom: 12 },
  balanceLabel:  { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.60)', fontFamily: Fonts.mono },
  balanceValue:  { fontSize: 28, fontWeight: '900', fontFamily: Fonts.rounded, marginTop: 2 },
  balanceDivider:{ height: StyleSheet.hairlineWidth, marginBottom: 12 },

  // Action buttons
  actionRow:     { flexDirection: 'row', gap: 8 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, paddingVertical: 10 },
  actionBtnIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono, color: '#ffffff' },

  // Cards
  card:          { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 14 },
  sectionSubtitle:{ fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 2 },

  // Unclaimed wins
  winIconWrap:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  winRow:        { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  winGame:       { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  winDate:       { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans },
  winAmount:     { fontSize: 15, fontWeight: '900', fontFamily: Fonts.mono, marginTop: 4 },
  winBadge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  winBadgeText:  { fontSize: 9, fontWeight: '700', fontFamily: Fonts.mono },
  claimBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  claimBtnText:  { fontSize: 13, fontWeight: '800', fontFamily: Fonts.rounded },

  // Admin
  adminActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  adminActionBtn:   { width: '48.4%', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center', flexDirection: 'row', gap: 10 },
  adminActionIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  adminActionLabel: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },

  // Settings list
  settingsRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  settingsIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingsLabel:    { flex: 1, fontSize: 14, fontWeight: '600', fontFamily: Fonts.sans },
  divider:          { height: StyleSheet.hairlineWidth, marginLeft: 44, backgroundColor: 'transparent' },
});
