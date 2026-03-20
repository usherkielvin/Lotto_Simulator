import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

type Filter = 'active' | 'history';

interface Ticket {
  id: string;
  gameId: string;
  gameName: string;
  drawDateKey: string;
  drawTime?: string | null;
  placedAt: string;
  numbers: number[];
  stake: number;
  status: 'pending' | 'won' | 'lost';
  matches?: number | null;
  payout?: number | null;
  officialNumbers?: number[] | null;
}

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

function formatTicketDrawLabel(ticket: Ticket) {
  const drawTime = ticket.drawTime?.trim();
  return `Draw: ${ticket.drawDateKey} · ${drawTime && drawTime.length > 0 ? drawTime : '9:00 PM'}`;
}

function ActiveCard({ ticket, p }: { ticket: Ticket; p: ReturnType<typeof usePalette> }) {
  return (
    <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardGame, { color: p.textStrong }]}>{ticket.gameName}</Text>
          <Text style={[s.cardMeta, { color: p.textSoft  }]}>{formatTicketDrawLabel(ticket)}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: p.secondaryButton }]}>
          <Ionicons name="time-outline" size={12} color={p.secondaryButtonText} />
          <Text style={[s.badgeText, { color: p.secondaryButtonText }]}>PENDING</Text>
        </View>
      </View>

      <View style={s.ballsRow}>
        {ticket.numbers.map((n, idx) => (
          <View key={`${ticket.id}-${n}-${idx}`} style={[s.ball, { backgroundColor: p.stageBg }]}> 
            <Text style={[s.ballText, { color: p.textStrong }]}>{n}</Text>
          </View>
        ))}
      </View>

      <View style={s.cardFoot}>
        <Text style={[s.footText, { color: p.textSoft }]}>
          Stake <Text style={[s.footVal, { color: p.textStrong }]}>{formatPHP(ticket.stake)}</Text>
        </Text>
      </View>
      <Text style={[s.placedAt, { color: p.textSoft }]}>Placed {ticket.placedAt}</Text>
    </View>
  );
}

function HistoryCard({ ticket, p }: { ticket: Ticket; p: ReturnType<typeof usePalette> }) {
  const won     = (ticket.payout ?? 0) > 0;
  const winning = ticket.officialNumbers ?? [];
  const drawTime = ticket.drawTime?.trim();

  const cardBg  = won ? p.accent              : p.cardBg;
  const cardTxt = won ? '#3d2800'             : p.textStrong;
  const cardSub = won ? 'rgba(61,40,0,0.65)' : p.textSoft;
  const ballBg  = won ? 'rgba(0,0,0,0.12)'   : p.stageBg;
  const ballTxt = won ? '#3d2800'             : p.textStrong;
  const badgeBg = won ? 'rgba(0,0,0,0.12)'   : p.chipIdle;
  const badgeTxt= won ? '#3d2800'             : p.chipIdleText;

  const iconName: keyof typeof Ionicons.glyphMap =
    ticket.matches === 6              ? 'trophy'        :
    (ticket.matches ?? 0) >= 3        ? 'star'          : 'close-circle';
  const label =
    ticket.matches === 6              ? 'JACKPOT'                    :
    (ticket.matches ?? 0) >= 3        ? `${ticket.matches}/6 WIN`    : 'NO MATCH';

  return (
    <View style={[s.card, { backgroundColor: cardBg, borderColor: won ? 'transparent' : p.cardBorder }]}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardGame, { color: cardTxt }]}>{ticket.gameName}</Text>
          <Text style={[s.cardMeta, { color: cardSub }]}>{ticket.drawDateKey}{drawTime ? ` · ${drawTime}` : ''}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: badgeBg }]}>
          <Ionicons name={iconName} size={12} color={badgeTxt} />
          <Text style={[s.badgeText, { color: badgeTxt }]}>{label}</Text>
        </View>
      </View>

      <View style={s.ballsRow}>
        {ticket.numbers.map((n, idx) => {
          const isMatch = (ticket.matches ?? 0) >= 3 && winning.includes(n);
          return (
            <View key={`${ticket.id}-${n}-${idx}`} style={[s.ball, { backgroundColor: isMatch ? '#3d2800' : ballBg }, isMatch && s.ballHighlight]}>
              <Text style={[s.ballText, { color: isMatch ? '#f4b400' : ballTxt, fontWeight: isMatch ? '900' : '700' }]}>{n}</Text>
            </View>
          );
        })}
      </View>

      <View style={s.cardFoot}>
        <Text style={[s.footText, { color: cardSub }]}>
          Stake <Text style={[s.footVal, { color: cardTxt }]}>{formatPHP(ticket.stake)}</Text>
        </Text>
        {won && (
          <Text style={[s.footText, { color: cardTxt, fontWeight: '800' }]}>
            Payout <Text style={s.footVal}>{formatPHP(ticket.payout ?? 0)}</Text>
          </Text>
        )}
      </View>
      <Text style={[s.placedAt, { color: cardSub }]}>Placed {ticket.placedAt}</Text>
    </View>
  );
}

