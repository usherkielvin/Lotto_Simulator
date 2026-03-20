import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';

type BetMode = 'manual' | 'lucky';

type GameType = '2number' | '3digit' | '4digit' | '6digit' | '6number';

type LottoGame = {
  id: string;
  name: string;
  maxNumber: number;
  drawTime: string;
  drawDays: string;
  jackpot: number;
  jackpotStatus: string;
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

function getGameType(game: Pick<LottoGame, 'id' | 'name' | 'maxNumber'> | string): GameType {
  const identity = typeof game === 'string' ? game : `${game.id} ${game.name ?? ''}`;
  const normalized = identity.toLowerCase();

  if (normalized.includes('2d') || normalized.includes('ez2')) return '2number';
  if (normalized.includes('3d') || normalized.includes('swertres')) return '3digit';
  if (normalized.includes('4d') || normalized.includes('4-digit')) return '4digit';
  if (normalized.includes('6digit') || normalized.includes('6-digit') || /\b6d\b/.test(normalized)) {
    return '6digit';
  }

  // Fallback guards for inconsistent backend IDs/names.
  if (typeof game !== 'string') {
    if (game.maxNumber === 999) return '3digit';
    if (game.maxNumber === 9999) return '4digit';
    if (game.maxNumber === 9 && normalized.includes('digit')) return '6digit';
  }

  return '6number';
}

function isDigitGame(gameType: GameType): boolean {
  return gameType === '3digit' || gameType === '4digit' || gameType === '6digit';
}

function getRequiredDigits(gameType: GameType): number {
  switch (gameType) {
    case '2number': return 2;
    case '3digit': return 3;
    case '4digit': return 4;
    case '6digit': return 6;
    case '6number': return 6;
  }
}

function buildOfficialNumbers(game: LottoGame, key: string) {
  const gameType = getGameType(game);
  const requiredCount = getRequiredDigits(gameType);
  const isDigit = isDigitGame(gameType);

  if (isDigit) {
    // 3D, 4D, 6D: Generate random digits 0-9
    const result = [];
    const rand = seededRandom(`pcso:${game.id}:${key}`);
    for (let i = 0; i < requiredCount; i++) {
      result.push(Math.floor(rand() * 10));
    }
    return result;
  } else if (gameType === '2number') {
    // 2D: Pick 2 numbers (can repeat) from 1 to maxNumber
    const result = [];
    const rand = seededRandom(`pcso:${game.id}:${key}`);
    for (let i = 0; i < 2; i++) {
      result.push(Math.floor(rand() * game.maxNumber) + 1);
    }
    return result;
  } else {
    // 6-number games: Pick 6 unique numbers
    return pickUniqueNumbers(game.maxNumber, 6, seededRandom(`pcso:${game.id}:${key}`));
  }
}
function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function isGameAvailableToday(game: LottoGame, now: Date): boolean {
  if (!game.drawDays) return true;
  
  // Get day of week: 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const dayOfWeek = now.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[dayOfWeek];
  const currentDayNum = String(dayOfWeek);
  
  // Split drawDays by comma and check if current day is included
  const availableDays = game.drawDays.split(',').map(d => d.trim());
  
  // Check if day name or day number matches
  return availableDays.includes(currentDay) || availableDays.includes(currentDayNum) || availableDays.includes(String(dayOfWeek));
}

const MIN_STAKE = 20;
const MAX_STAKE = 500;

const SCREEN_W  = Dimensions.get('window').width;
const SLIDE_GAP = 12;
// Available width inside the card: screen - outer scroll padding (16*2) - card padding (14*2)
const AVAIL_W   = SCREEN_W - 32 - 28; // = SCREEN_W - 60
const SLIDE_W   = AVAIL_W - 24; // leaves ~12px peek on each side within the card
const SNAP_INTERVAL = SLIDE_W + SLIDE_GAP;
// padding so first card is centered within the available width
const CAROUSEL_PADDING = (AVAIL_W - SLIDE_W) / 2;

function getNextDrawDate(game: LottoGame, now: Date): string {
  if (!game.drawDays) return '';
  const drawDayNums = game.drawDays.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
  if (drawDayNums.length === 0) return '';
  const today = now.getDay();
  // Find the soonest future draw day
  let minDiff = 8;
  for (const d of drawDayNums) {
    const diff = (d - today + 7) % 7 || 7; // never 0 since game isn't available today
    if (diff < minDiff) minDiff = diff;
  }
  const next = new Date(now);
  next.setDate(now.getDate() + minDiff);
  return next.toLocaleDateString('en-PH', { weekday: 'long' });
}

const MAJOR_LOTTO_IDS = ['ultra-658', 'grand-655', 'super-649', 'mega-645', 'lotto-642'];
const SMALL_GAME_IDS  = ['6digit', '4digit', '3d-swertres', '2d-ez2'];

export default function HomeScreen() {
  const { session } = useSession();
  const colorScheme = useColorScheme();
  const uid = session?.userId ?? null;
  const displayName = session?.displayName ?? 'Player';
  const isDemoUser = session?.demo ?? false;

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
  const [notice, setNotice] = useState('Select a game and build your bet slip to continue.');
  const [now, setNow] = useState(() => new Date());
  const [placingBet, setPlacingBet] = useState(false);

  const boardPulse = useRef(new Animated.Value(1)).current;
  const jackpotScroll = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const betBuilderRef = useRef<View>(null);
  const [jackpotIndex, setJackpotIndex] = useState(0);
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load games — today only
  useEffect(() => {
    apiFetch<LottoGame[]>('/games')
      .then(data => {
        setGames(data);
        const firstMajor = data.find(g => MAJOR_LOTTO_IDS.includes(g.id));
        setSelectedGameId(firstMajor?.id ?? data[0]?.id ?? '');
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
    () => games.find(g => g.id === selectedGameId && isGameAvailableToday(g, now)) ?? games.find(g => isGameAvailableToday(g, now)) ?? games[0],
    [games, selectedGameId, now],
  );

  const majorGames = useMemo(
    () => MAJOR_LOTTO_IDS
      .map(id => games.find(g => g.id === id))
      .filter((g): g is LottoGame => g !== undefined)
      .sort((a, b) => {
        const aToday = isGameAvailableToday(a, now) ? 0 : 1;
        const bToday = isGameAvailableToday(b, now) ? 0 : 1;
        return aToday - bToday;
      }),
    [games, now],
  );
  const smallGames = useMemo(
    () => SMALL_GAME_IDS
      .map(id => games.find(g => g.id === id))
      .filter((g): g is LottoGame => g !== undefined)
      .sort((a, b) => {
        const aToday = isGameAvailableToday(a, now) ? 0 : 1;
        const bToday = isGameAvailableToday(b, now) ? 0 : 1;
        return aToday - bToday;
      }),
    [games, now],
  );

  // All games for carousel — today's draws first, then off-day ones
  const carouselGames = useMemo(() => {
    const all = [...MAJOR_LOTTO_IDS, ...SMALL_GAME_IDS]
      .map(id => games.find(g => g.id === id))
      .filter((g): g is LottoGame => g !== undefined);
    const today = all.filter(g => isGameAvailableToday(g, now));
    const offDay = all.filter(g => !isGameAvailableToday(g, now));
    return [...today, ...offDay];
  }, [games, now]);

  const numberOptions = useMemo(
    () => {
      if (!selectedGame) return [];
      const gameType = getGameType(selectedGame);
      const isDigit = isDigitGame(gameType);
      if (isDigit) {
        // 3D, 4D, 6D: Show digits 0-9
        return Array.from({ length: 10 }, (_, i) => i);
      } else {
        // 2D and 6-number games: Show range 1 to maxNumber
        return Array.from({ length: selectedGame.maxNumber }, (_, i) => i+1);
      }
    },
    [selectedGame],
  );

  // Auto-switch to available game if selected game is not available today
  useEffect(() => {
    if (selectedGame && selectedGameId && selectedGame.id !== selectedGameId) {
      setSelectedGameId(selectedGame.id);
    }
  }, [selectedGame, selectedGameId]);

  // Clear selected numbers when game changes
  useEffect(() => { setSelectedNumbers([]); }, [selectedGameId]);

  const nextDrawAt = getNextDrawAt(now);
  const nextDrawDateKey = toLocalDateKey(nextDrawAt);
  const nextDrawLabel = nextDrawAt.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  const latestSettledDrawAt = getLatestSettledDrawAt(now);
  const latestSettledDrawKey = toLocalDateKey(latestSettledDrawAt);
  const latestOfficialNumbers = selectedGame ? buildOfficialNumbers(selectedGame, latestSettledDrawKey) : [];
  const countdownLabel = getCountdownLabel(nextDrawAt, now);
  const selectedBallSet = new Set(selectedNumbers);

  const palette: Palette = colorScheme === 'dark'
    ? {
        screenBg: '#08152c', cardBg: '#0f2344', cardBorder: '#23477e', heroBg: '#0d3a78',
        heroText: '#edf4ff', heroTextSoft: '#a9c2e6', heroStageBg: '#0a1b35',
        textStrong: '#edf4ff', textSoft: '#a9c2e6', accent: '#f4b400', accentText: '#2e2604',
        secondaryButton: '#1a63c2', secondaryButtonText: '#ecf4ff',
        chipIdle: '#14315f', chipIdleText: '#bdd2ef', chipActive: '#f4b400', chipActiveText: '#2f2706',
        numberIdle: '#1e4a8a', numberIdleText: '#e0ebff', numberSelected: '#f4b400', numberSelectedText: '#2f2606',
        ticketPending: '#0e4b9b', ticketWon: '#0f8455', ticketLost: '#8d2f3e',
        orbOne: '#0e2d5d', orbTwo: '#123c73', stageBg: '#0a1b35', payout: '#84e4b7', warning: '#ffb670',
      }
    : {
        screenBg: '#edf3ff', cardBg: '#ffffff', cardBorder: '#cadbf5', heroBg: '#0f4ea9',
        heroText: '#ffffff', heroTextSoft: 'rgba(255,255,255,0.72)', heroStageBg: 'rgba(255,255,255,0.15)',
        textStrong: '#15305e', textSoft: '#5a7299', accent: '#f4b400', accentText: '#342906',
        secondaryButton: '#1260c4', secondaryButtonText: '#eff5ff',
        chipIdle: '#e3edfd', chipIdleText: '#335d92', chipActive: '#f4b400', chipActiveText: '#332905',
        numberIdle: '#d6e5ff', numberIdleText: '#1e3a6b', numberSelected: '#f4b400', numberSelectedText: '#342906',
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
    const gameType = getGameType(selectedGame);
    const requiredCount = getRequiredDigits(gameType);
    const isDigit = isDigitGame(gameType);
    let nums: number[] = [];

    if (gameType === '6number') {
      // 6-number games: 6 unique numbers
      nums = pickUniqueNumbers(selectedGame.maxNumber, 6);
    } else if (isDigit || gameType === '2number') {
      // 2D, 3D, 4D, 6D: Random digits 0-9 (can repeat)
      nums = [];
      for (let i = 0; i < requiredCount; i++) {
        nums.push(Math.floor(Math.random() * 10));
      }
    }
    setSelectedNumbers(nums);
    setNotice(`Lucky pick ready: ${nums.join(' - ')}`);
    triggerBoardPulse();
  };

  const toggleManualNumber = (v: number) => {
    if (betMode !== 'manual') return;
    const gameType = getGameType(selectedGame ?? '');
    const requiredCount = getRequiredDigits(gameType);
    const allowsDuplicates = gameType !== '6number'; // 2D, 3D, 4D, 6D allow duplicates

    setSelectedNumbers(cur => {
      if (allowsDuplicates) {
        // For 2D, 3D, 4D, 6D: Allow duplicates, just keep adding
        if (cur.length >= requiredCount) return cur;
        return [...cur, v];
      } else {
        // For 6-number games: No duplicates, toggle on/off
        if (cur.includes(v)) return cur.filter(n => n !== v);
        if (cur.length >= requiredCount) return cur;
        return [...cur, v].sort((a,b) => a-b);
      }
    });
  };

  const changeStake = (delta: number) => {
    setStake(cur => Math.min(MAX_STAKE, Math.max(MIN_STAKE, cur + delta)));
  };

  const selectGame = (id: string) => {
    setSelectedGameId(id);
    setTimeout(() => {
      betBuilderRef.current?.measureLayout(
        scrollViewRef.current as unknown as Parameters<typeof betBuilderRef.current.measureLayout>[0],
        (_x, y) => { scrollViewRef.current?.scrollTo({ y, animated: true }); },
        () => {},
      );
    }, 50);
  };

  const placeBet = async () => {
    if (!selectedGame || !uid) { setNotice('Session error. Please log in again.'); return; }

    const drawCutoff = drawDateFromKey(nextDrawDateKey);
    if (now.getTime() >= drawCutoff.getTime()) {
      setNotice('Betting is locked for this draw. Please wait for the next 9:00 PM round.');
      return;
    }

    const gameType = getGameType(selectedGame);
    const requiredCount = getRequiredDigits(gameType);
    const isDigit = isDigitGame(gameType);

    let activeNumbers = selectedNumbers;
    if (betMode === 'lucky') {
      if (activeNumbers.length !== requiredCount) {
        if (gameType === '6number') {
          activeNumbers = pickUniqueNumbers(selectedGame.maxNumber, 6);
        } else if (isDigit || gameType === '2number') {
          // 2D, 3D, 4D, 6D: Random digits 0-9
          activeNumbers = [];
          for (let i = 0; i < requiredCount; i++) {
            activeNumbers.push(Math.floor(Math.random() * 10));
          }
        }
      }
    }

    if (activeNumbers.length !== requiredCount) {
      const label = requiredCount === 1 ? 'number' : 'numbers';
      setNotice(`Select exactly ${requiredCount} ${label} before placing your bet.`);
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

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: palette.heroBg }]}>
          {/* Top row: greeting + demo badge */}
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTag, { color: 'rgba(255,255,255,0.60)' }]}>LOTTO SIMULATOR</Text>
              <Text style={[styles.heroTitle, { color: '#ffffff' }]}>Hi, {displayName}</Text>
            </View>
            {isDemoUser && (
              <View style={[styles.demoBadge, { backgroundColor: 'rgba(244,180,0,0.18)' }]}>
                <Ionicons name="flask-outline" size={12} color={palette.accent} />
                <Text style={[styles.demoBadgeText, { color: palette.accent }]}>Demo</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.10)' }]} />

          {/* Stats row */}
          <View style={styles.heroStatsRow}>
            <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
              <Ionicons name="wallet-outline" size={14} color="rgba(255,255,255,0.55)" />
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.55)', marginTop: 6 }]}>Balance</Text>
              {balanceLoading
                ? <ActivityIndicator color={palette.accent} size="small" style={{ marginTop: 4 }} />
                : <Text style={[styles.heroStatValue, { color: palette.accent }]}>{formatCurrency(balance)}</Text>
              }
            </View>
            <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
              <Ionicons name="timer-outline" size={14} color="rgba(255,255,255,0.55)" />
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.55)', marginTop: 6 }]}>Next Draw</Text>
              <Text style={[styles.heroStatValue, { color: '#ffffff' }]}>{countdownLabel}</Text>
            </View>
            <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.55)" />
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.55)', marginTop: 6 }]}>Draw Date</Text>
              <Text style={[styles.heroStatValue, { color: '#ffffff', fontSize: 12 }]}>
                {nextDrawAt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Draw lock note */}
          <View style={styles.heroFootRow}>
            <Ionicons name="lock-closed-outline" size={11} color="rgba(255,255,255,0.45)" />
            <Text style={[styles.heroFootText, { color: 'rgba(255,255,255,0.45)' }]}>
              Locks at {nextDrawAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} · {nextDrawAt.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Jackpot Showcase */}
        {!gamesLoading && majorGames.length > 0 && (
          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            {/* Header */}
            <View style={styles.jackpotHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Tonight's Jackpots</Text>
                <Text style={[styles.jackpotSubtitle, { color: palette.textSoft }]}>
                  {now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <View style={[styles.jackpotDrawBadge, { backgroundColor: palette.chipIdle }]}>
                <Ionicons name="time-outline" size={11} color={palette.chipIdleText} />
                <Text style={[styles.jackpotDrawBadgeText, { color: palette.chipIdleText }]}>9:00 PM</Text>
              </View>
            </View>

            {/* Carousel */}
            <ScrollView
              ref={jackpotScroll}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_INTERVAL}
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
                const clamped = Math.max(0, Math.min(idx, majorGames.length - 1));
                if (clamped !== jackpotIndex) {
                  setJackpotIndex(clamped);
                  Animated.spring(dotAnim, { toValue: clamped, useNativeDriver: false, speed: 20, bounciness: 0 }).start();
                }
              }}
              style={{ marginTop: 10 }}
              contentContainerStyle={{ paddingHorizontal: CAROUSEL_PADDING }}
            >
              {majorGames.map((g, idx) => {
                const availableToday = isGameAvailableToday(g, now);
                const drawDayNames = g.drawDays
                  ? g.drawDays.split(',').map(d => {
                      const n = parseInt(d.trim(), 10);
                      return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][n] ?? d.trim();
                    }).join(' · ')
                  : '';
                return (
                  <View
                    key={g.id}
                    style={[
                      styles.jackpotSlide,
                      {
                        backgroundColor: palette.stageBg,
                        borderColor: palette.cardBorder,
                        borderWidth: 1,
                        opacity: availableToday ? 1 : 0.45,
                      },
                    ]}
                  >
                    {/* Game name + today badge */}
                    <View style={styles.jackpotSlideTop}>
                      <Text style={[styles.jackpotGameName, { color: palette.textSoft }]}>
                        {g.name}
                      </Text>
                      {availableToday && (
                        <View style={[styles.jackpotActivePill, { backgroundColor: palette.accent }]}>
                          <Text style={[styles.jackpotActivePillText, { color: palette.accentText }]}>Today</Text>
                        </View>
                      )}
                    </View>

                    {/* Jackpot amount */}
                    <Text style={[styles.jackpotAmount, { color: palette.accent }]}>
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(g.jackpot)}
                    </Text>
                    <Text style={[styles.jackpotLabel, { color: palette.textSoft }]}>
                      Estimated Jackpot Prize
                    </Text>

                    {/* Divider */}
                    <View style={[styles.jackpotSlideDivider, { backgroundColor: palette.cardBorder }]} />

                    {/* Details row */}
                    <View style={styles.jackpotDetailsRow}>
                      <View style={styles.jackpotDetailItem}>
                        <Ionicons name="calendar-outline" size={12} color={palette.textSoft} />
                        <Text style={[styles.jackpotDetailText, { color: palette.textSoft }]}>
                          {drawDayNames}
                        </Text>
                      </View>
                      <View style={styles.jackpotDetailItem}>
                        <Ionicons name="grid-outline" size={12} color={palette.textSoft} />
                        <Text style={[styles.jackpotDetailText, { color: palette.textSoft }]}>
                          Pick 6 of {g.maxNumber}
                        </Text>
                      </View>
                    </View>

                    {/* Status */}
                    <Text style={[styles.jackpotStatus, { color: palette.warning }]} numberOfLines={1}>
                      {g.jackpotStatus}
                    </Text>

                    {/* Buy Tickets / Next draw */}
                    {availableToday ? (
                      <Pressable
                        onPress={() => selectGame(g.id)}
                        style={[styles.jackpotBetBtn, { backgroundColor: palette.accent }]}
                      >
                        <Ionicons name="ticket-outline" size={13} color={palette.accentText} />
                        <Text style={[styles.jackpotBetBtnText, { color: palette.accentText }]}>
                          Buy Tickets
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.jackpotBetBtn, { backgroundColor: palette.chipIdle }]}>
                        <Ionicons name="time-outline" size={13} color={palette.chipIdleText} />
                        <Text style={[styles.jackpotBetBtnText, { color: palette.chipIdleText }]}>
                          Draws {drawDayNames.split(' · ')[0]}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Dot indicators */}
            {majorGames.length > 1 && (
              <View style={styles.dotRow}>
                {majorGames.map((_, i) => {
                  const width = dotAnim.interpolate({
                    inputRange: majorGames.map((__, j) => j),
                    outputRange: majorGames.map((__, j) => (j === i ? 18 : 7)),
                    extrapolate: 'clamp',
                  });
                  const opacity = dotAnim.interpolate({
                    inputRange: majorGames.map((__, j) => j),
                    outputRange: majorGames.map((__, j) => (j === i ? 1 : 0.35)),
                    extrapolate: 'clamp',
                  });
                  return (
                    <Animated.View
                      key={i}
                      style={[styles.dot, { backgroundColor: palette.accent, width, opacity }]}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Game Picker */}
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Choose Lotto Game</Text>
          {gamesLoading
            ? <ActivityIndicator color={palette.accent} style={{ marginTop: 12 }} />
            : (
              <>
                <View style={styles.categorySection}>
                  <Text style={[styles.categoryLabel, { color: palette.textSoft }]}>Major Lotto Games</Text>
                  <View style={styles.gameGrid}>
                    {majorGames.map((game) => {
                      const active = game.id === selectedGame?.id;
                      const available = isGameAvailableToday(game, now);
                      return (
                        <Pressable key={game.id} onPress={() => available && selectGame(game.id)} disabled={!available}
                          style={[styles.gameChip, { backgroundColor: active ? palette.chipActive : palette.chipIdle, opacity: available ? 1 : 0.4 }]}>
                          <Text style={[styles.gameChipLabel, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>{game.name}</Text>
                          <Text style={[styles.gameChipSub, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>
                            {available ? game.drawTime : getNextDrawDate(game, now)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View style={[styles.categorySection, { marginTop: 10 }]}>
                  <Text style={[styles.categoryLabel, { color: palette.textSoft }]}>3D / 4D Games</Text>
                  <View style={styles.gameGrid}>
                    {smallGames.map((game) => {
                      const active = game.id === selectedGame?.id;
                      const available = isGameAvailableToday(game, now);
                      return (
                        <Pressable key={game.id} onPress={() => available && selectGame(game.id)} disabled={!available}
                          style={[styles.gameChip, { backgroundColor: active ? palette.chipActive : palette.chipIdle, opacity: available ? 1 : 0.4 }]}>
                          <Text style={[styles.gameChipLabel, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>{game.name}</Text>
                          <Text style={[styles.gameChipSub, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>
                            {available ? game.drawTime : getNextDrawDate(game, now)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )
          }
        </View>

        {/* Bet Builder */}
        <Animated.View ref={betBuilderRef} style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder, transform: [{ scale: boardPulse }] }]}>
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

          {selectedGame && (() => {
            const gameType = getGameType(selectedGame);
            const requiredCount = getRequiredDigits(gameType);
            const isDigit = isDigitGame(gameType);
            const is2D = gameType === '2number';
            const is3D4D6D = isDigit;
            const itemLabel = isDigit ? 'digit' : 'number';
            
            return (
              <>
                {is2D ? (
                  <View>
                    <View style={[styles.selectionTray, { marginBottom: 12 }]}>
                      {Array.from({ length: 2 }).map((_, i) => (
                        <View key={`selection-${i}`} style={[styles.selectionBall, { backgroundColor: selectedNumbers[i] !== undefined ? palette.stageBg : palette.cardBg, borderWidth: selectedNumbers[i] !== undefined ? 0 : 2, borderColor: palette.textSoft }]}>
                          <Text style={[styles.selectionBallText, { color: selectedNumbers[i] !== undefined ? palette.textStrong : palette.textSoft }]}>
                            {selectedNumbers[i] ?? '-'}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.selectionHint, { color: palette.textSoft }]}>
                      Selected {selectedNumbers.length} of 2 digits
                    </Text>
                  </View>
                ) : is3D4D6D ? (
                  <View>
                    <View style={[styles.selectionTray, { marginBottom: 12 }]}>
                      {Array.from({ length: requiredCount }).map((_, i) => (
                        <View key={`selection-${i}`} style={[styles.selectionBall, { backgroundColor: selectedNumbers[i] !== undefined ? palette.stageBg : palette.cardBg, borderWidth: selectedNumbers[i] !== undefined ? 0 : 2, borderColor: palette.textSoft }]}>
                          <Text style={[styles.selectionBallText, { color: selectedNumbers[i] !== undefined ? palette.textStrong : palette.textSoft }]}>
                            {selectedNumbers[i] ?? '-'}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.selectionHint, { color: palette.textSoft }]}>
                      Selected {selectedNumbers.length} of {requiredCount} {requiredCount === 1 ? itemLabel : itemLabel + 's'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.selectionTray}>
                      {Array.from({ length: requiredCount }).map((_, i) => {
                        const v = selectedNumbers[i];
                        return (
                          <View key={`slot-${i}`} style={[styles.selectionBall, { backgroundColor: palette.stageBg }]}>
                            <Text style={[styles.selectionBallText, { color: palette.textStrong }]}>{v ?? '--'}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <Text style={[styles.selectionHint, { color: palette.textSoft }]}>
                      Selected {selectedNumbers.length} of {requiredCount} {requiredCount === 1 ? itemLabel : itemLabel + 's'}
                    </Text>
                  </>
                )}
              </>
            );
          })()}

          {selectedGame && (() => {
            const gameType = getGameType(selectedGame);
            const is2D = gameType === '2number';
            
            if (is2D) {
              // 2D special interface: Two columns like 3D/4D/6D
              return (
                <View style={[styles.digitColumnsContainer, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
                  {Array.from({ length: 2 }).map((_, posIdx) => (
                    <View key={`column-${posIdx}`} style={[styles.digitColumnCard, { borderRightColor: posIdx < 1 ? palette.cardBorder : 'transparent' }]}>
                      <Text style={[styles.digitPositionLabel, { color: palette.accent }]}>
                        {posIdx === 0 ? '①' : '②'}
                      </Text>
                      <View style={styles.digitColumn}>
                        {Array.from({ length: 10 }, (_, i) => i).map((v) => {
                          const chosen = selectedNumbers[posIdx] === v;
                          return (
                            <Pressable key={`digit${posIdx}-${v}`} onPress={() => {
                              if (betMode === 'manual') {
                                const updated = [...selectedNumbers];
                                updated[posIdx] = v;
                                setSelectedNumbers(updated.slice(0, 2));
                              }
                            }} disabled={betMode !== 'manual'}
                              style={[styles.numberChip, { 
                                backgroundColor: chosen ? palette.numberSelected : palette.numberIdle,
                                opacity: betMode === 'manual' ? 1 : 0.45,
                              }]}>
                              <Text style={[styles.numberChipText, { color: chosen ? palette.numberSelectedText : palette.numberIdleText }]}>
                                {v}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              );
            }

            // For other games: standard grid or columns for 3D/4D/6D digits
            const isDigit = isDigitGame(gameType);
            const allowsDuplicates = gameType !== '6number';
            const requiredDigits = getRequiredDigits(gameType);
            
            // For 3D/4D/6D: create separate columns for each digit position
            if (isDigit) {
              return (
                <View style={[styles.digitColumnsContainer, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
                  {Array.from({ length: requiredDigits }).map((_, posIdx) => (
                    <View key={`column-${posIdx}`} style={[styles.digitColumnCard, { borderRightColor: posIdx < requiredDigits - 1 ? palette.cardBorder : 'transparent' }]}>
                      <Text style={[styles.digitPositionLabel, { color: palette.accent }]}>
                        {gameType === '3digit' && ['①', '②', '③'][posIdx]}
                        {gameType === '4digit' && ['①', '②', '③', '④'][posIdx]}
                        {gameType === '6digit' && ['①', '②', '③', '④', '⑤', '⑥'][posIdx]}
                      </Text>
                      <View style={styles.digitColumn}>
                        {Array.from({ length: 10 }, (_, i) => i).map((v) => {
                          const chosen = selectedNumbers[posIdx] === v;
                          return (
                            <Pressable key={`digit${posIdx}-${v}`} onPress={() => {
                              if (betMode === 'manual') {
                                const updated = [...selectedNumbers];
                                updated[posIdx] = v;
                                setSelectedNumbers(updated.slice(0, requiredDigits));
                              }
                            }} disabled={betMode !== 'manual'}
                              style={[styles.numberChip, { 
                                backgroundColor: chosen ? palette.numberSelected : palette.numberIdle,
                                opacity: betMode === 'manual' ? 1 : 0.45,
                              }]}>
                              <Text style={[styles.numberChipText, { color: chosen ? palette.numberSelectedText : palette.numberIdleText }]}>
                                {v}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              );
            }

            const digitCount = allowsDuplicates ? selectedNumbers.reduce((acc, n) => {
              acc[n] = (acc[n] || 0) + 1;
              return acc;
            }, {} as Record<number, number>) : {};

            return (
              <View style={styles.numberGrid}>
                {numberOptions.map((v) => {
                  const count = allowsDuplicates ? (digitCount[v] || 0) : 0;
                  const chosen = allowsDuplicates ? count > 0 : selectedBallSet.has(v);
                  const chipWidth = 36;
                  const chipHeight = 36;
                  
                  return (
                    <Pressable key={`num-${v}`} onPress={() => toggleManualNumber(v)} disabled={betMode !== 'manual'}
                      style={[styles.numberChip, { 
                        backgroundColor: chosen ? palette.numberSelected : palette.numberIdle, 
                        opacity: betMode === 'manual' ? 1 : 0.45,
                        width: chipWidth,
                        height: chipHeight,
                        position: 'relative',
                      }]}>
                      <Text style={[styles.numberChipText, { color: chosen ? palette.numberSelectedText : palette.numberIdleText }]}>
                        {v}
                      </Text>
                      {allowsDuplicates && count > 1 && (
                        <View style={[styles.countBadge, { backgroundColor: palette.accent }]}>
                          <Text style={[styles.countBadgeText, { color: palette.accentText }]}>{count}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })()}
          

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
              {latestOfficialNumbers.map((v, idx) => (
                <View key={`official-${idx}`} style={[styles.officialBall, { backgroundColor: palette.secondaryButton }]}>
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
  heroCard:      { borderRadius: 20, padding: 18 },
  heroTopRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroTag:       { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: Fonts.mono },
  heroTitle:     { marginTop: 3, fontSize: 22, fontWeight: '800', fontFamily: Fonts.rounded },
  heroDivider:   { height: 1, marginVertical: 14 },
  heroStatsRow:  { flexDirection: 'row', gap: 8 },
  heroStat:      { flex: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'flex-start' },
  heroStatLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  heroStatValue: { marginTop: 4, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  heroFootRow:   { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroFootText:  { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans },
  demoBadge:     { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  demoBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: Fonts.sans },
  card:          { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionTitle:  { fontSize: 18, fontWeight: '700', fontFamily: Fonts.rounded, letterSpacing: 0.3 },
  gameGrid:      { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gameChip:      { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: '47%' },
  gameChipLabel: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  gameChipSub:   { marginTop: 2, fontSize: 11, fontWeight: '500', fontFamily: Fonts.mono },
  modeRow:       { marginTop: 14, flexDirection: 'row', gap: 10 },
  modeChip:      { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  modeChipText:  { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  luckyButton:   { marginTop: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', gap: 8 },
  luckyButtonText:{ fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans, letterSpacing: 0.2 },
  selectionTray: { marginTop: 16, flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  selectionBall: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  selectionBallText: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
  countBadge:    { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countBadgeText:{ fontSize: 10, fontWeight: '800', fontFamily: Fonts.rounded },
  selectionHint: { marginTop: 10, fontSize: 11, fontWeight: '600', fontFamily: Fonts.sans, letterSpacing: 0.3 },
  sectionLabel:  { fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans, marginBottom: 8, letterSpacing: 0.5 },
  numberGrid:    { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  numberGridVertical: { marginTop: 10, flexDirection: 'column', gap: 6 },
  digitColumn:   { gap: 6, alignItems: 'center' },
  digitColumnsContainer: { marginTop: 12, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row' },
  digitColumnCard: { flex: 1, alignItems: 'center', borderRightWidth: 1, paddingHorizontal: 8 },
  digitPositionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  numberChip:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  numberChipText:{ fontSize: 13, fontWeight: '700', fontFamily: Fonts.rounded },
  stakeRow:      { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  stakeLabel:    { fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans, letterSpacing: 0.3 },
  stakeControlRow:{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stakeButton:   { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  stakeButtonText:{ fontSize: 12, fontWeight: '700', fontFamily: Fonts.rounded, letterSpacing: 0.2 },
  stakeValue:    { fontSize: 20, fontWeight: '900', fontFamily: Fonts.rounded, minWidth: 80, textAlign: 'center' },
  placeBetButton:{ marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  placeBetText:  { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded, letterSpacing: 0.3 },
  noticeText:    { marginTop: 10, fontSize: 12, lineHeight: 18, fontWeight: '600', fontFamily: Fonts.sans },
  resultMeta:    { marginTop: 8, fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans },
  officialRow:   { marginTop: 10, borderRadius: 12, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  officialBall:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  officialBallText:{ fontSize: 13, fontWeight: '700', fontFamily: Fonts.rounded },
  // Jackpot carousel
  jackpotHeader:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  jackpotSubtitle:      { fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 2 },
  jackpotDrawBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  jackpotDrawBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: Fonts.mono },
  jackpotCounter:       { fontSize: 11, fontWeight: '600', fontFamily: Fonts.mono, marginTop: 6 },
  jackpotSlide:         { width: SLIDE_W, borderRadius: 18, padding: 18, marginRight: SLIDE_GAP },
  jackpotSlideTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  jackpotActivePill:    { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  jackpotActivePillText:{ fontSize: 10, fontWeight: '800', fontFamily: Fonts.mono },
  jackpotGameName:      { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  jackpotAmount:        { fontSize: 28, fontWeight: '900', fontFamily: Fonts.rounded, marginBottom: 2 },
  jackpotLabel:         { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans },
  jackpotSlideDivider:  { height: 1, marginVertical: 12 },
  jackpotDetailsRow:    { flexDirection: 'row', gap: 14, marginBottom: 8 },
  jackpotDetailItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jackpotDetailText:    { fontSize: 11, fontWeight: '600', fontFamily: Fonts.mono },
  jackpotStatus:        { fontSize: 11, fontWeight: '600', fontFamily: Fonts.sans, marginBottom: 14 },
  jackpotBetBtn:        { borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  jackpotBetBtnText:    { fontSize: 13, fontWeight: '800', fontFamily: Fonts.rounded },
  dotRow:               { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 14 },
  dot:                  { height: 7, borderRadius: 4 },
  categorySection: { marginTop: 12 },
  categoryLabel:   { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }
});

