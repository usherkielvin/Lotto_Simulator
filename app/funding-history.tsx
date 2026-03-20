import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

type FundingTx = {
id: number;
type: 'deposit' | 'withdraw';
amount: number;
balanceAfter: number;
createdAt: string;
date: string;
};

type FilterPreset = 'all' | 'week' | 'month' | 'custom';
type PickerTarget = 'from' | 'to' | null;

function formatPHP(v: number) {
return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

function formatDate(d: Date) {
return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function endOfDay(d: Date) { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; }

export default function FundingHistoryScreen() {
const p = usePalette();
const scheme = useColorScheme();
const router = useRouter();
const { session } = useSession();
const userId = session?.userId;

const [rows, setRows] = useState<FundingTx[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [preset, setPreset] = useState<FilterPreset>('all');

const [fromDate, setFromDate] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 30); return startOfDay(d); });
const [toDate, setToDate] = useState<Date>(() => endOfDay(new Date()));
const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

const load = useCallback(() => {
if (!userId) { setRows([]); setLoading(false); return; }
setLoading(true);
setError('');
apiFetch<FundingTx[]>('/bets/funding', { userId })
.then(setRows)
.catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load.'))
.finally(() => setLoading(false));
}, [userId]);

useFocusEffect(useCallback(() => { load(); }, [load]));

const filtered = useMemo(() => {
if (preset === 'all') return rows;
const now = new Date();
if (preset === 'week') {
const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
return rows.filter((r) => new Date(r.date) >= from);
}
if (preset === 'month') {
const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
return rows.filter((r) => new Date(r.date) >= from);
}
if (preset === 'custom') {
return rows.filter((r) => {
const d = new Date(r.date);
return d >= startOfDay(fromDate) && d <= endOfDay(toDate);
});
}
return rows;
}, [rows, preset, fromDate, toDate]);

const totals = useMemo(() => ({
deposits: filtered.filter((r) => r.type === 'deposit').reduce((s, r) => s + Number(r.amount), 0),
withdrawals: filtered.filter((r) => r.type === 'withdraw').reduce((s, r) => s + Number(r.amount), 0),
}), [filtered]);

const PRESETS: { key: FilterPreset; label: string }[] = [
{ key: 'all', label: 'All' },
{ key: 'week', label: 'This Week' },
{ key: 'month', label: 'This Month' },
{ key: 'custom', label: 'Custom' },
];

const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
if (Platform.OS === 'android') setPickerTarget(null);
if (!date) return;
if (pickerTarget === 'from') setFromDate(startOfDay(date));
if (pickerTarget === 'to') setToDate(endOfDay(date));
};