export default function TicketsScreen() {
  const p = usePalette();
  const { session } = useSession();
  const userId = session?.userId;
  const isAdmin = session?.role === 'admin';

  const [active,  setActive]  = useState<Ticket[]>([]);
  const [history, setHistory] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState<Filter>('active');

  const load = useCallback(() => {
    if (!userId || isAdmin) { setLoading(false); return; }
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch<Ticket[]>('/bets',         { userId }),
      apiFetch<Ticket[]>('/bets/history', { userId }),
    ])
      .then(([a, h]) => { setActive(a); setHistory(h); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load tickets.'))
      .finally(() => setLoading(false));
  }, [userId, isAdmin]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (isAdmin) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
        <View style={[s.orbTop,    { backgroundColor: p.orbOne }]} />
        <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />
        <View style={[s.hero, { backgroundColor: p.heroBg, margin: 16, borderRadius: 18 }]}>
          <Text style={[s.heroTag,   { color: 'rgba(255,255,255,0.70)' }]}>LOTTO SIMULATOR</Text>
          <Text style={[s.heroTitle, { color: '#ffffff' }]}>My Bets</Text>
          <Text style={[s.heroSub,   { color: 'rgba(255,255,255,0.70)' }]}>Admin account</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
          <Ionicons name="shield-checkmark-outline" size={52} color={p.textSoft} />
          <Text style={[s.heroTitle, { color: p.textStrong, textAlign: 'center', fontSize: 18 }]}>
            Admins don't place bets
          </Text>
          <Text style={[s.heroSub, { color: p.textSoft, textAlign: 'center' }]}>
            Use the Admin tab to manage draw results and sync PCSO data.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const shown = filter === 'active' ? active : history;
  const totalWon = history.reduce((s, t) => s + (t.payout ?? 0), 0);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop,    { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={[s.hero, { backgroundColor: p.heroBg }]}>
          <Text style={[s.heroTag,   { color: 'rgba(255,255,255,0.70)' }]}>LOTTO SIMULATOR</Text>
          <Text style={[s.heroTitle, { color: '#ffffff' }]}>My Tickets</Text>
          <Text style={[s.heroSub,   { color: 'rgba(255,255,255,0.70)' }]}>Track your bets &amp; results</Text>

          <View style={s.statsRow}>
            {[
              { label: 'Active',    value: String(active.length) },
              { label: 'Total Won', value: formatPHP(totalWon)   },
            ].map(({ label, value }) => (
              <View key={label} style={[s.stat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.70)' }]}>{label}</Text>
                <Text style={[s.statValue, { color: p.accent }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filter tabs */}
        <View style={[s.filterRow, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          {(['active', 'history'] as Filter[]).map((key) => {
            const isActive = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={[s.filterTab, isActive && { backgroundColor: p.chipActive }]}
              >
                <Text style={[s.filterText, { color: isActive ? p.accentText : p.textSoft }]}>
                  {key === 'active' ? 'Awaiting Draw' : 'Results'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 24 }} color={p.accent} />}
        {!!error  && <Text style={[s.emptyText, { color: p.warning }]}>{error}</Text>}
        {!loading && !error && shown.length === 0 && (
          <Text style={[s.emptyText, { color: p.textSoft }]}>
            {filter === 'active'
              ? 'No active tickets. Head to the home tab and place a bet!'
              : 'No settled bets yet.'}
          </Text>
        )}

        {shown.map((t) =>
          filter === 'active'
            ? <ActiveCard  key={t.id} ticket={t} p={p} />
            : <HistoryCard key={t.id} ticket={t} p={p} />
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80,   right: -85,   opacity: 0.55 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.42 },
  scroll:    { padding: 16, gap: 14 },
  hero:      { borderRadius: 18, padding: 16 },
  heroTag:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono },
  heroTitle: { marginTop: 4, fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded },
  heroSub:   { marginTop: 4, fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
  statsRow:  { marginTop: 12, flexDirection: 'row', gap: 8 },
  stat:      { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  statValue: { marginTop: 4, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  filterRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  filterTab: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  filterText:{ fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono },
  emptyText: { marginTop: 24, textAlign: 'center', fontSize: 13, fontFamily: Fonts.sans, paddingHorizontal: 16 },
  card:      { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardHead:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  cardGame:  { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  cardMeta:  { fontSize: 11, marginTop: 2, fontFamily: Fonts.sans },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800', fontFamily: Fonts.mono },
  ballsRow:  { flexDirection: 'row', gap: 7, marginBottom: 12 },
  ball:          { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ballHighlight: { borderWidth: 2, borderColor: '#3d2800' },
  ballText:      { fontSize: 12, fontFamily: Fonts.mono },
  cardFoot:  { flexDirection: 'row', gap: 14, marginBottom: 6 },
  footText:  { fontSize: 12, fontFamily: Fonts.sans },
  footVal:   { fontWeight: '700', fontFamily: Fonts.mono },
  placedAt:  { fontSize: 11, fontFamily: Fonts.sans },
});
