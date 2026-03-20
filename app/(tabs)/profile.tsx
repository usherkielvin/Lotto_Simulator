import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

type ProfileData = {
	userId: number;
	username: string;
	displayName: string;
	memberSince: string;
	balance: number;
	totalPlays: number;
	prizesWon: number;
	bestMatch: number;
	winRate: string;
	luckyNumbers: number[];
};

function formatPHP(v: number) {
	return new Intl.NumberFormat('en-PH', {
		style: 'currency',
		currency: 'PHP',
		minimumFractionDigits: 0,
	}).format(v);
}

export default function ProfileScreen() {
	const p = usePalette();
	const router = useRouter();
	const { session, signOut } = useSession();
	const userId = session?.userId;

	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!userId) {
			setLoading(false);
			setProfile(null);
			return;
		}

		setLoading(true);
		setError('');

		apiFetch<ProfileData>('/profile', { userId })
			.then((data) => setProfile(data))
			.catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load profile.'))
			.finally(() => setLoading(false));
	}, [userId]);

	const stats = useMemo(
		() => [
			{ label: 'Total Plays', value: String(profile?.totalPlays ?? 0) },
			{ label: 'Prizes Won', value: String(profile?.prizesWon ?? 0) },
			{ label: 'Best Match', value: `${profile?.bestMatch ?? 0}/6` },
			{ label: 'Win Rate', value: profile?.winRate ?? '0%' },
		],
		[profile]
	);

	const handleSignOut = async () => {
		await signOut();
		router.replace('/login');
	};

	if (!session) {
		return (
			<SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}> 
				<View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
				<View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

				<View style={[s.guestCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}> 
					<Ionicons name="person-circle-outline" size={52} color={p.textSoft} />
					<Text style={[s.guestTitle, { color: p.textStrong }]}>Guest Explore Mode</Text>
					<Text style={[s.guestSub, { color: p.textSoft }]}>Reconnect and sign in to access your full profile and wallet actions.</Text>
				</View>
			</SafeAreaView>
		);
	}

	const name = profile?.displayName ?? session.displayName ?? 'Player';
	const luckyNumbers = profile?.luckyNumbers ?? [];

	return (
		<SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}> 
			<View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
			<View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

			<ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
				<View style={[s.hero, { backgroundColor: p.heroBg }]}> 
					<Text style={[s.heroTag, { color: 'rgba(255,255,255,0.72)' }]}>LOTTO SIMULATOR</Text>
					<Text style={[s.heroTitle, { color: '#ffffff' }]}>{name}</Text>
					<Text style={[s.heroSub, { color: 'rgba(255,255,255,0.72)' }]}>{profile?.memberSince ?? 'Member'}</Text>

					<View style={[s.balanceChip, { backgroundColor: 'rgba(255,255,255,0.14)' }]}> 
						<Text style={[s.balanceLabel, { color: 'rgba(255,255,255,0.72)' }]}>Balance</Text>
						<Text style={[s.balanceValue, { color: p.accent }]}>{formatPHP(profile?.balance ?? 0)}</Text>
					</View>
				</View>

				{loading && <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} />}
				{!loading && !!error && <Text style={[s.errorText, { color: p.warning }]}>{error}</Text>}

				{!loading && (
					<>
						<View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}> 
							<Text style={[s.sectionTitle, { color: p.textStrong }]}>Stats</Text>
							<View style={s.statsRow}>
								{stats.map((item) => (
									<View key={item.label} style={[s.statTile, { backgroundColor: p.stageBg }]}> 
										<Text style={[s.statLabel, { color: p.textSoft }]}>{item.label}</Text>
										<Text style={[s.statValue, { color: p.textStrong }]}>{item.value}</Text>
									</View>
								))}
							</View>
						</View>

						<View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}> 
							<Text style={[s.sectionTitle, { color: p.textStrong }]}>Actions</Text>
							<View style={s.actionsRow}>
								<Pressable style={[s.actionBtn, { backgroundColor: p.chipIdle }]} onPress={() => router.push('/deposit')}>
									<Ionicons name="arrow-down-circle-outline" size={16} color={p.chipIdleText} />
									<Text style={[s.actionText, { color: p.chipIdleText }]}>Deposit</Text>
								</Pressable>
								<Pressable style={[s.actionBtn, { backgroundColor: p.chipIdle }]} onPress={() => router.push('/withdraw')}>
									<Ionicons name="arrow-up-circle-outline" size={16} color={p.chipIdleText} />
									<Text style={[s.actionText, { color: p.chipIdleText }]}>Withdraw</Text>
								</Pressable>
							</View>

							<Pressable style={[s.fullAction, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]} onPress={() => router.push('/funding-history')}>
								<Ionicons name="receipt-outline" size={16} color={p.textStrong} />
								<Text style={[s.fullActionText, { color: p.textStrong }]}>View Funding History</Text>
								<Ionicons name="chevron-forward" size={16} color={p.textSoft} />
							</Pressable>

							{session.role === 'admin' && (
								<Pressable style={[s.fullAction, { backgroundColor: p.stageBg, borderColor: p.cardBorder }]} onPress={() => router.push('/admin')}>
									<Ionicons name="shield-checkmark-outline" size={16} color={p.textStrong} />
									<Text style={[s.fullActionText, { color: p.textStrong }]}>Open Admin Panel</Text>
									<Ionicons name="chevron-forward" size={16} color={p.textSoft} />
								</Pressable>
							)}
						</View>

						<View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}> 
							<Text style={[s.sectionTitle, { color: p.textStrong }]}>Lucky Numbers</Text>
							<View style={s.luckyRow}>
								{luckyNumbers.length > 0 ? (
									luckyNumbers.map((n, idx) => (
										<View key={`${n}-${idx}`} style={[s.ball, { backgroundColor: p.secondaryButton }]}> 
											<Text style={[s.ballText, { color: p.secondaryButtonText }]}>{n}</Text>
										</View>
									))
								) : (
									<Text style={[s.emptyLuckyText, { color: p.textSoft }]}>No lucky number data yet.</Text>
								)}
							</View>
						</View>

						<Pressable style={[s.signOutBtn, { backgroundColor: '#dc2626' }]} onPress={handleSignOut}>
							<Ionicons name="exit-outline" size={16} color="#ffffff" />
							<Text style={s.signOutText}>Sign Out</Text>
						</Pressable>
					</>
				)}

				<View style={{ height: 110 }} />
			</ScrollView>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	root: { flex: 1 },
	orbTop: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -85, opacity: 0.55 },
	orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.42 },
	scroll: { padding: 16, gap: 14 },
	hero: { borderRadius: 18, padding: 16 },
	heroTag: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono },
	heroTitle: { marginTop: 4, fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded },
	heroSub: { marginTop: 4, fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
	balanceChip: { marginTop: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
	balanceLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
	balanceValue: { marginTop: 4, fontSize: 19, fontWeight: '800', fontFamily: Fonts.rounded },
	card: { borderRadius: 16, borderWidth: 1, padding: 14 },
	sectionTitle: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded, marginBottom: 12 },
	statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	statTile: { width: '48%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
	statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
	statValue: { marginTop: 4, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
	actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
	actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 4 },
	actionText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },
	fullAction: {
		borderRadius: 12,
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 11,
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginTop: 8,
	},
	fullActionText: { flex: 1, fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans },
	luckyRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
	ball: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
	ballText: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono },
	emptyLuckyText: { fontSize: 13, fontFamily: Fonts.sans },
	errorText: { textAlign: 'center', fontSize: 13, fontFamily: Fonts.sans, marginTop: 14 },
	signOutBtn: {
		marginTop: 4,
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: 8,
	},
	signOutText: { color: '#ffffff', fontSize: 14, fontWeight: '800', fontFamily: Fonts.mono },
	guestCard: {
		margin: 16,
		marginTop: 30,
		borderRadius: 16,
		borderWidth: 1,
		padding: 18,
		alignItems: 'center',
	},
	guestTitle: { fontSize: 18, fontWeight: '800', fontFamily: Fonts.rounded, marginTop: 8 },
	guestSub: { marginTop: 8, textAlign: 'center', fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans },
});