return (
<SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
<View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
<View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

<View style={s.header}>
<Pressable onPress={() => router.back()} style={s.backBtn}>
<Ionicons name="arrow-back" size={22} color={p.textStrong} />
</Pressable>
<Text style={[s.headerTitle, { color: p.textStrong }]}>Funding History</Text>
<View style={{ width: 38 }} />
</View>

<ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
<View style={s.chipRow}>
{PRESETS.map((item) => {
const active = preset === item.key;
return (
<Pressable
key={item.key}
style={[s.chip, { backgroundColor: active ? p.accent : p.stageBg, borderColor: active ? p.accent : p.cardBorder }]}
onPress={() => { setPreset(item.key); setPickerTarget(null); }}
>
<Text style={[s.chipText, { color: active ? '#fff' : p.textSoft }]}>{item.label}</Text>
</Pressable>
);
})}
</View>

{preset === 'custom' && (
<View style={[s.dateCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
<View style={s.dateRow}>
<View style={s.dateField}>
<Text style={[s.dateLabel, { color: p.textSoft }]}>Start Date</Text>
<Pressable
style={[s.dateTrigger, { backgroundColor: p.stageBg, borderColor: pickerTarget === 'from' ? p.accent : p.cardBorder }]}
onPress={() => setPickerTarget(pickerTarget === 'from' ? null : 'from')}
>
<Ionicons name="calendar-outline" size={15} color={pickerTarget === 'from' ? p.accent : p.textSoft} />
<Text style={[s.dateTriggerText, { color: p.textStrong }]}>{formatDate(fromDate)}</Text>
</Pressable>
</View>
<View style={s.dateSep}>
<Text style={[s.dateSepText, { color: p.textSoft }]}>→</Text>
</View>
<View style={s.dateField}>
<Text style={[s.dateLabel, { color: p.textSoft }]}>End Date</Text>
<Pressable
style={[s.dateTrigger, { backgroundColor: p.stageBg, borderColor: pickerTarget === 'to' ? p.accent : p.cardBorder }]}
onPress={() => setPickerTarget(pickerTarget === 'to' ? null : 'to')}
>
<Ionicons name="calendar-outline" size={15} color={pickerTarget === 'to' ? p.accent : p.textSoft} />
<Text style={[s.dateTriggerText, { color: p.textStrong }]}>{formatDate(toDate)}</Text>
</Pressable>
</View>
</View>

{pickerTarget !== null && (
<View style={s.pickerWrap}>
<DateTimePicker
value={pickerTarget === 'from' ? fromDate : toDate}
mode="date"
display={Platform.OS === 'ios' ? 'inline' : 'default'}
maximumDate={pickerTarget === 'to' ? new Date() : toDate}
minimumDate={pickerTarget === 'to' ? fromDate : undefined}
onChange={onDateChange}
themeVariant={scheme === 'dark' ? 'dark' : 'light'}
style={s.picker}
/>
{Platform.OS === 'ios' && (
<Pressable style={[s.doneBtn, { backgroundColor: p.accent }]} onPress={() => setPickerTarget(null)}>
<Text style={s.doneBtnText}>Done</Text>
</Pressable>
)}
</View>
)}
</View>
)}

<View style={[s.summaryCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
<View style={s.summaryRow}>
<View style={[s.summaryTile, { backgroundColor: p.stageBg }]}>
<Text style={[s.summaryLabel, { color: p.textSoft }]}>Total Deposits</Text>
<Text style={[s.summaryValue, { color: '#059669' }]}>{formatPHP(totals.deposits)}</Text>
</View>
<View style={[s.summaryTile, { backgroundColor: p.stageBg }]}>
<Text style={[s.summaryLabel, { color: p.textSoft }]}>Total Withdrawals</Text>
<Text style={[s.summaryValue, { color: '#dc2626' }]}>{formatPHP(totals.withdrawals)}</Text>
</View>
</View>
</View>

{loading && <ActivityIndicator color={p.accent} style={{ marginTop: 20 }} />}
{!loading && !!error && <Text style={[s.feedback, { color: p.warning }]}>{error}</Text>}
{!loading && !error && filtered.length === 0 && (
<Text style={[s.feedback, { color: p.textSoft }]}>No transactions for this period.</Text>
)}

{!loading && !error && filtered.map((tx) => {
const isDeposit = tx.type === 'deposit';
return (
<View key={tx.id} style={[s.txCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
<View style={s.txTop}>
<View style={[s.typeChip, { backgroundColor: isDeposit ? '#d1fae5' : '#fee2e2' }]}>
<Ionicons name={isDeposit ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={12} color={isDeposit ? '#065f46' : '#991b1b'} />
<Text style={[s.typeChipText, { color: isDeposit ? '#065f46' : '#991b1b' }]}>{isDeposit ? 'DEPOSIT' : 'WITHDRAW'}</Text>
</View>
<Text style={[s.txAmount, { color: isDeposit ? '#059669' : '#dc2626' }]}>
{isDeposit ? '+' : '-'}{formatPHP(Number(tx.amount))}
</Text>
</View>
<Text style={[s.meta, { color: p.textSoft }]}>
Balance after: <Text style={[s.metaStrong, { color: p.textStrong }]}>{formatPHP(Number(tx.balanceAfter))}</Text>
</Text>
<Text style={[s.meta, { color: p.textSoft }]}>{tx.createdAt}</Text>
</View>
);
})}

<View style={{ height: 80 }} />
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
scroll: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
chipText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
dateCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
dateField: { flex: 1, gap: 5 },
dateSep: { paddingTop: 18 },
dateSepText: { fontSize: 16 },
dateLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
dateTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 10 },
dateTriggerText: { fontSize: 13, fontWeight: '600', fontFamily: Fonts.sans, flex: 1 },
pickerWrap: { gap: 8 },
picker: { width: '100%' },
doneBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: Fonts.mono },
summaryCard: { borderRadius: 16, borderWidth: 1, padding: 12 },
summaryRow: { flexDirection: 'row', gap: 8 },
summaryTile: { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
summaryValue: { marginTop: 4, fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
txCard: { borderRadius: 14, borderWidth: 1, padding: 12 },
txTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
typeChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
typeChipText: { fontSize: 10, fontWeight: '800', fontFamily: Fonts.mono },
txAmount: { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
meta: { fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 },
metaStrong: { fontWeight: '800', fontFamily: Fonts.mono },
feedback: { marginTop: 20, textAlign: 'center', fontSize: 13, fontFamily: Fonts.sans },
});
