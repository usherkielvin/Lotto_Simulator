import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

type LottoGame = { id: string; name: string };
type OfficialResult = { id: number; gameId: string; drawDateKey: string; numbers: string };

export default function AdminScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session } = useSession();

  const [games, setGames] = useState<LottoGame[]>([]);
  const [results, setResults] = useState<OfficialResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<OfficialResult | null>(null);
  const [gameId, setGameId] = useState('');
  const [drawDateKey, setDrawDateKey] = useState('');
  const [numbers, setNumbers] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Game picker dropdown
  const [showGamePicker, setShowGamePicker] = useState(false);

  const fetchResults = useCallback(async () => {
    if (!session?.userId) return;
    setLoadingResults(true);
    try {
      const data = await apiFetch<OfficialResult[]>('/admin/results', { userId: session.userId });
      setResults(data.sort((a, b) => b.drawDateKey.localeCompare(a.drawDateKey)));
    } catch {
      // silently fail — access guard below handles unauth
    } finally {
      setLoadingResults(false);
    }
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
          <Text style={[s.errorText, { color: p.textSoft }]}>Admin access required</Text>
          <Pressable style={[s.btn, { backgroundColor: p.accent }]} onPress={() => router.back()}>
            <Text style={[s.btnText, { color: p.accentText }]}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const openAdd = () => {
    setEditTarget(null);
    setGameId(games[0]?.id ?? '');
    setDrawDateKey('');
    setNumbers('');
    setMessage('');
    setModalVisible(true);
  };

  const openEdit = (r: OfficialResult) => {
    setEditTarget(r);
    setGameId(r.gameId);
    setDrawDateKey(r.drawDateKey);
    setNumbers(r.numbers);
    setMessage('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!gameId || !drawDateKey || !numbers) {
      setMessage('All fields are required.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/admin/results', {
        method: 'POST',
        userId: session!.userId,
        body: { gameId, drawDateKey, numbers },
      });
      setModalVisible(false);
      fetchResults();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to save result.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/admin/results/${id}`, { method: 'DELETE', userId: session!.userId });
      setResults(prev => prev.filter(r => r.id !== id));
    } catch {
      // ignore
    }
  };

  const selectedGameName = games.find(g => g.id === gameId)?.name ?? gameId;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={[s.title, { color: p.textStrong }]}>Admin Panel</Text>
            <Text style={[s.subtitle, { color: p.textSoft }]}>Manage Official Draw Results</Text>
          </View>
          <Pressable style={[s.addBtn, { backgroundColor: p.accent }]} onPress={openAdd}>
            <Ionicons name="add" size={18} color={p.accentText} />
            <Text style={[s.addBtnText, { color: p.accentText }]}>Add Result</Text>
          </Pressable>
        </View>

        {/* Results list */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: p.textStrong }]}>Official Results</Text>

          {loadingResults ? (
            <ActivityIndicator color={p.accent} style={{ marginTop: 20 }} />
          ) : results.length === 0 ? (
            <Text style={[s.emptyText, { color: p.textSoft }]}>No results yet. Tap "Add Result" to enter one.</Text>
          ) : (
            results.map(r => (
              <View key={r.id} style={[s.resultRow, { borderColor: p.cardBorder }]}>
                <View style={s.resultInfo}>
                  <Text style={[s.resultGame, { color: p.textStrong }]}>{games.find(g => g.id === r.gameId)?.name ?? r.gameId}</Text>
                  <Text style={[s.resultDate, { color: p.textSoft }]}>{r.drawDateKey}</Text>
                  <Text style={[s.resultNumbers, { color: p.accent }]}>{r.numbers}</Text>
                </View>
                <View style={s.resultActions}>
                  <Pressable onPress={() => openEdit(r)} style={[s.iconBtn, { backgroundColor: p.chipIdle }]}>
                    <Ionicons name="pencil-outline" size={16} color={p.chipIdleText} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(r.id)} style={[s.iconBtn, { backgroundColor: p.chipIdle }]}>
                    <Ionicons name="trash-outline" size={16} color={p.warning} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable style={[s.backBtn, { backgroundColor: p.chipIdle }]} onPress={() => router.back()}>
          <Text style={[s.backBtnText, { color: p.chipIdleText }]}>Back to App</Text>
        </Pressable>
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setModalVisible(false)} />
        <View style={[s.sheet, { backgroundColor: p.cardBg }]}>
          <View style={s.sheetHandle} />
          <Text style={[s.sheetTitle, { color: p.textStrong }]}>
            {editTarget ? 'Edit Result' : 'Add Draw Result'}
          </Text>

          {/* Game picker */}
          <Text style={[s.label, { color: p.textStrong }]}>Lotto Game</Text>
          <Pressable
            style={[s.pickerBtn, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}
            onPress={() => setShowGamePicker(v => !v)}>
            <Text style={[s.pickerBtnText, { color: p.textStrong }]}>{selectedGameName || 'Select a game'}</Text>
            <Ionicons name={showGamePicker ? 'chevron-up' : 'chevron-down'} size={16} color={p.textSoft} />
          </Pressable>
          {showGamePicker && (
            <View style={[s.pickerDropdown, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]}>
              {games.map(g => (
                <Pressable key={g.id} style={[s.pickerOption, gameId === g.id && { backgroundColor: p.chipActive }]}
                  onPress={() => { setGameId(g.id); setShowGamePicker(false); }}>
                  <Text style={[s.pickerOptionText, { color: gameId === g.id ? p.chipActiveText : p.textStrong }]}>{g.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Draw date */}
          <Text style={[s.label, { color: p.textStrong }]}>Draw Date (YYYY-MM-DD)</Text>
          <TextInput
            value={drawDateKey}
            onChangeText={setDrawDateKey}
            placeholder="e.g., 2026-03-20"
            placeholderTextColor={p.textSoft}
            style={[s.input, { backgroundColor: p.stageBg, color: p.textStrong, borderColor: p.cardBorder }]}
          />

          {/* Numbers */}
          <Text style={[s.label, { color: p.textStrong }]}>Winning Numbers (comma-separated)</Text>
          <TextInput
            value={numbers}
            onChangeText={setNumbers}
            placeholder="e.g., 5,12,23,34,41,55"
            placeholderTextColor={p.textSoft}
            keyboardType="numbers-and-punctuation"
            style={[s.input, { backgroundColor: p.stageBg, color: p.textStrong, borderColor: p.cardBorder }]}
          />

          {message ? <Text style={[s.message, { color: p.warning }]}>{message}</Text> : null}

          <Pressable
            style={[s.btn, { backgroundColor: p.accent, opacity: saving ? 0.7 : 1, marginTop: 20 }]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color={p.accentText} />
              : <><Ionicons name="save-outline" size={16} color={p.accentText} /><Text style={[s.btnText, { color: p.accentText }]}>Save Result</Text></>
            }
          </Pressable>

          <Pressable style={[s.backBtn, { backgroundColor: p.chipIdle, marginTop: 10 }]} onPress={() => setModalVisible(false)}>
            <Text style={[s.backBtnText, { color: p.chipIdleText }]}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  scroll:           { padding: 16, gap: 14 },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:            { fontSize: 24, fontWeight: '800', fontFamily: Fonts.rounded },
  subtitle:         { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 2 },
  addBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText:       { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
  card:             { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionTitle:     { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 10 },
  emptyText:        { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 8, marginBottom: 8 },
  resultRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1 },
  resultInfo:       { flex: 1 },
  resultGame:       { fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  resultDate:       { fontSize: 12, fontWeight: '500', fontFamily: Fonts.mono, marginTop: 2 },
  resultNumbers:    { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono, marginTop: 3 },
  resultActions:    { flexDirection: 'row', gap: 8 },
  iconBtn:          { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backBtn:          { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  backBtnText:      { fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  errorText:        { fontSize: 16, fontWeight: '600', fontFamily: Fonts.sans, marginTop: 12 },
  // Modal / sheet
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:            { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:       { fontSize: 20, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 4 },
  label:            { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono, marginTop: 14 },
  input:            { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.sans },
  pickerBtn:        { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerBtnText:    { fontSize: 15, fontFamily: Fonts.sans },
  pickerDropdown:   { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  pickerOption:     { paddingHorizontal: 14, paddingVertical: 12 },
  pickerOptionText: { fontSize: 14, fontWeight: '600', fontFamily: Fonts.sans },
  message:          { marginTop: 12, fontSize: 13, fontWeight: '600', fontFamily: Fonts.sans },
  btn:              { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnText:          { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
});
