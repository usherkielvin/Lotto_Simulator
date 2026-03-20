import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

type FundingTx = {
	id: number;
	type: 'deposit' | 'withdraw';
	amount: number;
	balanceAfter: number;
	createdAt: string;
};

function formatPHP(v: number) {
	return new Intl.NumberFormat('en-PH', {
		style: 'currency',
		currency: 'PHP',
		minimumFractionDigits: 0,
	}).format(v);
}

export default function FundingHistoryScreen() {
	const p = usePalette();
	const router = useRouter();
	const { session } = useSession();
	const userId = session?.userId;

	const [rows, setRows] = useState<FundingTx[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const load = useCallback(() => {
		if (!userId) {
			setRows([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		setError('');

		apiFetch<FundingTx[]>('/bets/funding', { userId })
			.then((data) => setRows(data))
			.catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load funding history.'))
			.finally(() => setLoading(false));
	}, [userId]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	const totals = useMemo(() => {
		const deposits = rows.filter((r) => r.type === 'deposit').reduce((sum, r) => sum + Number(r.amount), 0);
		const withdrawals = rows.filter((r) => r.type === 'withdraw').reduce((sum, r) => sum + Number(r.amount), 0);
		return { deposits, withdrawals };
	}, [rows]);

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
				<View style={[s.summaryCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}> 
					<View style={s.summaryRow}>
						<View style={[s.summaryTile, { backgroundColor: p.stageBg }]}> 
							<Text style={[s.summaryLabel, { color: p.textSoft }]}>Total Deposits</Text>
							<Text style={[s.summaryDepositValue, { color: '#059669' }]}>{formatPHP(totals.deposits)}</Text>
						</View>
						<View style={[s.summaryTile, { backgroundColor: p.stageBg }]}> 
							<Text style={[s.summaryLabel, { color: p.textSoft }]}>Total Withdrawals</Text>
							<Text style={[s.summaryWithdrawValue, { color: '#dc2626' }]}>{formatPHP(totals.withdrawals)}</Text>
						</View>
					</View>
				</View>

				{loading && <ActivityIndicator color={p.accent} style={{ marginTop: 20 }} />}
				{!loading && !!error && <Text style={[s.feedback, { color: p.warning }]}>{error}</Text>}
				{!loading && !error && rows.length === 0 && (
					<Text style={[s.feedback, { color: p.textSoft }]}>No funding transactions yet.</Text>
				)}

				{!loading && !error && rows.map((tx) => {
					const isDeposit = tx.type === 'deposit';
					return (
						<View key={tx.id} style={[s.txCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}> 
							<View style={s.txTop}>
								<View style={[s.typeChip, { backgroundColor: isDeposit ? '#d1fae5' : '#fee2e2' }]}> 
									<Ionicons
										name={isDeposit ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
										size={12}
										color={isDeposit ? '#065f46' : '#991b1b'}
									/>
									<Text style={[s.typeChipText, { color: isDeposit ? '#065f46' : '#991b1b' }]}>{isDeposit ? 'DEPOSIT' : 'WITHDRAW'}</Text>
								</View>

								<Text style={[s.txAmount, { color: isDeposit ? '#059669' : '#dc2626' }]}>
									{isDeposit ? '+' : '-'}{formatPHP(Number(tx.amount))}
								</Text>
							</View>

							<Text style={[s.meta, { color: p.textSoft }]}>Balance after: <Text style={[s.metaStrong, { color: p.textStrong }]}>{formatPHP(Number(tx.balanceAfter))}</Text></Text>
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
	summaryCard: { borderRadius: 16, borderWidth: 1, padding: 12 },
	summaryRow: { flexDirection: 'row', gap: 8 },
	summaryTile: { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
	summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
	summaryDepositValue: { marginTop: 4, fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
	summaryWithdrawValue: { marginTop: 4, fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
	txCard: { borderRadius: 14, borderWidth: 1, padding: 12 },
	txTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
	typeChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
	typeChipText: { fontSize: 10, fontWeight: '800', fontFamily: Fonts.mono },
	txAmount: { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
	meta: { fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 },
	metaStrong: { fontWeight: '800', fontFamily: Fonts.mono },
	feedback: { marginTop: 20, textAlign: 'center', fontSize: 13, fontFamily: Fonts.sans },
});
