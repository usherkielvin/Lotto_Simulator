import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BetMode = 'manual' | 'lucky';
type BetStatus = 'pending' | 'won' | 'lost';

type LottoGame = {
  id: string;
  name: string;
  maxNumber: number;
  drawTime: string;
};

type BetSlip = {
  id: string;
  gameId: string;
  gameName: string;
  numbers: number[];
  stake: number;
  drawDateKey: string;
  placedAt: string;
  status: BetStatus;
  matches?: number;
  payout?: number;
  officialNumbers?: number[];
};

type SettlementResult = {
  changed: boolean;
  settledCount: number;
  totalPayout: number;
  nextBets: BetSlip[];
};

type Palette = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  heroBg: string;
  textStrong: string;
  textSoft: string;
  accent: string;
  accentText: string;
  secondaryButton: string;
  secondaryButtonText: string;
  chipIdle: string;
  chipIdleText: string;
  chipActive: string;
  chipActiveText: string;
  numberIdle: string;
  numberIdleText: string;
  numberSelected: string;
  numberSelectedText: string;
  ticketPending: string;
  ticketWon: string;
  ticketLost: string;
  orbOne: string;
  orbTwo: string;
  stageBg: string;
  payout: string;
  warning: string;
};

const PCSO_GAMES: LottoGame[] = [
  { id: 'lotto-642', name: 'Lotto 6/42', maxNumber: 42, drawTime: '9:00 PM Daily' },
  { id: 'mega-645', name: 'Mega Lotto 6/45', maxNumber: 45, drawTime: '9:00 PM Daily' },
  { id: 'super-649', name: 'Super Lotto 6/49', maxNumber: 49, drawTime: '9:00 PM Daily' },
  { id: 'grand-655', name: 'Grand Lotto 6/55', maxNumber: 55, drawTime: '9:00 PM Daily' },
  { id: 'ultra-658', name: 'Ultra Lotto 6/58', maxNumber: 58, drawTime: '9:00 PM Daily' },
];

const INITIAL_DEMO_BALANCE = 5000;
const MIN_STAKE = 20;
const MAX_STAKE = 500;

function pad2(value: number) {
  return value.toString().padStart(2, '0');
}

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function drawDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 21, 0, 0, 0);
}

function getNextDrawAt(reference: Date) {
  const draw = new Date(reference);
  draw.setHours(21, 0, 0, 0);

  if (reference.getTime() >= draw.getTime()) {
    draw.setDate(draw.getDate() + 1);
  }

  return draw;
}

function getLatestSettledDrawAt(reference: Date) {
  const draw = new Date(reference);
  draw.setHours(21, 0, 0, 0);

  if (reference.getTime() < draw.getTime()) {
    draw.setDate(draw.getDate() - 1);
  }

  return draw;
}

function getCountdownLabel(target: Date, now: Date) {
  const remainingMs = target.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return 'Draw lock in progress';
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function seededRandom(seed: string) {
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;
    return (hash >>> 0) / 4294967295;
  };
}

function pickUniqueNumbers(maxNumber: number, count: number, randomFn: () => number = Math.random) {
  const picked = new Set<number>();

  while (picked.size < count) {
    picked.add(Math.floor(randomFn() * maxNumber) + 1);
  }

  return Array.from(picked).sort((a, b) => a - b);
}

function buildOfficialNumbers(game: LottoGame, drawDateKey: string) {
  const randomFn = seededRandom(`pcso:${game.id}:${drawDateKey}`);
  return pickUniqueNumbers(game.maxNumber, 6, randomFn);
}

function getMatchCount(first: number[], second: number[]) {
  const secondSet = new Set(second);
  return first.filter((value) => secondSet.has(value)).length;
}

