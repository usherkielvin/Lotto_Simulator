import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiFetch } from '@/hooks/use-api';

type BetMode = 'manual' | 'lucky';

type LottoGame = {
  id: string;
  name: string;
  maxNumber: number;
  drawTime: string;
};

type Palette = {
  screenBg: string; cardBg: string; cardBorder: string; heroBg: string;
  heroText: string; heroTextSoft: string; heroStageBg: string;
  textStrong: string; textSoft: string; accent: string; accentText: string;
  secondaryButton: string; secondaryButtonText: string;
  chipIdle: string; chipIdleText: string; chipActive: string; chipActiveText: string;
  numberIdle: string; numberIdleText: string; numberSelected: string; numberSelectedText: string;
  ticketPending: string; ticketWon: string; ticketLost: string;
  orbOne: string; orbTwo: string; stageBg: string; payout: string; warning: string;
};

function pad2(v: number) { return v.toString().padStart(2, '0'); }
function toLocalDateKey(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function drawDateFromKey(key: string) {
  const [y,m,d] = key.split('-').map(Number);
  return new Date(y, m-1, d, 21, 0, 0, 0);
}
function getNextDrawAt(ref: Date) {
  const draw = new Date(ref); draw.setHours(21,0,0,0);
  if (ref.getTime() >= draw.getTime()) draw.setDate(draw.getDate()+1);
  return draw;
}
function getLatestSettledDrawAt(ref: Date) {
  const draw = new Date(ref); draw.setHours(21,0,0,0);
  if (ref.getTime() < draw.getTime()) draw.setDate(draw.getDate()-1);
  return draw;
}
function getCountdownLabel(target: Date, now: Date) {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return 'Draw lock in progress';
  const total = Math.floor(ms/1000);
  return `${pad2(Math.floor(total/3600))}:${pad2(Math.floor((total%3600)/60))}:${pad2(total%60)}`;
}
function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) { hash ^= seed.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return () => {
    hash += hash << 13; hash ^= hash >>> 7; hash += hash << 3; hash ^= hash >>> 17; hash += hash << 5;
    return (hash >>> 0) / 4294967295;
  };
}
function pickUniqueNumbers(max: number, count: number, rand: () => number = Math.random) {
  const picked = new Set<number>();
  while (picked.size < count) picked.add(Math.floor(rand()*max)+1);
  return Array.from(picked).sort((a,b) => a-b);
}
function buildOfficialNumbers(game: LottoGame, key: string) {
  return pickUniqueNumbers(game.maxNumber, 6, seededRandom(`pcso:${game.id}:${key}`));
}
function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const MIN_STAKE = 20;
const MAX_STAKE = 500;

