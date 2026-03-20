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

function formatDate(key: string): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return `${m}/${d}/${y}`;
}

function formatJackpot(amount: number): string {
  return new Intl.NumberFormat('en-PH', { 
    style: 'currency', 
    currency: 'PHP', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(amount);
}

type LottoGame = { id: string; name: string; drawTime: string; maxNumber: number };
type OfficialResult = {
  id: number;
  gameId: string;
  drawDateKey: string;
  drawTime: string;
  numbers: string;
  jackpot?: number;
};

// ─── Number Ball Input ────────────────────────────────────────────────────────
function NumberBallInput({
  game,
  value,
  onChange,
  onFocus,
  palette,
}: {
  game: LottoGame | undefined;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  const p = palette;
  if (!game) return null;

  const isDigitGame = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(game.id);
  const count = game.id === '2d-ez2' ? 2 : (game.id === '3d-swertres' ? 3 : (game.id === '4digit' ? 4 : 6));
  const maxLen = isDigitGame ? 1 : 2;
  const parts = value.split(',').map(s => s.trim());
  while (parts.length < count) parts.push('');

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const refs = useRef<(TextInput | null)[]>([]);

  const update = (idx: number, val: string) => {
    let cleaned = val.replace(/[^0-9]/g, '');
    
    // For lotto games, validate max number
    if (!isDigitGame && cleaned !== '') {
      const num = parseInt(cleaned, 10);
      if (num > game.maxNumber) {
        cleaned = game.maxNumber.toString();
      }
    }

    const next = [...parts];
    next[idx] = cleaned.slice(0, maxLen);
    onChange(next.join(','));

    // Auto-advance logic
    if (cleaned.length >= maxLen && idx < count - 1) {
      requestAnimationFrame(() => {
        refs.current[idx + 1]?.focus();
      });
    }
  };

  const handleKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace' && parts[idx] === '' && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={[nb.digitWrap, { backgroundColor: p.stageBg, borderColor: parts[i] ? p.accent : p.cardBorder, width: isDigitGame ? 48 : 54 }]}>
            <TextInput
              ref={r => { refs.current[i] = r; }}
              style={[nb.digitInput, { color: p.textStrong, fontFamily: Fonts.mono, fontSize: isDigitGame ? 22 : 18 }]}
              keyboardType="number-pad"
              maxLength={maxLen}
              value={parts[i]}
              onChangeText={v => update(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              onFocus={onFocus}
              placeholder={isDigitGame ? "0" : "00"}
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
  ball:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ballText:   { fontSize: 13, fontWeight: '800', fontFamily: Fonts.mono },
  digitWrap:  { width: 48, height: 52, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  digitInput: { fontSize: 22, fontWeight: '800', width: '100%', textAlign: 'center' },
});

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({
  result,
  gameName,
  onEdit,
  onDelete,
  palette,
}: {
  result: OfficialResult;
  gameName: string;
  onEdit: () => void;
  onDelete: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  const p = palette;
  const balls = result.numbers.split(',').map(s => s.trim()).filter(Boolean);
  return (
    <View style={[rc.row, { borderColor: p.cardBorder }]}>
      <View style={{ flex: 1 }}>
        <View style={rc.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={[rc.game, { color: p.textStrong }]}>{gameName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={[rc.date, { color: p.textSoft }]}>{formatDate(result.drawDateKey)}</Text>
              <View style={[rc.badge, { backgroundColor: p.chipIdle }]}>
                <Ionicons name="time-outline" size={10} color={p.chipIdleText} />
                <Text style={[rc.badgeText, { color: p.chipIdleText }]}>{result.drawTime}</Text>
              </View>
            </View>
          </View>
          {result.jackpot !== undefined && (
            <Text style={[rc.jackpot, { color: p.accent }]}>{formatJackpot(result.jackpot)}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {balls.map((n, i) => (
            <View key={i} style={[nb.ball, { backgroundColor: p.secondaryButton, width: 28, height: 28, borderRadius: 14 }]}>
              <Text style={[nb.ballText, { color: p.secondaryButtonText, fontSize: 11 }]}>{n}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={rc.actions}>
        <Pressable onPress={onEdit} style={[rc.iconBtn, { backgroundColor: p.chipIdle }]}>
          <Ionicons name="pencil-outline" size={14} color={p.chipIdleText} />
        </Pressable>
        <Pressable onPress={onDelete} style={[rc.iconBtn, { backgroundColor: p.chipIdle }]}>
          <Ionicons name="trash-outline" size={14} color={p.warning} />
        </Pressable>
      </View>
    </View>
  );
}
const rc = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, gap: 8 },
  topRow:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  game:     { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  date:     { fontSize: 11, fontWeight: '500', fontFamily: Fonts.mono },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  badgeText:{ fontSize: 9, fontWeight: '700', fontFamily: Fonts.mono },
  jackpot:  { fontSize: 14, fontWeight: '800', fontFamily: Fonts.mono },
  actions:  { flexDirection: 'row', gap: 6 },
  iconBtn:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { session } = useSession();

  const [games, setGames] = useState<LottoGame[]>([]);
  const [results, setResults] = useState<OfficialResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [filterCategory, setFilterCategory] = useState<'all' | 'lotto' | 'digit'>('all');
  const [filterGameId, setFilterGameId] = useState('all');

  // Add/Edit view
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OfficialResult | null>(null);
  const [gameId, setGameId] = useState('');
  const [drawDate, setDrawDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [drawTime, setDrawTime] = useState('9:00 PM');
  const [numbers, setNumbers] = useState('');
  const [jackpotAmount, setJackpotAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showGamePicker, setShowGamePicker] = useState(false);

  // Manual import modal
  const [importVisible, setImportVisible] = useState(false);
  const [manualData, setManualData] = useState('');
  const [importing, setImporting] = useState(false);

  const formScrollRef = useRef<ScrollView>(null);
  const drawDateKey = [
    drawDate.getFullYear(),
    String(drawDate.getMonth() + 1).padStart(2, '0'),
    String(drawDate.getDate()).padStart(2, '0'),
  ].join('-');

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
    fetchResults();
  }, [fetchResults]);

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

  const openAdd = () => {
    setEditTarget(null);
    const firstGame = games[0];
    setGameId(firstGame?.id ?? '');
    setDrawDate(new Date());
    const times = firstGame?.drawTime.split(',').map(t => t.trim()) ?? ['9:00 PM'];
    setDrawTime(times[times.length - 1]);
    setNumbers('');
    setJackpotAmount('');
    setMessage('');
    setShowGamePicker(false);
    setIsFormOpen(true);
  };

  const openEdit = (r: OfficialResult) => {
    setEditTarget(r);
    setGameId(r.gameId);
    setDrawDate(new Date(r.drawDateKey + 'T12:00:00'));
    setDrawTime(r.drawTime ?? '9:00 PM');
    setNumbers(r.numbers);
    setJackpotAmount(r.jackpot?.toString() ?? '');
    setMessage('');
    setShowGamePicker(false);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    const balls = numbers.split(',').map(s => s.trim()).filter(Boolean);
    if (!gameId || !drawDateKey || balls.length === 0) {
      setMessage('All fields are required.');
      return;
    }
    setSaving(true); setMessage('');
    try {
      await apiFetch('/admin/results', {
        method: 'POST',
        userId: session!.userId,
        body: { 
          gameId, 
          drawDateKey, 
          drawTime, 
          numbers: balls.join(','),
          jackpot: jackpotAmount ? parseInt(jackpotAmount, 10) : undefined
        },
      });
      setIsFormOpen(false);
      fetchResults();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to save result.');
    } finally { setSaving(false); }
  };

  const handleImport = async () => {
    if (!manualData.trim()) return;
    setImporting(true);
    try {
      const res = await apiFetch<{ updatedCount: number }>('/admin/import-manual', {
        method: 'POST', userId: session!.userId,
        body: { rawData: manualData },
      });
      Alert.alert('Import Done', `Added ${res.updatedCount} new result(s).`);
      setImportVisible(false);
      setManualData('');
      fetchResults();
    } catch (e: unknown) {
      Alert.alert('Import Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally { setImporting(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Result', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/admin/results/${id}`, { method: 'DELETE', userId: session!.userId });
            setResults(prev => prev.filter(r => r.id !== id));
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const gameName = (id: string) => games.find(g => g.id === id)?.name ?? id;

  const filtered = results.filter(r => {
    if (filterGameId !== 'all') return r.gameId === filterGameId;
    if (filterCategory === 'all') return true;

    const game = games.find(g => g.id === r.gameId);
    if (!game) return false;

    const isDigit = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(game.id);
    return filterCategory === 'digit' ? isDigit : !isDigit;
  });

  const availableGames = filterCategory === 'all'
    ? games
    : games.filter(g => {
        const isDigit = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(g.id);
        return filterCategory === 'digit' ? isDigit : !isDigit;
      });

  const majorLottoResults = filtered.filter(r => !['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(r.gameId));
  const digitGameResults = filtered.filter(r => ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(r.gameId));

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Dashboard Header */}
        <View style={s.dashboardHeader}>
          <View>
            <Text style={[s.dashboardTitle, { color: p.textStrong }]}>Results</Text>
            <Text style={[s.dashboardSubtitle, { color: p.textSoft }]}>Manage results and system data</Text>
          </View>
          <View style={s.dashboardActions}>
            <Pressable style={[s.dashboardIconBtn, { backgroundColor: p.chipIdle }]} onPress={() => setImportVisible(true)}>
              <Ionicons name="clipboard-outline" size={20} color={p.chipIdleText} />
            </Pressable>
            <Pressable style={[s.dashboardAddBtn, { backgroundColor: p.accent }]} onPress={openAdd}>
              <Ionicons name="add" size={22} color={p.accentText} />
              <Text style={[s.dashboardAddBtnText, { color: p.accentText }]}>Add Result</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <Text style={[s.statLabel, { color: p.textSoft }]}>Total Results</Text>
            <Text style={[s.statValue, { color: p.textStrong }]}>{results.length}</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <Text style={[s.statLabel, { color: p.textSoft }]}>Major Lottos</Text>
            <Text style={[s.statValue, { color: p.textStrong }]}>{majorLottoResults.length}</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <Text style={[s.statLabel, { color: p.textSoft }]}>Digit Games</Text>
            <Text style={[s.statValue, { color: p.textStrong }]}>{digitGameResults.length}</Text>
          </View>
        </View>

        {/* Filter Layer 1: Categories */}
        <View style={s.filterContainer}>
          <View style={s.filterRow}>
            {(['all', 'lotto', 'digit'] as const).map(cat => {
              const active = filterCategory === cat;
              return (
                <Pressable key={cat}
                  style={[s.filterTab, { backgroundColor: active ? p.accent : p.chipIdle, flex: 1 }]}
                  onPress={() => {
                    setFilterCategory(cat);
                    setFilterGameId('all');
                  }}>
                  <Text style={[s.filterTabText, { color: active ? p.accentText : p.chipIdleText, textAlign: 'center' }]}>
                    {cat === 'all' ? 'All' : cat === 'lotto' ? 'Lotto' : 'Digits'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Filter Layer 2: Specific Games */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={s.filterRow}>
              <Pressable
                style={[s.subFilterTab, { backgroundColor: filterGameId === 'all' ? p.chipActive : 'transparent' }]}
                onPress={() => setFilterGameId('all')}>
                <Text style={[s.subFilterTabText, { color: filterGameId === 'all' ? p.chipActiveText : p.textSoft }]}>All Games</Text>
              </Pressable>
              {availableGames.map(g => {
                const active = filterGameId === g.id;
                return (
                  <Pressable key={g.id}
                    style={[s.subFilterTab, { backgroundColor: active ? p.chipActive : 'transparent' }]}
                    onPress={() => setFilterGameId(g.id)}>
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
          <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder, alignItems: 'center', paddingVertical: 40 }]}>
            <Ionicons name="search-outline" size={48} color={p.textSoft} />
            <Text style={[s.emptyText, { color: p.textSoft, marginTop: 12 }]}>No results found.</Text>
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
            <View style={s.cardHead}>
              <Text style={[s.sectionTitle, { color: p.textStrong }]}>Draw History</Text>
              <View style={[s.countBadge, { backgroundColor: p.chipIdle }]}>
                <Text style={[s.countBadgeText, { color: p.chipIdleText }]}>{filtered.length} Draws</Text>
              </View>
            </View>
            {filtered.map(r => (
              <ResultCard
                key={r.id}
                result={r}
                gameName={gameName(r.gameId)}
                onEdit={() => openEdit(r)}
                onDelete={() => handleDelete(r.id)}
                palette={p}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal 
        visible={isFormOpen} 
        animationType="slide" 
        presentationStyle="fullScreen"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: p.screenBg }}>
          <StatusBar barStyle="light-content" />
          <View style={[s.formHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => setIsFormOpen(false)} style={[s.backBtn, { backgroundColor: p.chipIdle }]}>
              <Ionicons name="chevron-back" size={22} color={p.chipIdleText} />
            </Pressable>
            <Text style={[s.formTitle, { color: p.textStrong }]}>
              {editTarget ? 'Edit Result' : 'Add Draw Result'}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={formScrollRef}
              contentContainerStyle={[s.formScroll, { paddingBottom: 120 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
                {/* Game picker */}
                <Text style={[s.label, { color: p.textStrong }]}>Lotto Game</Text>
                <Pressable style={[s.pickerBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}
                  onPress={() => setShowGamePicker(v => !v)}>
                  <Text style={[s.pickerBtnText, { color: p.textStrong }]}>{selectedGame?.name ?? 'Select a game'}</Text>
                  <Ionicons name={showGamePicker ? 'chevron-up' : 'chevron-down'} size={16} color={p.textSoft} />
                </Pressable>
                {showGamePicker && (
                  <View style={[s.pickerDropdown, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}>
                    <ScrollView style={{ maxHeight: 300 }}>
                      <Text style={[s.pickerGroupLabel, { color: p.accent }]}>Major Lottos</Text>
                      {games.filter(g => !['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(g.id)).map(g => (
                        <Pressable key={g.id}
                          style={[s.pickerOption, gameId === g.id && { backgroundColor: p.chipActive }]}
                          onPress={() => {
                            setGameId(g.id);
                            const times = g.drawTime.split(',').map(t => t.trim());
                            setDrawTime(times[times.length - 1]);
                            setNumbers('');
                            setShowGamePicker(false);
                          }}>
                          <Text style={[s.pickerOptionText, { color: gameId === g.id ? p.chipActiveText : p.textStrong }]}>{g.name}</Text>
                        </Pressable>
                      ))}
                      <Text style={[s.pickerGroupLabel, { color: p.payout, marginTop: 8 }]}>Digit Games</Text>
                      {games.filter(g => ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(g.id)).map(g => (
                        <Pressable key={g.id}
                          style={[s.pickerOption, gameId === g.id && { backgroundColor: p.chipActive }]}
                          onPress={() => {
                            setGameId(g.id);
                            const times = g.drawTime.split(',').map(t => t.trim());
                            setDrawTime(times[times.length - 1]);
                            setNumbers('');
                            setShowGamePicker(false);
                          }}>
                          <Text style={[s.pickerOptionText, { color: gameId === g.id ? p.chipActiveText : p.textStrong }]}>{g.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Draw Date — iOS inline picker / Android button */}
                <Text style={[s.label, { color: p.textStrong }]}>Draw Date</Text>
                {Platform.OS === 'ios' ? (
                  <View style={[s.datePickerWrap, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}>
                    <DateTimePicker
                      value={drawDate}
                      mode="date"
                      display="inline"
                      maximumDate={new Date()}
                      onChange={(_, d) => d && setDrawDate(d)}
                      style={{ alignSelf: 'stretch' }}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable style={[s.pickerBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}
                      onPress={() => setShowDatePicker(true)}>
                      <Text style={[s.pickerBtnText, { color: p.textStrong }]}>{drawDateKey}</Text>
                      <Ionicons name="calendar-outline" size={16} color={p.textSoft} />
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={drawDate}
                        mode="date"
                        display="default"
                        maximumDate={new Date()}
                        onChange={(_, d) => { setShowDatePicker(false); if (d) setDrawDate(d); }}
                      />
                    )}
                  </>
                )}

                {/* Draw Time */}
                <Text style={[s.label, { color: p.textStrong }]}>Draw Time</Text>
                <View style={s.timeRow}>
                  {availableDrawTimes.map(t => (
                    <Pressable key={t}
                      style={[s.timeChip, { backgroundColor: drawTime === t ? p.accent : p.chipIdle }]}
                      onPress={() => setDrawTime(t)}>
                      <Text style={[s.timeChipText, { color: drawTime === t ? p.accentText : p.chipIdleText }]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Winning Numbers */}
                <Text style={[s.label, { color: p.textStrong }]}>Winning Numbers</Text>
                <NumberBallInput 
                  game={selectedGame} 
                  value={numbers} 
                  onChange={setNumbers} 
                  palette={p} 
                  onFocus={() => {
                    setTimeout(() => {
                      formScrollRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />

                {/* Result Specific Jackpot */}
                <Text style={[s.label, { color: p.textStrong }]}>Draw Jackpot (Optional)</Text>
                <View style={[s.pickerBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder, marginTop: 8 }]}>
                  <TextInput
                    style={{ flex: 1, color: p.textStrong, fontSize: 15, fontFamily: Fonts.sans }}
                    keyboardType="number-pad"
                    placeholder="Enter jackpot for this specific draw"
                    placeholderTextColor={p.textSoft}
                    value={jackpotAmount}
                    onChangeText={setJackpotAmount}
                    onFocus={() => {
                      setTimeout(() => {
                        formScrollRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />
                  <Text style={{ color: p.textSoft, fontSize: 12, fontWeight: '700' }}>PHP</Text>
                </View>

                {message ? <Text style={[s.message, { color: p.warning }]}>{message}</Text> : null}

                <Pressable style={[s.btn, { backgroundColor: p.accent, opacity: saving ? 0.7 : 1, marginTop: 32 }]}
                  onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={p.accentText} />
                    : <><Ionicons name="save-outline" size={18} color={p.accentText} /><Text style={[s.btnText, { color: p.accentText }]}>Save Result</Text></>
                  }
                </Pressable>
                <Pressable style={[s.btn, { backgroundColor: p.chipIdle, marginTop: 12 }]} onPress={() => setIsFormOpen(false)}>
                  <Text style={[s.btnText, { color: p.chipIdleText }]}>Cancel</Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Manual Import Modal ── */}
      <Modal visible={importVisible} transparent animationType="slide" onRequestClose={() => setImportVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={s.overlay} onPress={() => setImportVisible(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[s.importSheet, { backgroundColor: p.cardBg }]}>
              <View style={s.sheetHandle} />

              <View style={s.importHeader}>
                <View>
                  <Text style={[s.sheetTitle, { color: p.textStrong }]}>Paste PCSO Results</Text>
                  <Text style={[s.subtitle, { color: p.textSoft }]}>
                    Paste results from any PCSO results page. Supports multi-draw lines and mixed formats.
                  </Text>
                </View>
                <Pressable onPress={() => setImportVisible(false)} style={[s.closeBtn, { backgroundColor: p.chipIdle }]}>
                  <Ionicons name="close" size={18} color={p.chipIdleText} />
                </Pressable>
              </View>

              <TextInput
                style={[s.textArea, { backgroundColor: p.stageBg, color: p.textStrong, borderColor: p.cardBorder }]}
                placeholder="Paste results here..."
                placeholderTextColor={p.textSoft}
                multiline
                scrollEnabled
                value={manualData}
                onChangeText={setManualData}
                autoFocus={false}
                textAlignVertical="top"
              />

              <View style={[s.importFooter, { borderTopColor: p.cardBorder }]}>
                {manualData.trim().length > 0 && (
                  <Pressable style={[s.clearBtn, { backgroundColor: p.chipIdle }]} onPress={() => setManualData('')}>
                    <Ionicons name="trash-outline" size={14} color={p.warning} />
                    <Text style={[s.clearBtnText, { color: p.warning }]}>Clear</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[s.importBtn, { backgroundColor: p.accent, opacity: importing || !manualData.trim() ? 0.6 : 1 }]}
                  onPress={handleImport}
                  disabled={importing || !manualData.trim()}
                >
                  {importing
                    ? <ActivityIndicator color={p.accentText} />
                    : <><Ionicons name="cloud-upload-outline" size={16} color={p.accentText} /><Text style={[s.btnText, { color: p.accentText }]}>Import</Text></>
                  }
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
  root:           { flex: 1 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  scroll:         { padding: 16, gap: 14, paddingBottom: 120 },
  // Dashboard Header
  dashboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  dashboardTitle:  { fontSize: 26, fontWeight: '900', fontFamily: Fonts.rounded },
  dashboardSubtitle:{ fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 2 },
  dashboardActions:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  dashboardIconBtn:{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dashboardAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  dashboardAddBtnText:{ fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  // Stats
  statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard:       { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  statLabel:      { fontSize: 11, fontWeight: '700', fontFamily: Fonts.mono, textTransform: 'uppercase' },
  statValue:      { fontSize: 20, fontWeight: '900', fontFamily: Fonts.mono },
  // Filters
  filterContainer:{ gap: 4, marginBottom: 16 },
  filterRow:      { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  filterTab:      { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  filterTabText:  { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  subFilterTab:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  subFilterTabText:{ fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
  // Hero Sections
  heroSection:    { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  heroHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  heroIcon:       { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  heroTitle:      { fontSize: 16, fontWeight: '900', fontFamily: Fonts.rounded, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroSubtitle:   { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 1 },
  heroBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  heroBadgeText:  { fontSize: 12, fontWeight: '800', fontFamily: Fonts.mono },
  heroContent:    { paddingHorizontal: 14, paddingBottom: 6 },
  // Results List
  card:           { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardHead:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10, borderBottomColor: 'rgba(255,255,255,0.1)' },
  sectionTitle:   { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded, textTransform: 'uppercase', letterSpacing: 0.5 },
  countBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  countBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: Fonts.mono },
  emptyText:      { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 8 },
  // Form & Modals
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  formHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formTitle:      { fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded },
  formScroll:     { padding: 20 },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:     { fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 4 },
  subtitle:       { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 2 },
  label:          { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono, marginTop: 16 },
  pickerBtn:      { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerBtnText:  { fontSize: 15, fontFamily: Fonts.sans },
  pickerGroupLabel:{ fontSize: 11, fontWeight: '800', fontFamily: Fonts.rounded, textTransform: 'uppercase', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, letterSpacing: 0.5 },
  pickerDropdown: { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  pickerOption:   { paddingHorizontal: 14, paddingVertical: 12 },
  pickerOptionText:{ fontSize: 14, fontWeight: '600', fontFamily: Fonts.sans },
  datePickerWrap: { marginTop: 8, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  timeRow:        { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  timeChip:       { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  timeChipText:   { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono },
  message:        { marginTop: 12, fontSize: 13, fontWeight: '600', fontFamily: Fonts.sans },
  btn:            { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnText:        { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
  textArea:       { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontFamily: Fonts.sans, height: 180, textAlignVertical: 'top', marginTop: 4 },
  importSheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 0 },
  importHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  importFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  closeBtn:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clearBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  clearBtnText:   { fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
  importBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
});
