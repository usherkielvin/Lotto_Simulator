import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(key: string): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return `${m}/${d}/${y}`;
}

function formatJackpot(amount: number): string {
  if (amount >= 1_000_000) {
    return `₱${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatJackpotFull(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatJackpotInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

function stripJackpotInput(formatted: string): number | undefined {
  const digits = formatted.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : undefined;
}

const DIGIT_GAME_IDS = ['2d-ez2', '3d-swertres', '4digit', '6digit'];
const isDigitGame = (id: string) => DIGIT_GAME_IDS.includes(id);

// ─── Types ────────────────────────────────────────────────────────────────────
type LottoGame = { id: string; name: string; drawTime: string; maxNumber: number };
type OfficialResult = {
  id: number;
  gameId: string;
  drawDateKey: string;
  drawTime: string;
  numbers: string;
  jackpot?: number;
  winners?: number;
};
type GameResult = {
  id: string;
  name: string;
  jackpot: number;
  jackpotStatus: string;
  drawTime: string;
  drawDays: string;
  maxNumber: number;
  results: { drawDateKey: string; drawTime: string; numbers: string; winners: number; jackpot?: number }[];
};

// ─── Number Ball Input ────────────────────────────────────────────────────────
function NumberBallInput({
  game, value, onChange, onFocus, palette,
}: {
  game: LottoGame | undefined;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  const p = palette;
  if (!game) return null;
  const digit = isDigitGame(game.id);
  const count = game.id === '2d-ez2' ? 2 : game.id === '3d-swertres' ? 3 : game.id === '4digit' ? 4 : 6;
  const maxLen = digit ? 1 : 2;
  const parts = value.split(',').map(s => s.trim());
  while (parts.length < count) parts.push('');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const refs = useRef<(TextInput | null)[]>([]);

  const update = (idx: number, val: string) => {
    let cleaned = val.replace(/[^0-9]/g, '');
    if (!digit && cleaned !== '') {
      const num = parseInt(cleaned, 10);
      if (num > game.maxNumber) cleaned = game.maxNumber.toString();
    }
    const next = [...parts];
    next[idx] = cleaned.slice(0, maxLen);
    onChange(next.join(','));
    if (cleaned.length >= maxLen && idx < count - 1) {
      requestAnimationFrame(() => refs.current[idx + 1]?.focus());
    }
  };

  const handleKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace' && parts[idx] === '' && idx > 0) refs.current[idx - 1]?.focus();
  };

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={[nb.digitWrap, { backgroundColor: p.stageBg, borderColor: parts[i] ? p.accent : p.cardBorder, width: digit ? 48 : 54 }]}>
            <TextInput
              ref={r => { refs.current[i] = r; }}
              style={[nb.digitInput, { color: p.textStrong, fontFamily: Fonts.mono, fontSize: digit ? 22 : 18 }]}
              keyboardType="number-pad"
              maxLength={maxLen}
              value={parts[i]}
              onChangeText={v => update(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              onFocus={onFocus}
              placeholder={digit ? '0' : '00'}
              placeholderTextColor={p.textSoft}
              textAlign="center"
              selectTextOnFocus
            />
          </View>
        ))}
      </View>
      {parts.some(v => v !== '') && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {parts.map((n, i) => (
            <View key={i} style={[nb.ball, { backgroundColor: n ? p.accent : p.chipIdle }]}>
              <Text style={[nb.ballText, { color: n ? p.accentText : p.textSoft }]}>{n || '?'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const nb = StyleSheet.create({
  ball:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ballText:  { fontSize: 13, fontWeight: '800', fontFamily: Fonts.mono },
  digitWrap: { width: 48, height: 52, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  digitInput:{ fontSize: 22, fontWeight: '800', width: '100%', textAlign: 'center' },
});

// ─── Big Lotto Highlight Card ─────────────────────────────────────────────────
function BigLottoCard({ game, palette }: { game: GameResult; palette: ReturnType<typeof usePalette> }) {
  const p = palette;
  const latest = game.results[0];
  const balls = latest?.numbers.split(',').map(s => s.trim()).filter(Boolean) ?? [];
  const jackpotAmt = latest?.jackpot ?? game.jackpot;

  return (
    <View style={[bl.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
      {/* Top row: name + jackpot */}
      <View style={bl.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[bl.gameName, { color: p.textStrong }]}>{game.name}</Text>
          {latest ? (
            <Text style={[bl.dateLine, { color: p.textSoft }]}>{formatDate(latest.drawDateKey)} · {latest.drawTime}</Text>
          ) : (
            <Text style={[bl.dateLine, { color: p.textSoft }]}>No results yet</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[bl.jackpotAmt, { color: p.accent }]}>{formatJackpot(jackpotAmt)}</Text>
          {latest && (latest.winners ?? 0) > 0 ? (
            <View style={[bl.winBadge, { backgroundColor: p.payout + '22' }]}>
              <Ionicons name="trophy" size={10} color={p.payout} />
              <Text style={[bl.winText, { color: p.payout }]}>{latest.winners} Winner{latest.winners !== 1 ? 's' : ''}</Text>
            </View>
          ) : (
            <Text style={[bl.noWin, { color: p.textSoft }]}>{game.jackpotStatus}</Text>
          )}
        </View>
      </View>

      {/* Number balls */}
      {balls.length > 0 ? (
        <View style={bl.ballsRow}>
          {balls.map((n, i) => (
            <View key={i} style={[bl.ball, { backgroundColor: p.accent }]}>
              <Text style={[bl.ballNum, { color: p.accentText }]}>{n}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[bl.noBalls, { backgroundColor: p.stageBg }]}>
          <Text style={[bl.noBallsText, { color: p.textSoft }]}>Awaiting draw results</Text>
        </View>
      )}
    </View>
  );
}

const bl = StyleSheet.create({
  card:      { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  topRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  gameName:  { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  dateLine:  { fontSize: 11, fontWeight: '500', fontFamily: Fonts.mono, marginTop: 2 },
  jackpotAmt:{ fontSize: 18, fontWeight: '900', fontFamily: Fonts.mono },
  winBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  winText:   { fontSize: 11, fontWeight: '700', fontFamily: Fonts.sans },
  noWin:     { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans },
  ballsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ball:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ballNum:   { fontSize: 13, fontWeight: '900', fontFamily: Fonts.mono },
  noBalls:   { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  noBallsText:{ fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans },
});

// ─── Small Game (3D/2D) Row ───────────────────────────────────────────────────
function SmallGameRow({ game, palette }: { game: GameResult; palette: ReturnType<typeof usePalette> }) {
  const p = palette;
  // Group latest results by draw time (show today's draws)
  const latest = game.results.slice(0, 3);
  const drawTimes = game.drawTime.split(',').map(t => t.trim());

  return (
    <View style={[sg.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
      <View style={sg.header}>
        <View style={[sg.iconWrap, { backgroundColor: p.payout + '22' }]}>
          <Ionicons name="dice-outline" size={16} color={p.payout} />
        </View>
        <Text style={[sg.gameName, { color: p.textStrong }]}>{game.name}</Text>
        <Text style={[sg.drawInfo, { color: p.textSoft }]}>{drawTimes.length}x daily</Text>
      </View>

      <View style={sg.drawsRow}>
        {drawTimes.map(time => {
          const result = latest.find(r => r.drawTime.toLowerCase() === time.toLowerCase());
          const balls = result?.numbers.split(',').map(s => s.trim()).filter(Boolean) ?? [];
          return (
            <View key={time} style={[sg.drawSlot, { backgroundColor: p.stageBg }]}>
              <Text style={[sg.slotTime, { color: p.textSoft }]}>{time}</Text>
              {balls.length > 0 ? (
                <View style={sg.slotBalls}>
                  {balls.map((n, i) => (
                    <View key={i} style={[sg.slotBall, { backgroundColor: p.payout + '33', borderColor: p.payout + '55' }]}>
                      <Text style={[sg.slotBallNum, { color: p.payout }]}>{n}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[sg.pending, { color: p.textSoft }]}>—</Text>
              )}
              {result && (result.winners ?? 0) > 0 && (
                <View style={[sg.winnerPill, { backgroundColor: p.payout + '22' }]}>
                  <Text style={[sg.winnerPillText, { color: p.payout }]}>{result.winners}W</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const sg = StyleSheet.create({
  card:        { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  gameName:    { flex: 1, fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  drawInfo:    { fontSize: 11, fontWeight: '600', fontFamily: Fonts.mono },
  drawsRow:    { flexDirection: 'row', gap: 8 },
  drawSlot:    { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 6, minHeight: 80 },
  slotTime:    { fontSize: 10, fontWeight: '700', fontFamily: Fonts.mono, textTransform: 'uppercase' },
  slotBalls:   { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  slotBall:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  slotBallNum: { fontSize: 12, fontWeight: '900', fontFamily: Fonts.mono },
  pending:     { fontSize: 18, fontWeight: '300', color: '#888' },
  winnerPill:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  winnerPillText:{ fontSize: 9, fontWeight: '800', fontFamily: Fonts.mono },
});

// ─── Result Card (for manage list) ───────────────────────────────────────────
function ResultCard({
  result, gameName, onEdit, onDelete, palette,
}: {
  result: OfficialResult;
  gameName: string;
  onEdit: () => void;
  onDelete: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  const p = palette;
  const balls = result.numbers.split(',').map(s => s.trim()).filter(Boolean);
  const digit = isDigitGame(result.gameId);
  return (
    <View style={[rc.row, { borderColor: p.cardBorder }]}>
      <View style={{ flex: 1 }}>
        <Text style={[rc.game, { color: p.textStrong }]}>{gameName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={[rc.date, { color: p.textSoft }]}>{formatDate(result.drawDateKey)}</Text>
          <View style={[rc.timeBadge, { backgroundColor: p.chipIdle }]}>
            <Ionicons name="time-outline" size={10} color={p.chipIdleText} />
            <Text style={[rc.badgeText, { color: p.chipIdleText }]}>{result.drawTime}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {balls.map((n, i) => (
            <View key={i} style={[nb.ball, { backgroundColor: p.secondaryButton, width: 28, height: 28, borderRadius: 14 }]}>
              <Text style={[nb.ballText, { color: p.secondaryButtonText, fontSize: 11 }]}>{n}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={rc.rightCol}>
        {result.jackpot != null ? (
          <View style={[rc.jackpotBadge, { backgroundColor: digit ? p.payout + '18' : p.accent + '18', borderColor: digit ? p.payout + '40' : p.accent + '40' }]}>
            <Ionicons name={digit ? 'cash-outline' : 'trophy-outline'} size={10} color={digit ? p.payout : p.accent} />
            <Text style={[rc.jackpotText, { color: digit ? p.payout : p.accent }]}>{formatJackpotFull(result.jackpot)}</Text>
          </View>
        ) : <View style={{ height: 22 }} />}
        {(result.winners ?? 0) > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="trophy" size={10} color={p.accent} />
            <Text style={[rc.badgeText, { color: p.accent }]}>winners: {result.winners}</Text>
          </View>
        ) : (
          <Text style={[rc.badgeText, { color: p.textSoft }]}>Accumulating</Text>
        )}
        <View style={rc.actions}>
          <Pressable onPress={onEdit} style={[rc.iconBtn, { backgroundColor: p.chipIdle }]}>
            <Ionicons name="pencil-outline" size={14} color={p.chipIdleText} />
          </Pressable>
          <Pressable onPress={onDelete} style={[rc.iconBtn, { backgroundColor: p.chipIdle }]}>
            <Ionicons name="trash-outline" size={14} color={p.warning} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, gap: 10 },
  game:        { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  date:        { fontSize: 11, fontWeight: '500', fontFamily: Fonts.mono },
  timeBadge:   { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  badgeText:   { fontSize: 9, fontWeight: '700', fontFamily: Fonts.mono },
  rightCol:    { alignItems: 'flex-end', gap: 8 },
  jackpotBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  jackpotText: { fontSize: 11, fontWeight: '800', fontFamily: Fonts.mono },
  actions:     { flexDirection: 'row', gap: 6 },
  iconBtn:     { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { session } = useSession();

  // Dashboard data
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [loadingDash, setLoadingDash] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Manage results
  const [activeTab, setActiveTab] = useState<'home' | 'manage'>('home');
  const [games, setGames] = useState<LottoGame[]>([]);
  const [results, setResults] = useState<OfficialResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [filterCategory, setFilterCategory] = useState<'all' | 'lotto' | 'digit'>('all');
  const [filterGameId, setFilterGameId] = useState('all');

  // Add/Edit form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OfficialResult | null>(null);
  const [gameId, setGameId] = useState('');
  const [drawDate, setDrawDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [drawTime, setDrawTime] = useState('9:00 PM');
  const [numbers, setNumbers] = useState('');
  const [jackpotAmount, setJackpotAmount] = useState('');
  const [winnersCount, setWinnersCount] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showGamePicker, setShowGamePicker] = useState(false);

  // Import modal
  const [importVisible, setImportVisible] = useState(false);
  const [manualData, setManualData] = useState('');
  const [importing, setImporting] = useState(false);

  const formScrollRef = useRef<ScrollView>(null);
  const drawDateKey = [
    drawDate.getFullYear(),
    String(drawDate.getMonth() + 1).padStart(2, '0'),
    String(drawDate.getDate()).padStart(2, '0'),
  ].join('-');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingDash(true);
    try {
      const data = await apiFetch<GameResult[]>('/games/results');
      setGameResults(data);
    } catch { /* ignore */ }
    finally { setLoadingDash(false); setRefreshing(false); }
  }, []);

  const fetchResults = useCallback(async () => {
    if (!session?.userId) return;
    setLoadingResults(true);
    try {
      const data = await apiFetch<OfficialResult[]>('/admin/results', { userId: session.userId });
      setResults(data.sort((a, b) =>
        b.drawDateKey.localeCompare(a.drawDateKey) || b.drawTime.localeCompare(a.drawTime)
      ));
    } catch { /* ignore */ }
    finally { setLoadingResults(false); }
  }, [session?.userId]);

  useEffect(() => {
    apiFetch<LottoGame[]>('/games').then(setGames).catch(() => {});
    loadDashboard();
    fetchResults();
  }, [loadDashboard, fetchResults]);

  if (session?.role !== 'admin') {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
        <View style={s.center}>
          <Ionicons name="lock-closed" size={48} color={p.textSoft} />
          <Text style={[s.emptyText, { color: p.textSoft }]}>Admin access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedGame = games.find(g => g.id === gameId);
  const availableDrawTimes = selectedGame?.drawTime.split(',').map(t => t.trim()) ?? ['9:00 PM'];

  const bigLottos = gameResults.filter(g => !isDigitGame(g.id));
  const smallGames = gameResults.filter(g => isDigitGame(g.id));

  // Stats
  const totalResults = results.length;
  const totalWinners = results.reduce((sum, r) => sum + (r.winners ?? 0), 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayResults = results.filter(r => r.drawDateKey === todayKey).length;

  const openAdd = () => {
    setEditTarget(null);
    const firstGame = games[0];
    setGameId(firstGame?.id ?? '');
    setDrawDate(new Date());
    const times = firstGame?.drawTime.split(',').map(t => t.trim()) ?? ['9:00 PM'];
    setDrawTime(times[times.length - 1]);
    setNumbers(''); setJackpotAmount(''); setWinnersCount(''); setMessage('');
    setShowGamePicker(false);
    setIsFormOpen(true);
  };

  const openEdit = (r: OfficialResult) => {
    setEditTarget(r);
    setGameId(r.gameId);
    setDrawDate(new Date(r.drawDateKey + 'T12:00:00'));
    setDrawTime(r.drawTime ?? '9:00 PM');
    setNumbers(r.numbers);
    setJackpotAmount(r.jackpot != null ? Number(r.jackpot).toLocaleString('en-US') : '');
    setWinnersCount(r.winners != null ? String(r.winners) : '');
    setMessage(''); setShowGamePicker(false);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    const balls = numbers.split(',').map(s => s.trim()).filter(Boolean);
    if (!gameId || !drawDateKey || balls.length === 0) { setMessage('All fields are required.'); return; }
    setSaving(true); setMessage('');
    try {
      await apiFetch('/admin/results', {
        method: 'POST',
        userId: session!.userId,
        body: { gameId, drawDateKey, drawTime, numbers: balls.join(','), jackpot: stripJackpotInput(jackpotAmount), winners: winnersCount ? parseInt(winnersCount, 10) : undefined },
      });
      setIsFormOpen(false);
      fetchResults();
      loadDashboard();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to save result.');
    } finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Result', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/admin/results/${id}`, { method: 'DELETE', userId: session!.userId });
          setResults(prev => prev.filter(r => r.id !== id));
          loadDashboard();
        } catch { /* ignore */ }
      }},
    ]);
  };

  const handleImport = async () => {
    if (!manualData.trim()) return;
    setImporting(true);
    try {
      const data = await apiFetch<{ imported: number; skipped: number; winners: number }>('/admin/import', {
        method: 'POST', userId: session!.userId, body: { text: manualData },
      });
      setManualData(''); setImportVisible(false);
      fetchResults(); loadDashboard();
      Alert.alert('Import Complete', `Imported: ${data.imported}  Skipped: ${data.skipped}${data.winners > 0 ? `\nWinners settled: ${data.winners}` : ''}`);
    } catch (e: unknown) {
      Alert.alert('Import Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally { setImporting(false); }
  };

  const gameName = (id: string) => games.find(g => g.id === id)?.name ?? id;

  const filtered = results.filter(r => {
    if (filterGameId !== 'all') return r.gameId === filterGameId;
    if (filterCategory === 'all') return true;
    const digit = isDigitGame(r.gameId);
    return filterCategory === 'digit' ? digit : !digit;
  });

  const availableGames = filterCategory === 'all'
    ? games
    : games.filter(g => filterCategory === 'digit' ? isDigitGame(g.id) : !isDigitGame(g.id));

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]} edges={['top']}>
      {/* ── Top Header ── */}
      <View style={[s.topBar, { backgroundColor: p.screenBg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.topTitle, { color: p.textStrong }]}>Admin</Text>
          <Text style={[s.topSub, { color: p.textSoft }]}>PCSO Lotto Dashboard</Text>
        </View>
        <View style={s.topActions}>
          <Pressable style={[s.iconBtn, { backgroundColor: p.chipIdle }]} onPress={() => setImportVisible(true)}>
            <Ionicons name="clipboard-outline" size={20} color={p.chipIdleText} />
          </Pressable>
          <Pressable style={[s.addBtn, { backgroundColor: p.accent }]} onPress={openAdd}>
            <Ionicons name="add" size={20} color={p.accentText} />
            <Text style={[s.addBtnText, { color: p.accentText }]}>Add Result</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={[s.tabBar, { borderBottomColor: p.cardBorder }]}>
        {(['home', 'manage'] as const).map(tab => {
          const active = activeTab === tab;
          return (
            <Pressable key={tab} style={[s.tab, active && { borderBottomColor: p.accent, borderBottomWidth: 2 }]} onPress={() => setActiveTab(tab)}>
              <Ionicons
                name={tab === 'home' ? 'grid-outline' : 'list-outline'}
                size={16}
                color={active ? p.accent : p.textSoft}
              />
              <Text style={[s.tabText, { color: active ? p.accent : p.textSoft }]}>
                {tab === 'home' ? 'Dashboard' : 'Manage'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'home' ? (
        /* ══════════════════════════════════════════════════════════════════
           HOME / DASHBOARD TAB
        ══════════════════════════════════════════════════════════════════ */
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={p.accent} />}
        >
          {/* Stats Row */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
              <Ionicons name="layers-outline" size={18} color={p.accent} />
              <Text style={[s.statVal, { color: p.textStrong }]}>{totalResults}</Text>
              <Text style={[s.statLbl, { color: p.textSoft }]}>Total Draws</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
              <Ionicons name="today-outline" size={18} color={p.secondaryButton} />
              <Text style={[s.statVal, { color: p.textStrong }]}>{todayResults}</Text>
              <Text style={[s.statLbl, { color: p.textSoft }]}>Today</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
              <Ionicons name="trophy-outline" size={18} color={p.payout} />
              <Text style={[s.statVal, { color: p.textStrong }]}>{totalWinners}</Text>
              <Text style={[s.statLbl, { color: p.textSoft }]}>Winners</Text>
            </View>
          </View>

          {/* Big Lottos Section */}
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: p.accent + '22' }]}>
              <Ionicons name="trophy" size={16} color={p.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.sectionTitle, { color: p.textStrong }]}>Major Lottos</Text>
              <Text style={[s.sectionSub, { color: p.textSoft }]}>Latest jackpot results</Text>
            </View>
            <View style={[s.countPill, { backgroundColor: p.chipIdle }]}>
              <Text style={[s.countPillText, { color: p.chipIdleText }]}>{bigLottos.length} games</Text>
            </View>
          </View>

          {loadingDash ? (
            <ActivityIndicator color={p.accent} style={{ marginVertical: 20 }} />
          ) : bigLottos.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
              <Text style={[s.emptyText, { color: p.textSoft }]}>No lotto games configured.</Text>
            </View>
          ) : (
            <View style={s.bigLottoGrid}>
              {bigLottos.map(g => <BigLottoCard key={g.id} game={g} palette={p} />)}
            </View>
          )}

          {/* Small Games Section */}
          <View style={[s.sectionHeader, { marginTop: 8 }]}>
            <View style={[s.sectionIcon, { backgroundColor: p.payout + '22' }]}>
              <Ionicons name="dice" size={16} color={p.payout} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.sectionTitle, { color: p.textStrong }]}>Digit Games</Text>
              <Text style={[s.sectionSub, { color: p.textSoft }]}>3D, 2D & more — latest draws</Text>
            </View>
            <View style={[s.countPill, { backgroundColor: p.chipIdle }]}>
              <Text style={[s.countPillText, { color: p.chipIdleText }]}>{smallGames.length} games</Text>
            </View>
          </View>

          {loadingDash ? null : smallGames.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
              <Text style={[s.emptyText, { color: p.textSoft }]}>No digit games configured.</Text>
            </View>
          ) : (
            <View style={s.smallGamesCol}>
              {smallGames.map(g => <SmallGameRow key={g.id} game={g} palette={p} />)}
            </View>
          )}
        </ScrollView>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
           MANAGE TAB
        ══════════════════════════════════════════════════════════════════ */
        <ScrollView contentContainerStyle={s.scroll}>
          {/* Filters */}
          <View style={s.filterContainer}>
            <View style={s.filterRow}>
              {(['all', 'lotto', 'digit'] as const).map(cat => {
                const active = filterCategory === cat;
                return (
                  <Pressable key={cat}
                    style={[s.filterTab, { backgroundColor: active ? p.accent : p.chipIdle, flex: 1 }]}
                    onPress={() => { setFilterCategory(cat); setFilterGameId('all'); }}>
                    <Text style={[s.filterTabText, { color: active ? p.accentText : p.chipIdleText, textAlign: 'center' }]}>
                      {cat === 'all' ? 'All' : cat === 'lotto' ? 'Lotto' : 'Digits'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={s.filterRow}>
                <Pressable style={[s.subFilterTab, { backgroundColor: filterGameId === 'all' ? p.chipActive : 'transparent' }]} onPress={() => setFilterGameId('all')}>
                  <Text style={[s.subFilterTabText, { color: filterGameId === 'all' ? p.chipActiveText : p.textSoft }]}>All Games</Text>
                </Pressable>
                {availableGames.map(g => {
                  const active = filterGameId === g.id;
                  return (
                    <Pressable key={g.id} style={[s.subFilterTab, { backgroundColor: active ? p.chipActive : 'transparent' }]} onPress={() => setFilterGameId(g.id)}>
                      <Text style={[s.subFilterTabText, { color: active ? p.chipActiveText : p.textSoft }]}>{g.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {loadingResults ? (
            <ActivityIndicator color={p.accent} style={{ marginVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder, paddingVertical: 40, alignItems: 'center' }]}>
              <Ionicons name="search-outline" size={40} color={p.textSoft} />
              <Text style={[s.emptyText, { color: p.textSoft, marginTop: 10 }]}>No results found.</Text>
            </View>
          ) : (
            <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
              <View style={s.cardHead}>
                <Text style={[s.cardTitle, { color: p.textStrong }]}>Draw History</Text>
                <View style={[s.countPill, { backgroundColor: p.chipIdle }]}>
                  <Text style={[s.countPillText, { color: p.chipIdleText }]}>{filtered.length} draws</Text>
                </View>
              </View>
              {filtered.map(r => (
                <ResultCard key={r.id} result={r} gameName={gameName(r.gameId)} onEdit={() => openEdit(r)} onDelete={() => handleDelete(r.id)} palette={p} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Add/Edit Form Modal ── */}
      <Modal visible={isFormOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsFormOpen(false)}>
        <View style={{ flex: 1, backgroundColor: p.screenBg }}>
          <StatusBar barStyle="light-content" />
          <View style={[s.formHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => setIsFormOpen(false)} style={[s.backBtn, { backgroundColor: p.chipIdle }]}>
              <Ionicons name="chevron-back" size={22} color={p.chipIdleText} />
            </Pressable>
            <Text style={[s.formTitle, { color: p.textStrong }]}>{editTarget ? 'Edit Result' : 'Add Draw Result'}</Text>
            <View style={{ width: 44 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView ref={formScrollRef} contentContainerStyle={[s.formScroll, { paddingBottom: 120 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Game picker */}
              <Text style={[s.label, { color: p.textStrong }]}>Lotto Game</Text>
              <Pressable style={[s.pickerBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]} onPress={() => setShowGamePicker(v => !v)}>
                <Text style={[s.pickerBtnText, { color: p.textStrong }]}>{selectedGame?.name ?? 'Select a game'}</Text>
                <Ionicons name={showGamePicker ? 'chevron-up' : 'chevron-down'} size={16} color={p.textSoft} />
              </Pressable>
              {showGamePicker && (
                <View style={[s.pickerDropdown, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}>
                  <ScrollView style={{ maxHeight: 300 }}>
                    <Text style={[s.pickerGroupLabel, { color: p.accent }]}>Major Lottos</Text>
                    {games.filter(g => !isDigitGame(g.id)).map(g => (
                      <Pressable key={g.id} style={[s.pickerOption, gameId === g.id && { backgroundColor: p.chipActive }]}
                        onPress={() => { setGameId(g.id); const times = g.drawTime.split(',').map(t => t.trim()); setDrawTime(times[times.length - 1]); setNumbers(''); setShowGamePicker(false); }}>
                        <Text style={[s.pickerOptionText, { color: gameId === g.id ? p.chipActiveText : p.textStrong }]}>{g.name}</Text>
                      </Pressable>
                    ))}
                    <Text style={[s.pickerGroupLabel, { color: p.payout, marginTop: 8 }]}>Digit Games</Text>
                    {games.filter(g => isDigitGame(g.id)).map(g => (
                      <Pressable key={g.id} style={[s.pickerOption, gameId === g.id && { backgroundColor: p.chipActive }]}
                        onPress={() => { setGameId(g.id); const times = g.drawTime.split(',').map(t => t.trim()); setDrawTime(times[times.length - 1]); setNumbers(''); setShowGamePicker(false); }}>
                        <Text style={[s.pickerOptionText, { color: gameId === g.id ? p.chipActiveText : p.textStrong }]}>{g.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Draw Date */}
              <Text style={[s.label, { color: p.textStrong }]}>Draw Date</Text>
              {Platform.OS === 'ios' ? (
                <View style={[s.datePickerWrap, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}>
                  <DateTimePicker value={drawDate} mode="date" display="inline" maximumDate={new Date()} onChange={(_, d) => d && setDrawDate(d)} style={{ alignSelf: 'stretch' }} />
                </View>
              ) : (
                <>
                  <Pressable style={[s.pickerBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]} onPress={() => setShowDatePicker(true)}>
                    <Text style={[s.pickerBtnText, { color: p.textStrong }]}>{drawDateKey}</Text>
                    <Ionicons name="calendar-outline" size={16} color={p.textSoft} />
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker value={drawDate} mode="date" display="default" maximumDate={new Date()} onChange={(_, d) => { setShowDatePicker(false); if (d) setDrawDate(d); }} />
                  )}
                </>
              )}

              {/* Draw Time */}
              <Text style={[s.label, { color: p.textStrong }]}>Draw Time</Text>
              <View style={s.timeRow}>
                {availableDrawTimes.map(t => (
                  <Pressable key={t} style={[s.timeChip, { backgroundColor: drawTime === t ? p.accent : p.chipIdle }]} onPress={() => setDrawTime(t)}>
                    <Text style={[s.timeChipText, { color: drawTime === t ? p.accentText : p.chipIdleText }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Winning Numbers */}
              <Text style={[s.label, { color: p.textStrong }]}>Winning Numbers</Text>
              <NumberBallInput game={selectedGame} value={numbers} onChange={setNumbers} palette={p}
                onFocus={() => setTimeout(() => formScrollRef.current?.scrollToEnd({ animated: true }), 100)} />

              {/* Jackpot */}
              <Text style={[s.label, { color: p.textStrong }]}>Draw Jackpot (Optional)</Text>
              <View style={[s.pickerBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, marginTop: 8 }]}>
                <TextInput style={{ flex: 1, color: p.textStrong, fontSize: 15, fontFamily: Fonts.mono }} keyboardType="number-pad" placeholder="0" placeholderTextColor={p.textSoft}
                  value={jackpotAmount} onChangeText={v => setJackpotAmount(formatJackpotInput(v))}
                  onFocus={() => setTimeout(() => formScrollRef.current?.scrollToEnd({ animated: true }), 100)} />
                <Text style={{ color: p.textSoft, fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono }}>PHP</Text>
              </View>
              {jackpotAmount ? <Text style={{ color: p.textSoft, fontSize: 11, fontFamily: Fonts.sans, marginTop: 4, marginLeft: 4 }}>{formatJackpotFull(stripJackpotInput(jackpotAmount) ?? 0)}</Text> : null}

              {/* Winners */}
              <Text style={[s.label, { color: p.textStrong }]}>Winners (Optional)</Text>
              <View style={[s.pickerBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, marginTop: 8 }]}>
                <TextInput style={{ flex: 1, color: p.textStrong, fontSize: 15, fontFamily: Fonts.mono }} keyboardType="number-pad" placeholder="0" placeholderTextColor={p.textSoft}
                  value={winnersCount} onChangeText={v => setWinnersCount(v.replace(/[^0-9]/g, ''))}
                  onFocus={() => setTimeout(() => formScrollRef.current?.scrollToEnd({ animated: true }), 100)} />
                <Ionicons name="trophy-outline" size={14} color={p.textSoft} />
              </View>

              {message ? <Text style={[s.message, { color: p.warning }]}>{message}</Text> : null}

              <Pressable style={[s.btn, { backgroundColor: p.accent, opacity: saving ? 0.7 : 1, marginTop: 32 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={p.accentText} /> : <><Ionicons name="save-outline" size={18} color={p.accentText} /><Text style={[s.btnText, { color: p.accentText }]}>Save Result</Text></>}
              </Pressable>
              <Pressable style={[s.btn, { backgroundColor: p.chipIdle, marginTop: 12 }]} onPress={() => setIsFormOpen(false)}>
                <Text style={[s.btnText, { color: p.chipIdleText }]}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Import Modal ── */}
      <Modal visible={importVisible} transparent animationType="slide" onRequestClose={() => setImportVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={s.overlay} onPress={() => setImportVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[s.importSheet, { backgroundColor: p.cardBg }]}>
              <View style={s.sheetHandle} />
              <View style={s.importHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sheetTitle, { color: p.textStrong }]}>Paste PCSO Results</Text>
                  <Text style={[s.sheetSub, { color: p.textSoft }]}>Supports multi-draw lines and mixed formats.</Text>
                </View>
                <Pressable onPress={() => setImportVisible(false)} style={[s.closeBtn, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="close" size={18} color={p.chipIdleText} />
                </Pressable>
              </View>
              <TextInput style={[s.textArea, { backgroundColor: p.stageBg, color: p.textStrong, borderColor: p.cardBorder }]}
                placeholder="Paste results here..." placeholderTextColor={p.textSoft} multiline scrollEnabled
                value={manualData} onChangeText={setManualData} textAlignVertical="top" />
              <View style={[s.importFooter, { borderTopColor: p.cardBorder }]}>
                {manualData.trim().length > 0 && (
                  <Pressable style={[s.clearBtn, { backgroundColor: p.chipIdle }]} onPress={() => setManualData('')}>
                    <Ionicons name="trash-outline" size={14} color={p.warning} />
                    <Text style={[s.clearBtnText, { color: p.warning }]}>Clear</Text>
                  </Pressable>
                )}
                <Pressable style={[s.importBtn, { backgroundColor: p.accent, opacity: importing || !manualData.trim() ? 0.6 : 1 }]}
                  onPress={handleImport} disabled={importing || !manualData.trim()}>
                  {importing ? <ActivityIndicator color={p.accentText} /> : <><Ionicons name="cloud-upload-outline" size={16} color={p.accentText} /><Text style={[s.btnText, { color: p.accentText }]}>Import</Text></>}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  // Top bar
  topBar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10 },
  topTitle:        { fontSize: 26, fontWeight: '900', fontFamily: Fonts.rounded },
  topSub:          { fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 1 },
  topActions:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:         { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14 },
  addBtnText:      { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  // Tab bar
  tabBar:          { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 16, marginBottom: 4 },
  tab:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:         { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  // Scroll
  scroll:          { padding: 16, gap: 14, paddingBottom: 120 },
  // Stats
  statsRow:        { flexDirection: 'row', gap: 10 },
  statCard:        { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  statVal:         { fontSize: 22, fontWeight: '900', fontFamily: Fonts.mono },
  statLbl:         { fontSize: 10, fontWeight: '700', fontFamily: Fonts.mono, textTransform: 'uppercase' },
  // Section headers
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:    { fontSize: 16, fontWeight: '900', fontFamily: Fonts.rounded },
  sectionSub:      { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 1 },
  countPill:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countPillText:   { fontSize: 11, fontWeight: '700', fontFamily: Fonts.mono },
  // Grids
  bigLottoGrid:    { gap: 10 },
  smallGamesCol:   { gap: 10 },
  // Empty / cards
  emptyCard:       { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center' },
  emptyText:       { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
  card:            { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardHead:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, paddingBottom: 10, borderBottomColor: 'rgba(128,128,128,0.2)' },
  cardTitle:       { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Filters
  filterContainer: { gap: 4, marginBottom: 4 },
  filterRow:       { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  filterTab:       { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  filterTabText:   { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  subFilterTab:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  subFilterTabText:{ fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
  // Form
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  formHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:         { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formTitle:       { fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded },
  formScroll:      { padding: 20 },
  label:           { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono, marginTop: 16 },
  pickerBtn:       { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerBtnText:   { fontSize: 15, fontFamily: Fonts.sans },
  pickerGroupLabel:{ fontSize: 11, fontWeight: '800', fontFamily: Fonts.rounded, textTransform: 'uppercase', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, letterSpacing: 0.5 },
  pickerDropdown:  { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  pickerOption:    { paddingHorizontal: 14, paddingVertical: 12 },
  pickerOptionText:{ fontSize: 14, fontWeight: '600', fontFamily: Fonts.sans },
  datePickerWrap:  { marginTop: 8, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  timeRow:         { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  timeChip:        { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  timeChipText:    { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono },
  message:         { marginTop: 12, fontSize: 13, fontWeight: '600', fontFamily: Fonts.sans },
  btn:             { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnText:         { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
  // Import sheet
  importSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 0 },
  sheetHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:      { fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 4 },
  sheetSub:        { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
  importHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  importFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingVertical: 14, borderTopWidth: 1 },
  closeBtn:        { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clearBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  clearBtnText:    { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  importBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  textArea:        { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontFamily: Fonts.sans, height: 180, textAlignVertical: 'top', marginTop: 4 },
});