export default function HomeScreen() {
  const router = useRouter();
  const { user, userId, demo } = useLocalSearchParams<{ user?: string; userId?: string; demo?: string }>();
  const colorScheme = useColorScheme();
  const uid = userId ? Number(userId) : null;

  // Games from API
  const [games, setGames] = useState<LottoGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  // Balance from API
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [selectedGameId, setSelectedGameId] = useState('');
  const [betMode, setBetMode] = useState<BetMode>('manual');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [stake, setStake] = useState(MIN_STAKE);
  const [notice, setNotice] = useState('Select a game, pick six numbers, and place your demo bet.');
  const [now, setNow] = useState(() => new Date());
  const [placingBet, setPlacingBet] = useState(false);

  const boardPulse = useRef(new Animated.Value(1)).current;

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load games
  useEffect(() => {
    apiFetch<LottoGame[]>('/games')
      .then(data => {
        setGames(data);
        if (data.length > 0) setSelectedGameId(data[0].id);
      })
      .catch(() => setNotice('Could not load games. Is the server running?'))
      .finally(() => setGamesLoading(false));
  }, []);

  // Load balance
  useEffect(() => {
    if (!uid) { setBalanceLoading(false); return; }
    apiFetch<{ balance: number }>('/bets/balance', { userId: uid })
      .then(r => setBalance(Number(r.balance)))
      .catch(() => {})
      .finally(() => setBalanceLoading(false));
  }, [uid]);

  const selectedGame = useMemo(
    () => games.find(g => g.id === selectedGameId) ?? games[0],
    [games, selectedGameId],
  );

  const numberOptions = useMemo(
    () => selectedGame ? Array.from({ length: selectedGame.maxNumber }, (_, i) => i+1) : [],
    [selectedGame],
  );

  useEffect(() => { setSelectedNumbers([]); }, [selectedGameId]);

  const nextDrawAt = getNextDrawAt(now);
  const nextDrawDateKey = toLocalDateKey(nextDrawAt);
  const nextDrawLabel = nextDrawAt.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  const latestSettledDrawAt = getLatestSettledDrawAt(now);
  const latestSettledDrawKey = toLocalDateKey(latestSettledDrawAt);
  const latestOfficialNumbers = selectedGame ? buildOfficialNumbers(selectedGame, latestSettledDrawKey) : [];
  const countdownLabel = getCountdownLabel(nextDrawAt, now);

  const displayName = user?.toString().trim() || 'Demo Player';
  const isDemoUser = demo === '1';
  const selectedBallSet = new Set(selectedNumbers);

  const palette: Palette = colorScheme === 'dark'
    ? {
        screenBg: '#08152c', cardBg: '#0f2344', cardBorder: '#23477e', heroBg: '#0d3a78',
        heroText: '#edf4ff', heroTextSoft: '#a9c2e6', heroStageBg: '#0a1b35',
        textStrong: '#edf4ff', textSoft: '#a9c2e6', accent: '#f4b400', accentText: '#2e2604',
        secondaryButton: '#1a63c2', secondaryButtonText: '#ecf4ff',
        chipIdle: '#14315f', chipIdleText: '#bdd2ef', chipActive: '#f4b400', chipActiveText: '#2f2706',
        numberIdle: '#143160', numberIdleText: '#c8daef', numberSelected: '#f4b400', numberSelectedText: '#2f2606',
        ticketPending: '#0e4b9b', ticketWon: '#0f8455', ticketLost: '#8d2f3e',
        orbOne: '#0e2d5d', orbTwo: '#123c73', stageBg: '#0a1b35', payout: '#84e4b7', warning: '#ffb670',
      }
    : {
        screenBg: '#edf3ff', cardBg: '#ffffff', cardBorder: '#cadbf5', heroBg: '#0f4ea9',
        heroText: '#ffffff', heroTextSoft: 'rgba(255,255,255,0.72)', heroStageBg: 'rgba(255,255,255,0.15)',
        textStrong: '#15305e', textSoft: '#5a7299', accent: '#f4b400', accentText: '#342906',
        secondaryButton: '#1260c4', secondaryButtonText: '#eff5ff',
        chipIdle: '#e3edfd', chipIdleText: '#335d92', chipActive: '#f4b400', chipActiveText: '#332905',
        numberIdle: '#e7effd', numberIdleText: '#2f578c', numberSelected: '#f4b400', numberSelectedText: '#342906',
        ticketPending: '#dbeafe', ticketWon: '#d5f5e7', ticketLost: '#ffe1e4',
        orbOne: '#cadffd', orbTwo: '#dde9ff', stageBg: '#f2f7ff', payout: '#0f7a4f', warning: '#a86000',
      };

  const triggerBoardPulse = () => {
    Animated.sequence([
      Animated.timing(boardPulse, { toValue: 0.97, duration: 110, useNativeDriver: true }),
      Animated.timing(boardPulse, { toValue: 1,    duration: 170, useNativeDriver: true }),
    ]).start();
  };

  const createLuckyPick = () => {
    if (!selectedGame) return;
    const nums = pickUniqueNumbers(selectedGame.maxNumber, 6);
    setSelectedNumbers(nums);
    setNotice(`Lucky pick ready: ${nums.join(' - ')}`);
    triggerBoardPulse();
  };

  const toggleManualNumber = (v: number) => {
    if (betMode !== 'manual') return;
    setSelectedNumbers(cur => {
      if (cur.includes(v)) return cur.filter(n => n !== v);
      if (cur.length >= 6) return cur;
      return [...cur, v].sort((a,b) => a-b);
    });
  };

  const changeStake = (delta: number) => {
    setStake(cur => Math.min(MAX_STAKE, Math.max(MIN_STAKE, cur + delta)));
  };

  const placeBet = async () => {
    if (!selectedGame || !uid) { setNotice('Session error. Please log in again.'); return; }

    const drawCutoff = drawDateFromKey(nextDrawDateKey);
    if (now.getTime() >= drawCutoff.getTime()) {
      setNotice('Betting is locked for this draw. Please wait for the next 9:00 PM round.');
      return;
    }

    const activeNumbers = betMode === 'lucky'
      ? (selectedNumbers.length === 6 ? selectedNumbers : pickUniqueNumbers(selectedGame.maxNumber, 6))
      : selectedNumbers;

    if (activeNumbers.length !== 6) {
      setNotice('Select exactly six numbers before placing your bet.');
      return;
    }
    if (balance < stake) {
      setNotice('Insufficient demo credits. Lower your stake or reset the app session.');
      return;
    }

    setPlacingBet(true);
    try {
      await apiFetch('/bets', {
        method: 'POST',
        userId: uid,
        body: { gameId: selectedGame.id, numbers: activeNumbers, stake },
      });
      setBalance(cur => cur - stake);
      setNotice(`Bet placed for ${selectedGame.name} on ${nextDrawDateKey} 9:00 PM. Stake: ${formatCurrency(stake)}.`);
      if (betMode === 'manual') setSelectedNumbers([]);
      else setSelectedNumbers(activeNumbers);
      triggerBoardPulse();
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Failed to place bet.');
    } finally {
      setPlacingBet(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
      <View style={[styles.orbTop,    { backgroundColor: palette.orbOne }]} />
      <View style={[styles.orbBottom, { backgroundColor: palette.orbTwo }]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: palette.heroBg }]}>
          <View style={styles.heroRow}>
            <View>
              <Text style={[styles.heroTag,      { color: 'rgba(255,255,255,0.70)' }]}>PCSO LOTTO SIMULATOR</Text>
              <Text style={[styles.heroTitle,    { color: '#ffffff' }]}>{displayName}</Text>
              <Text style={[styles.heroSubTitle, { color: 'rgba(255,255,255,0.70)' }]}>Daily 9:00 PM draw tracking</Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.70)' }]}>Demo Balance</Text>
              {balanceLoading
                ? <ActivityIndicator color={palette.accent} style={{ marginTop: 5 }} />
                : <Text style={[styles.heroStatValue, { color: palette.accent }]}>{formatCurrency(balance)}</Text>
              }
            </View>
            <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.70)' }]}>Next Draw</Text>
              <Text style={[styles.heroStatValue, { color: palette.accent }]}>{countdownLabel}</Text>
            </View>
          </View>

          <Text style={[styles.drawMeta,   { color: 'rgba(255,255,255,0.70)' }]}>Draw lock: {nextDrawLabel}</Text>
          <Text style={[styles.drawSource, { color: 'rgba(255,255,255,0.70)' }]}>Result basis: official 9:00 PM schedule.</Text>

          {isDemoUser && (
            <View style={[styles.demoBadge, { backgroundColor: palette.accent }]}>
              <Ionicons name="person-circle-outline" size={14} color={palette.accentText} />
              <Text style={[styles.demoBadgeText, { color: palette.accentText }]}>Demo Account Active</Text>
            </View>
          )}
        </View>

        {/* Game Picker */}
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Choose Lotto Game</Text>
          {gamesLoading
            ? <ActivityIndicator color={palette.accent} style={{ marginTop: 12 }} />
            : (
              <View style={styles.gameGrid}>
                {games.map((game) => {
                  const active = game.id === selectedGame?.id;
                  return (
                    <Pressable key={game.id} onPress={() => setSelectedGameId(game.id)}
                      style={[styles.gameChip, { backgroundColor: active ? palette.chipActive : palette.chipIdle }]}>
                      <Text style={[styles.gameChipLabel, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>{game.name}</Text>
                      <Text style={[styles.gameChipSub,   { color: active ? palette.chipActiveText : palette.chipIdleText }]}>{game.drawTime}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )
          }
        </View>

        {/* Bet Builder */}
        <Animated.View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder, transform: [{ scale: boardPulse }] }]}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Build Your Bet Slip</Text>

          <View style={styles.modeRow}>
            {(['manual','lucky'] as const).map(mode => (
              <Pressable key={mode}
                style={[styles.modeChip, { backgroundColor: betMode === mode ? palette.chipActive : palette.chipIdle }]}
                onPress={() => { setBetMode(mode); if (mode === 'lucky') createLuckyPick(); }}>
                <Text style={[styles.modeChipText, { color: betMode === mode ? palette.chipActiveText : palette.chipIdleText }]}>
                  {mode === 'manual' ? 'Manual Pick' : 'Lucky Pick'}
                </Text>
              </Pressable>
            ))}
          </View>

          {betMode === 'lucky' && (
            <Pressable style={[styles.luckyButton, { backgroundColor: palette.secondaryButton }]} onPress={createLuckyPick}>
              <Ionicons name="shuffle-outline" size={16} color={palette.secondaryButtonText} />
              <Text style={[styles.luckyButtonText, { color: palette.secondaryButtonText }]}>Generate New Lucky Pick</Text>
            </Pressable>
          )}

          <View style={styles.selectionTray}>
            {Array.from({ length: 6 }).map((_, i) => {
              const v = selectedNumbers[i];
              return (
                <View key={`slot-${i}`} style={[styles.selectionBall, { backgroundColor: palette.stageBg }]}>
                  <Text style={[styles.selectionBallText, { color: palette.textStrong }]}>{v ?? '--'}</Text>
                </View>
              );
            })}
          </View>
          <Text style={[styles.selectionHint, { color: palette.textSoft }]}>Selected {selectedNumbers.length} of 6 numbers</Text>

          <View style={styles.numberGrid}>
            {numberOptions.map((v) => {
              const chosen = selectedBallSet.has(v);
              return (
                <Pressable key={`num-${v}`} onPress={() => toggleManualNumber(v)} disabled={betMode !== 'manual'}
                  style={[styles.numberChip, { backgroundColor: chosen ? palette.numberSelected : palette.numberIdle, opacity: betMode === 'manual' ? 1 : 0.45 }]}>
                  <Text style={[styles.numberChipText, { color: chosen ? palette.numberSelectedText : palette.numberIdleText }]}>{v}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.stakeRow}>
            <Text style={[styles.stakeLabel, { color: palette.textSoft }]}>Stake per line</Text>
            <View style={styles.stakeControlRow}>
              <Pressable style={[styles.stakeButton, { backgroundColor: palette.chipIdle }]} onPress={() => changeStake(-20)}>
                <Text style={[styles.stakeButtonText, { color: palette.chipIdleText }]}>-20</Text>
              </Pressable>
              <Text style={[styles.stakeValue, { color: palette.textStrong }]}>{formatCurrency(stake)}</Text>
              <Pressable style={[styles.stakeButton, { backgroundColor: palette.chipIdle }]} onPress={() => changeStake(20)}>
                <Text style={[styles.stakeButtonText, { color: palette.chipIdleText }]}>+20</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={[styles.placeBetButton, { backgroundColor: palette.accent, opacity: placingBet ? 0.7 : 1 }]}
            onPress={placeBet} disabled={placingBet}>
            <Ionicons name="ticket-outline" size={16} color={palette.accentText} />
            <Text style={[styles.placeBetText, { color: palette.accentText }]}>
              {placingBet ? 'Placing Bet…' : 'Place Bet for 9:00 PM Draw'}
            </Text>
          </Pressable>

          <Text style={[styles.noticeText, { color: palette.warning }]}>{notice}</Text>
        </Animated.View>

        {/* Latest Official Numbers */}
        {selectedGame && (
          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Latest Official 9:00 PM Result</Text>
            <Text style={[styles.resultMeta, { color: palette.textSoft }]}>{selectedGame.name} - {latestSettledDrawKey}</Text>
            <View style={[styles.officialRow, { backgroundColor: palette.stageBg }]}>
              {latestOfficialNumbers.map((v) => (
                <View key={`official-${v}`} style={[styles.officialBall, { backgroundColor: palette.secondaryButton }]}>
                  <Text style={[styles.officialBallText, { color: palette.secondaryButtonText }]}>{v}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.resultMeta, { color: palette.textSoft }]}>Your pending bets auto-settle right after 9:00 PM.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80,   right: -85,  opacity: 0.55 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.42 },
  scrollContent: { padding: 16, gap: 14 },
  heroCard:      { borderRadius: 18, padding: 16 },
  heroRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  heroTag:       { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono },
  heroTitle:     { marginTop: 4, fontSize: 24, fontWeight: '800', fontFamily: Fonts.rounded },
  heroSubTitle:  { marginTop: 5, fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
  heroStatsRow:  { marginTop: 12, flexDirection: 'row', gap: 8 },
  heroStat:      { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  heroStatLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: Fonts.mono },
  heroStatValue: { marginTop: 5, fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded },
  drawMeta:      { marginTop: 10, fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
  drawSource:    { marginTop: 3, fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans },
  demoBadge:     { marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans },
  card:          { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionTitle:  { fontSize: 18, fontWeight: '800', fontFamily: Fonts.rounded },
  gameGrid:      { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gameChip:      { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: '47%' },
  gameChipLabel: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  gameChipSub:   { marginTop: 2, fontSize: 11, fontWeight: '500', fontFamily: Fonts.mono },
  modeRow:       { marginTop: 12, flexDirection: 'row', gap: 8 },
  modeChip:      { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  modeChipText:  { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  luckyButton:   { marginTop: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, flexDirection: 'row', gap: 7 },
  luckyButtonText:{ fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  selectionTray: { marginTop: 12, flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  selectionBall: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  selectionBallText: { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  selectionHint: { marginTop: 8, fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
  numberGrid:    { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  numberChip:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  numberChipText:{ fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
  stakeRow:      { marginTop: 12 },
  stakeLabel:    { fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans },
  stakeControlRow:{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stakeButton:   { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  stakeButtonText:{ fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
  stakeValue:    { fontSize: 18, fontWeight: '800', fontFamily: Fonts.rounded },
  placeBetButton:{ marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  placeBetText:  { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  noticeText:    { marginTop: 10, fontSize: 12, lineHeight: 18, fontWeight: '600', fontFamily: Fonts.sans },
  resultMeta:    { marginTop: 8, fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans },
  officialRow:   { marginTop: 10, borderRadius: 12, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  officialBall:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  officialBallText:{ fontSize: 13, fontWeight: '700', fontFamily: Fonts.rounded },
});
