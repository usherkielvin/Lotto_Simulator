import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';

type DrawResult = {
  gameId: string;
  gameName: string;
  drawDateKey: string;
  drawTime: string;
  numbers: string;
  winners: number;
  jackpot: number;
};

type GameResult = {
  id: string;
  name: string;
  jackpot: number;
  jackpotStatus: string;
  drawTime: string;
  drawDays: string;
  maxNumber: number;
  results: DrawResult[];
};

function formatJackpot(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(key: string): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return `${m}/${d}/${y}`;
}

function formatDateShort(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function NumberBalls({ numbers, accent, accentText }: { numbers: string; accent: string; accentText: string }) {
  const balls = numbers.split(',').map(s => s.trim()).filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
      {balls.map((n, i) => (
        <View key={i} style={[s.ball, { backgroundColor: accent }]}>
          <Text style={[s.ballText, { color: accentText }]}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

function HistoryRow({ result, palette }: { result: DrawResult; palette: ReturnType<typeof usePalette> }) {
  const p = palette;
  return (
    <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[s.gameName, { color: p.textStrong }]}>{result.gameName}</Text>
          <View style={s.drawMeta}>
            <Ionicons name="calendar-outline" size={12} color={p.textSoft} />
            <Text style={[s.drawMetaText, { color: p.textSoft }]}>{formatDate(result.drawDateKey)}</Text>
            <Ionicons name="time-outline" size={12} color={p.textSoft} style={{ marginLeft: 6 }} />
            <Text style={[s.drawMetaText, { color: p.textSoft }]}>{result.drawTime}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.jackpot, { color: p.accent }]}>{formatJackpot(result.jackpot)}</Text>
          {result.winners > 0 ? (
            <View style={[s.winnersBadge, { backgroundColor: p.payout + '22' }]}>
              <Text style={[s.winnersText, { color: p.payout }]}>{result.winners} Winner{result.winners !== 1 ? 's' : ''}</Text>
            </View>
          ) : (
            <Text style={[s.noWinnerText, { color: p.textSoft }]}>No Jackpot Winner</Text>
          )}
        </View>
      </View>
      <NumberBalls numbers={result.numbers} accent={p.accent} accentText={p.accentText} />
    </View>
  );
}

export default function ResultsScreen() {
  const p = usePalette();
  const colorScheme = useColorScheme();
  const [games, setGames] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterCategory, setFilterCategory] = useState<'all' | 'lotto' | 'digit'>('all');
  const [filterGameId, setFilterGameId] = useState('all');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Android needs a temp date before confirming
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiFetch<GameResult[]>('/games/results');
      setGames(data);
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flatResults = useMemo(() => {
    const all: DrawResult[] = [];
    games.forEach(g => {
      (g.results ?? []).forEach(r => {
        // Use result-specific jackpot if available, fallback to current game jackpot
        all.push({ ...r, gameId: g.id, gameName: g.name, jackpot: r.jackpot ?? g.jackpot });
      });
    });
    return all.sort((a, b) =>
      b.drawDateKey.localeCompare(a.drawDateKey) || b.drawTime.localeCompare(a.drawTime)
    );
  }, [games]);

  const filteredResults = useMemo(() => {
    return flatResults.filter(r => {
      if (filterGameId !== 'all' && r.gameId !== filterGameId) return false;
      if (filterCategory !== 'all') {
        const isDigit = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(r.gameId);
        if (filterCategory === 'digit' && !isDigit) return false;
        if (filterCategory === 'lotto' && isDigit) return false;
      }
      if (filterDate) {
        // Build date key in local time to avoid UTC offset issues
        const y = filterDate.getFullYear();
        const m = String(filterDate.getMonth() + 1).padStart(2, '0');
        const d = String(filterDate.getDate()).padStart(2, '0');
        if (r.drawDateKey !== `${y}-${m}-${d}`) return false;
      }
      return true;
    });
  }, [flatResults, filterCategory, filterGameId, filterDate]);

  const availableGames = useMemo(() => {
    if (filterCategory === 'all') return games;
    return games.filter(g => {
      const isDigit = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(g.id);
      return filterCategory === 'digit' ? isDigit : !isDigit;
    });
  }, [games, filterCategory]);

  const openDatePicker = () => {
    setTempDate(filterDate ?? new Date());
    setShowDatePicker(true);
  };

  const clearDate = () => setFilterDate(null);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: p.screenBg }]}>
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: p.textStrong }]}>Draw History</Text>
            <Text style={[s.subtitle, { color: p.textSoft }]}>Past winning numbers & winners</Text>
          </View>
          {/* Date filter pill */}
          <Pressable
            style={[s.datePill, { backgroundColor: filterDate ? p.accent : p.chipIdle }]}
            onPress={openDatePicker}
          >
            <Ionicons name="calendar-outline" size={14} color={filterDate ? p.accentText : p.chipIdleText} />
            <Text style={[s.datePillText, { color: filterDate ? p.accentText : p.chipIdleText }]}>
              {filterDate ? formatDateShort(filterDate) : 'Date'}
            </Text>
            {filterDate && (
              <Pressable onPress={clearDate} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={p.accentText} />
              </Pressable>
            )}
          </Pressable>
        </View>

        {/* Category tabs */}
        <View style={s.catRow}>
          {(['all', 'lotto', 'digit'] as const).map(cat => {
            const active = filterCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[s.catTab, { backgroundColor: active ? p.accent : p.chipIdle, flex: 1 }]}
                onPress={() => { setFilterCategory(cat); setFilterGameId('all'); }}
              >
                <Text style={[s.catTabText, { color: active ? p.accentText : p.chipIdleText }]}>
                  {cat === 'all' ? 'All' : cat === 'lotto' ? 'Lotto' : 'Digits'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Game sub-filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.gameRow}>
            <Pressable
              style={[s.gameChip, { backgroundColor: filterGameId === 'all' ? p.chipActive : 'transparent' }]}
              onPress={() => setFilterGameId('all')}
            >
              <Text style={[s.gameChipText, { color: filterGameId === 'all' ? p.chipActiveText : p.textSoft }]}>
                All {filterCategory === 'lotto' ? 'Lotto' : filterCategory === 'digit' ? 'Digits' : 'Games'}
              </Text>
            </Pressable>
            {availableGames.map(g => {
              const active = filterGameId === g.id;
              return (
                <Pressable
                  key={g.id}
                  style={[s.gameChip, { backgroundColor: active ? p.chipActive : 'transparent' }]}
                  onPress={() => setFilterGameId(g.id)}
                >
                  <Text style={[s.gameChipText, { color: active ? p.chipActiveText : p.textSoft }]}>{g.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── Results list ── */}
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={p.accent} />}
      >
        {loading ? (
          <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
        ) : filteredResults.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={48} color={p.textSoft} />
            <Text style={[s.emptyText, { color: p.textSoft }]}>
              {filterDate ? `No results for ${formatDateShort(filterDate)}` : 'No results match your filters.'}
            </Text>
            <Pressable
              style={[s.clearBtn, { backgroundColor: p.chipIdle }]}
              onPress={() => { setFilterCategory('all'); setFilterGameId('all'); setFilterDate(null); }}
            >
              <Text style={[s.clearBtnText, { color: p.chipIdleText }]}>Clear filters</Text>
            </Pressable>
          </View>
        ) : (
          filteredResults.map(r => (
            <HistoryRow key={`${r.gameId}-${r.drawDateKey}-${r.drawTime}`} result={r} palette={p} />
          ))
        )}
      </ScrollView>

      {/* ── Date picker modal (centered) ── */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setShowDatePicker(false)}>
          <Pressable style={[s.modalCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <Text style={[s.modalTitle, { color: p.textStrong }]}>Filter by Date</Text>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              maximumDate={new Date()}
              themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
              accentColor={p.accent}
              onChange={(_, d) => {
                if (d) setTempDate(d);
                // Android closes automatically; iOS keeps open until Done
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                  if (d) setFilterDate(d);
                }
              }}
            />

            {Platform.OS === 'ios' && (
              <View style={s.modalActions}>
                <Pressable
                  style={[s.modalBtn, { backgroundColor: p.chipIdle }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[s.modalBtnText, { color: p.chipIdleText }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[s.modalBtn, { backgroundColor: p.accent }]}
                  onPress={() => { setFilterDate(tempDate); setShowDatePicker(false); }}
                >
                  <Text style={[s.modalBtnText, { color: p.accentText }]}>Done</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1 },
  // Header
  header:         { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title:          { fontSize: 22, fontWeight: '800', fontFamily: Fonts.rounded },
  subtitle:       { fontSize: 12, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 1 },
  datePill:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  datePillText:   { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
  catRow:         { flexDirection: 'row', gap: 6 },
  catTab:         { paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  catTabText:     { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  gameRow:        { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  gameChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  gameChipText:   { fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
  // List
  scroll:         { padding: 16, gap: 10, paddingBottom: 120 },
  card:           { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  gameName:       { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  jackpot:        { fontSize: 17, fontWeight: '900', fontFamily: Fonts.mono },
  drawMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 4 },
  drawMetaText:   { fontSize: 12, fontWeight: '600', fontFamily: Fonts.mono },
  winnersBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  winnersText:    { fontSize: 11, fontWeight: '700', fontFamily: Fonts.sans },
  noWinnerText:   { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 4 },
  ball:           { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  ballText:       { fontSize: 13, fontWeight: '800', fontFamily: Fonts.mono },
  // Empty state
  empty:          { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText:      { fontSize: 14, fontWeight: '500', fontFamily: Fonts.sans, textAlign: 'center', paddingHorizontal: 40 },
  clearBtn:       { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  clearBtnText:   { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  // Date picker modal
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard:      { borderRadius: 20, borderWidth: 1, padding: 20, width: '90%', maxWidth: 380 },
  modalTitle:     { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 12, textAlign: 'center' },
  modalActions:   { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn:       { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnText:   { fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
});