function getPayout(matches: number, stake: number) {
  switch (matches) {
    case 6:
      return stake * 50000;
    case 5:
      return stake * 5000;
    case 4:
      return stake * 500;
    case 3:
      return stake * 50;
    default:
      return 0;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function settleBets(bets: BetSlip[], now: Date): SettlementResult {
  let changed = false;
  let settledCount = 0;
  let totalPayout = 0;

  const nextBets = bets.map((bet) => {
    if (bet.status !== 'pending') {
      return bet;
    }

    const drawAt = drawDateFromKey(bet.drawDateKey);

    if (now.getTime() < drawAt.getTime()) {
      return bet;
    }

    const game = PCSO_GAMES.find((entry) => entry.id === bet.gameId);

    if (!game) {
      return bet;
    }

    const officialNumbers = buildOfficialNumbers(game, bet.drawDateKey);
    const matches = getMatchCount(bet.numbers, officialNumbers);
    const payout = getPayout(matches, bet.stake);

    changed = true;
    settledCount += 1;
    totalPayout += payout;

    return {
      ...bet,
      status: payout > 0 ? 'won' : 'lost',
      matches,
      payout,
      officialNumbers,
    };
  });

  return {
    changed,
    settledCount,
    totalPayout,
    nextBets,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, demo } = useLocalSearchParams<{ user?: string; demo?: string }>();
  const colorScheme = useColorScheme();

  const [selectedGameId, setSelectedGameId] = useState(PCSO_GAMES[0].id);
  const [betMode, setBetMode] = useState<BetMode>('manual');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [stake, setStake] = useState(MIN_STAKE);
  const [balance, setBalance] = useState(INITIAL_DEMO_BALANCE);
  const [bets, setBets] = useState<BetSlip[]>([]);
  const [notice, setNotice] = useState('Select a game, pick six numbers, and place your demo bet.');
  const [now, setNow] = useState(() => new Date());

  const boardPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const selectedGame = useMemo(
    () => PCSO_GAMES.find((game) => game.id === selectedGameId) ?? PCSO_GAMES[0],
    [selectedGameId],
  );

  const numberOptions = useMemo(
    () => Array.from({ length: selectedGame.maxNumber }, (_, index) => index + 1),
    [selectedGame.maxNumber],
  );

  useEffect(() => {
    setSelectedNumbers([]);
  }, [selectedGameId]);

  useEffect(() => {
    const settlement = settleBets(bets, now);

    if (!settlement.changed) {
      return;
    }

    setBets(settlement.nextBets);

    if (settlement.totalPayout > 0) {
      setBalance((current) => current + settlement.totalPayout);
      setNotice(
        `${settlement.settledCount} ticket(s) settled. You won ${formatCurrency(settlement.totalPayout)} from the 9:00 PM draw.`,
      );
      return;
    }

    setNotice(`${settlement.settledCount} ticket(s) settled with no win. Try another combination for tonight.`);
  }, [bets, now]);

  const palette: Palette =
    colorScheme === 'dark'
      ? {
          screenBg: '#08152c',
          cardBg: '#0f2344',
          cardBorder: '#23477e',
          heroBg: '#0d3a78',
          textStrong: '#edf4ff',
          textSoft: '#a9c2e6',
          accent: '#f4b400',
          accentText: '#2e2604',
          secondaryButton: '#1a63c2',
          secondaryButtonText: '#ecf4ff',
          chipIdle: '#14315f',
          chipIdleText: '#bdd2ef',
          chipActive: '#f4b400',
          chipActiveText: '#2f2706',
          numberIdle: '#143160',
          numberIdleText: '#c8daef',
          numberSelected: '#f4b400',
          numberSelectedText: '#2f2606',
          ticketPending: '#0e4b9b',
          ticketWon: '#0f8455',
          ticketLost: '#8d2f3e',
          orbOne: '#0e2d5d',
          orbTwo: '#123c73',
          stageBg: '#0a1b35',
          payout: '#84e4b7',
          warning: '#ffb670',
        }
      : {
          screenBg: '#edf3ff',
          cardBg: '#ffffff',
          cardBorder: '#cadbf5',
          heroBg: '#0f4ea9',
          textStrong: '#15305e',
          textSoft: '#5a7299',
          accent: '#f4b400',
          accentText: '#342906',
          secondaryButton: '#1260c4',
          secondaryButtonText: '#eff5ff',
          chipIdle: '#e3edfd',
          chipIdleText: '#335d92',
          chipActive: '#f4b400',
          chipActiveText: '#332905',
          numberIdle: '#e7effd',
          numberIdleText: '#2f578c',
          numberSelected: '#f4b400',
          numberSelectedText: '#342906',
          ticketPending: '#dbeafe',
          ticketWon: '#d5f5e7',
          ticketLost: '#ffe1e4',
          orbOne: '#cadffd',
          orbTwo: '#dde9ff',
          stageBg: '#f2f7ff',
          payout: '#0f7a4f',
          warning: '#a86000',
        };

  const nextDrawAt = getNextDrawAt(now);
  const nextDrawDateKey = toLocalDateKey(nextDrawAt);
  const nextDrawLabel = nextDrawAt.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const latestSettledDrawAt = getLatestSettledDrawAt(now);
  const latestSettledDrawKey = toLocalDateKey(latestSettledDrawAt);
  const latestOfficialNumbers = buildOfficialNumbers(selectedGame, latestSettledDrawKey);

  const countdownLabel = getCountdownLabel(nextDrawAt, now);

  const displayName = user?.toString().trim() || 'Demo Player';
  const isDemoUser = demo === '1';

  const selectedBallSet = new Set(selectedNumbers);

  const triggerBoardPulse = () => {
    Animated.sequence([
      Animated.timing(boardPulse, {
        toValue: 0.97,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(boardPulse, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const createLuckyPick = () => {
    const luckyNumbers = pickUniqueNumbers(selectedGame.maxNumber, 6);
    setSelectedNumbers(luckyNumbers);
    setNotice(`Lucky pick ready: ${luckyNumbers.join(' - ')}`);
    triggerBoardPulse();
  };

  const toggleManualNumber = (value: number) => {
    if (betMode !== 'manual') {
      return;
    }

    setSelectedNumbers((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }

      if (current.length >= 6) {
        return current;
      }

      return [...current, value].sort((a, b) => a - b);
    });
  };

  const changeStake = (delta: number) => {
    setStake((current) => Math.min(MAX_STAKE, Math.max(MIN_STAKE, current + delta)));
  };

  const placeBet = () => {
    const drawDateKey = nextDrawDateKey;
    const drawCutoff = drawDateFromKey(drawDateKey);

    if (now.getTime() >= drawCutoff.getTime()) {
      setNotice('Betting is locked for this draw. Please wait for the next 9:00 PM round.');
      return;
    }

    const activeNumbers =
      betMode === 'lucky'
        ? selectedNumbers.length === 6
          ? selectedNumbers
          : pickUniqueNumbers(selectedGame.maxNumber, 6)
        : selectedNumbers;

    if (activeNumbers.length !== 6) {
      setNotice('Select exactly six numbers before placing your bet.');
      return;
    }

    if (balance < stake) {
      setNotice('Insufficient demo credits. Lower your stake or reset the app session.');
      return;
    }

    const ticket: BetSlip = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      numbers: [...activeNumbers].sort((a, b) => a - b),
      stake,
      drawDateKey,
      placedAt: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
      status: 'pending',
    };

    setBets((current) => [ticket, ...current].slice(0, 30));
    setBalance((current) => current - stake);

    if (betMode === 'manual') {
      setSelectedNumbers([]);
    } else {
      setSelectedNumbers(activeNumbers);
    }

    setNotice(`Bet placed for ${selectedGame.name} on ${drawDateKey} 9:00 PM. Stake: ${formatCurrency(stake)}.`);
    triggerBoardPulse();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
      <View style={[styles.orbTop, { backgroundColor: palette.orbOne }]} />
      <View style={[styles.orbBottom, { backgroundColor: palette.orbTwo }]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: palette.heroBg }]}> 
          <View style={styles.heroRow}>
            <View>
              <Text style={[styles.heroTag, { color: palette.textSoft }]}>PCSO LOTTO SIMULATOR</Text>
              <Text style={[styles.heroTitle, { color: palette.textStrong }]}>{displayName}</Text>
              <Text style={[styles.heroSubTitle, { color: palette.textSoft }]}>Daily 9:00 PM draw tracking</Text>
            </View>

            <Pressable
              onPress={() => router.replace('/')}
              style={[styles.logoutButton, { backgroundColor: palette.secondaryButton }]}>
              <Ionicons name="exit-outline" size={15} color={palette.secondaryButtonText} />
              <Text style={[styles.logoutText, { color: palette.secondaryButtonText }]}>Logout</Text>
            </Pressable>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={[styles.heroStat, { backgroundColor: palette.stageBg }]}> 
              <Text style={[styles.heroStatLabel, { color: palette.textSoft }]}>Demo Balance</Text>
              <Text style={[styles.heroStatValue, { color: palette.accent }]}>{formatCurrency(balance)}</Text>
            </View>
            <View style={[styles.heroStat, { backgroundColor: palette.stageBg }]}> 
              <Text style={[styles.heroStatLabel, { color: palette.textSoft }]}>Next Draw</Text>
              <Text style={[styles.heroStatValue, { color: palette.accent }]}>{countdownLabel}</Text>
            </View>
          </View>

          <Text style={[styles.drawMeta, { color: palette.textSoft }]}>Draw lock: {nextDrawLabel}</Text>
          <Text style={[styles.drawSource, { color: palette.textSoft }]}>Result basis: official 9:00 PM schedule in demo mode.</Text>

          {isDemoUser ? (
            <View style={[styles.demoBadge, { backgroundColor: palette.accent }]}>
              <Ionicons name="person-circle-outline" size={14} color={palette.accentText} />
              <Text style={[styles.demoBadgeText, { color: palette.accentText }]}>Demo Account Active</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}> 
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Choose Lotto Game</Text>
          <View style={styles.gameGrid}>
            {PCSO_GAMES.map((game) => {
              const active = game.id === selectedGame.id;

              return (
                <Pressable
                  key={game.id}
                  onPress={() => setSelectedGameId(game.id)}
                  style={[
                    styles.gameChip,
                    { backgroundColor: active ? palette.chipActive : palette.chipIdle },
                  ]}>
                  <Text
                    style={[
                      styles.gameChipLabel,
                      { color: active ? palette.chipActiveText : palette.chipIdleText },
                    ]}>
                    {game.name}
                  </Text>
                  <Text
                    style={[
                      styles.gameChipSub,
                      { color: active ? palette.chipActiveText : palette.chipIdleText },
                    ]}>
                    {game.drawTime}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Animated.View
          style={[
            styles.card,
            { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
            { transform: [{ scale: boardPulse }] },
          ]}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Build Your Bet Slip</Text>

          <View style={styles.modeRow}>
            <Pressable
              style={[
                styles.modeChip,
                { backgroundColor: betMode === 'manual' ? palette.chipActive : palette.chipIdle },
              ]}
              onPress={() => setBetMode('manual')}>
              <Text
                style={[
                  styles.modeChipText,
                  { color: betMode === 'manual' ? palette.chipActiveText : palette.chipIdleText },
                ]}>
                Manual Pick
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeChip,
                { backgroundColor: betMode === 'lucky' ? palette.chipActive : palette.chipIdle },
              ]}
              onPress={() => {
                setBetMode('lucky');
                createLuckyPick();
              }}>
              <Text
                style={[
                  styles.modeChipText,
                  { color: betMode === 'lucky' ? palette.chipActiveText : palette.chipIdleText },
                ]}>
                Lucky Pick
              </Text>
            </Pressable>
          </View>

          {betMode === 'lucky' ? (
            <Pressable
              style={[styles.luckyButton, { backgroundColor: palette.secondaryButton }]}
              onPress={createLuckyPick}>
              <Ionicons name="shuffle-outline" size={16} color={palette.secondaryButtonText} />
              <Text style={[styles.luckyButtonText, { color: palette.secondaryButtonText }]}>Generate New Lucky Pick</Text>
            </Pressable>
          ) : null}

          <View style={styles.selectionTray}>
            {Array.from({ length: 6 }).map((_, index) => {
              const value = selectedNumbers[index];
              return (
                <View key={`slot-${index}`} style={[styles.selectionBall, { backgroundColor: palette.stageBg }]}> 
                  <Text style={[styles.selectionBallText, { color: palette.textStrong }]}>{value ?? '--'}</Text>
                </View>
              );
            })}
          </View>

          <Text style={[styles.selectionHint, { color: palette.textSoft }]}>Selected {selectedNumbers.length} of 6 numbers</Text>

          <View style={styles.numberGrid}>
            {numberOptions.map((value) => {
              const chosen = selectedBallSet.has(value);

              return (
                <Pressable
                  key={`num-${value}`}
                  onPress={() => toggleManualNumber(value)}
                  disabled={betMode !== 'manual'}
                  style={[
                    styles.numberChip,
                    {
                      backgroundColor: chosen ? palette.numberSelected : palette.numberIdle,
                      opacity: betMode === 'manual' ? 1 : 0.45,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.numberChipText,
                      { color: chosen ? palette.numberSelectedText : palette.numberIdleText },
                    ]}>
                    {value}
                  </Text>
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

          <Pressable style={[styles.placeBetButton, { backgroundColor: palette.accent }]} onPress={placeBet}>
            <Ionicons name="ticket-outline" size={16} color={palette.accentText} />
            <Text style={[styles.placeBetText, { color: palette.accentText }]}>Place Bet for 9:00 PM Draw</Text>
          </Pressable>

          <Text style={[styles.noticeText, { color: palette.warning }]}>{notice}</Text>
        </Animated.View>

        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}> 
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Latest Official 9:00 PM Result</Text>
          <Text style={[styles.resultMeta, { color: palette.textSoft }]}>{selectedGame.name} - {latestSettledDrawKey}</Text>

          <View style={[styles.officialRow, { backgroundColor: palette.stageBg }]}>
            {latestOfficialNumbers.map((value) => (
              <View key={`official-${value}`} style={[styles.officialBall, { backgroundColor: palette.secondaryButton }]}>
                <Text style={[styles.officialBallText, { color: palette.secondaryButtonText }]}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.resultMeta, { color: palette.textSoft }]}>Your pending bets auto-settle right after 9:00 PM.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}> 
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Your Bet Tickets</Text>

          {bets.length === 0 ? (
            <Text style={[styles.emptyTickets, { color: palette.textSoft }]}>No tickets yet. Place your first demo bet to start tracking outcomes.</Text>
          ) : (
            bets.map((bet) => {
              const statusColor =
                bet.status === 'pending'
                  ? palette.ticketPending
                  : bet.status === 'won'
                    ? palette.ticketWon
                    : palette.ticketLost;

              return (
                <View key={bet.id} style={[styles.ticketCard, { backgroundColor: statusColor }]}> 
                  <View style={styles.ticketHeader}>
                    <Text style={[styles.ticketGame, { color: palette.textStrong }]}>{bet.gameName}</Text>
                    <Text style={[styles.ticketStatus, { color: palette.textStrong }]}>{bet.status.toUpperCase()}</Text>
                  </View>

                  <Text style={[styles.ticketMeta, { color: palette.textStrong }]}>Draw Date: {bet.drawDateKey} 9:00 PM</Text>
                  <Text style={[styles.ticketMeta, { color: palette.textStrong }]}>Placed: {bet.placedAt}</Text>

                  <View style={styles.ticketNumbersRow}>
                    {bet.numbers.map((value, index) => (
                      <View key={`${bet.id}-pick-${value}-${index}`} style={[styles.ticketNumberBall, { backgroundColor: palette.stageBg }]}>
                        <Text style={[styles.ticketNumberText, { color: palette.textStrong }]}>{value}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.ticketMeta, { color: palette.textStrong }]}>Stake: {formatCurrency(bet.stake)}</Text>

                  {bet.status !== 'pending' ? (
                    <>
                      <Text style={[styles.ticketMeta, { color: palette.textStrong }]}>Matches: {bet.matches ?? 0}</Text>
                      <Text style={[styles.ticketMeta, { color: palette.textStrong }]}>Official: {(bet.officialNumbers ?? []).join(' - ')}</Text>
                      <Text style={[styles.ticketPayout, { color: palette.payout }]}>Payout: {formatCurrency(bet.payout ?? 0)}</Text>
                    </>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  orbTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -85,
    opacity: 0.55,
  },
  orbBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    left: -130,
    bottom: -130,
    opacity: 0.42,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: Fonts.mono,
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  heroSubTitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.sans,
  },
  logoutButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  heroStatsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  heroStat: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: Fonts.mono,
  },
  heroStatValue: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  drawMeta: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  drawSource: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.sans,
  },
  demoBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  gameGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gameChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: '47%',
  },
  gameChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  gameChipSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Fonts.mono,
  },
  modeRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  luckyButton: {
    marginTop: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 7,
  },
  luckyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  selectionTray: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  selectionBall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBallText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  selectionHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  numberGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  numberChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberChipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  stakeRow: {
    marginTop: 12,
  },
  stakeLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  stakeControlRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stakeButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stakeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  stakeValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  placeBetButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  placeBetText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  noticeText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  resultMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.sans,
  },
  officialRow: {
    marginTop: 10,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  officialBall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialBallText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  emptyTickets: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: Fonts.sans,
  },
  ticketCard: {
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  ticketGame: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  ticketStatus: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    fontFamily: Fonts.mono,
  },
  ticketMeta: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  ticketNumbersRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ticketNumberBall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketNumberText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  ticketPayout: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
});
