import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { useBalance } from '@/hooks/use-balance';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

type PayoutTx = {
  id: string;
  gameId: string;
  gameName: string;
  drawDateKey: string;
  numbers: number[];
  stake: number;
  payout: number;
  jackpot?: number | null;
  officialNumbers?: number[] | null;
  status: 'won' | 'lost' | 'pending';
  claimedAt?: string | null;
};

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

function formatDate(key: string): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return `${m}/${d}/${y}`;
}

export default function PayoutsScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session } = useSession();
  const { refreshBalance } = useBalance();
  const userId = session?.userId;

  const [history, setHistory] = useState<PayoutTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await apiFetch<PayoutTx[]>('/bets/history', { userId });
      setHistory(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const { unclaimed, claimed } = useMemo(() => {
    const unclaimedList: PayoutTx[] = [];
    const claimedList: PayoutTx[] = [];

    history.forEach(bet => {
      const winning = bet.officialNumbers ?? [];
      if (winning.length === 0) return;

      const isDigit = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(bet.gameId);
      let matchCount = 0;
      if (isDigit) {
        bet.numbers.forEach((n, idx) => { if (winning[idx] === n) matchCount++; });
      } else {
        bet.numbers.forEach(n => { if (winning.includes(n)) matchCount++; });
      }

      const isExactMatch = isDigit && matchCount === bet.numbers.length;
      const isLottoWin = !isDigit && matchCount >= 3;
      
      if (isExactMatch || isLottoWin) {
        if (bet.payout > 0) {
          claimedList.push(bet);
        } else {
          unclaimedList.push(bet);
        }
      }
    });

    return { 
      unclaimed: unclaimedList.sort((a, b) => b.drawDateKey.localeCompare(a.drawDateKey)), 
      claimed: claimedList.sort((a, b) => b.drawDateKey.localeCompare(a.drawDateKey)) 
    };
  }, [history]);

  const handleClaim = async (betId: string) => {
    if (!userId || claiming) return;
    setClaiming(betId);
    try {
      await apiFetch('/bets/claim', {
        method: 'POST',
        userId,
        body: { betId },
      });
      await loadData();
      refreshBalance(); // Update balance after claim
    } catch { /* ignore */ }
    finally { setClaiming(null); }
  };

  const renderWinRow = (win: PayoutTx, isClaimed: boolean) => {
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

    const winPayout = isClaimed ? win.payout : calculatedPrize;

    return (
      <View key={win.id} style={[s.winRow, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.winGame, { color: p.textStrong }]}>{win.gameName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={[s.winDate, { color: p.textSoft }]}>{formatDate(win.drawDateKey)}</Text>
            <View style={[s.winBadge, { backgroundColor: p.chipIdle }]}>
              <Text style={[s.winBadgeText, { color: p.chipIdleText }]}>Stake {formatPHP(win.stake)}</Text>
            </View>
          </View>
          <Text style={[s.winAmount, { color: isClaimed ? p.textSoft : p.accent }]}>{formatPHP(winPayout)}</Text>
        </View>
        
        {!isClaimed ? (
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
        ) : (
          <View style={[s.claimedBadge, { backgroundColor: p.chipIdle }]}>
            <Ionicons name="checkmark-circle" size={14} color={p.chipIdleText} />
            <Text style={[s.claimedText, { color: p.chipIdleText }]}>Claimed</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>Payouts & History</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading && history.length === 0 ? (
          <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Unclaimed Section */}
            <View style={s.sectionHeader}>
              <Ionicons name="gift-outline" size={18} color={p.accent} />
              <Text style={[s.sectionTitle, { color: p.textStrong }]}>Available to Collect</Text>
            </View>
            
            {unclaimed.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
                <Text style={[s.emptyText, { color: p.textSoft }]}>No unclaimed winnings found.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {unclaimed.map(win => renderWinRow(win, false))}
              </View>
            )}

            {/* Claimed History */}
            <View style={[s.sectionHeader, { marginTop: 24 }]}>
              <Ionicons name="time-outline" size={18} color={p.textSoft} />
              <Text style={[s.sectionTitle, { color: p.textStrong }]}>Claim History</Text>
            </View>

            {claimed.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
                <Text style={[s.emptyText, { color: p.textSoft }]}>Your claim history will appear here.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {claimed.map(win => renderWinRow(win, true))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  orbTop: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -85, opacity: 0.45 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.35 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: Fonts.rounded },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  winRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1 },
  winGame: { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  winDate: { fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 2 },
  winBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  winBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: Fonts.mono },
  winAmount: { fontSize: 16, fontWeight: '900', fontFamily: Fonts.mono, marginTop: 6 },
  claimBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  claimBtnText: { fontSize: 13, fontWeight: '800', fontFamily: Fonts.rounded },
  claimedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  claimedText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', borderStyle: 'dashed' },
  emptyText: { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
});
