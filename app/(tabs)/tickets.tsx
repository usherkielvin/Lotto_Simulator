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
  jackpot?: number | null;
  officialNumbers?: number[] | null;
}

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

function formatJackpot(v: number) {
  if (v >= 1_000_000_000) return `₱${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`;
  return formatPHP(v);
}

function formatDateStr(dateKey: string) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${m}/${d}/${y}`;
}

function formatTicketDrawLabel(ticket: Ticket) {
  const drawTime = ticket.drawTime?.trim();
  return `${formatDateStr(ticket.drawDateKey)} · ${drawTime && drawTime.length > 0 ? drawTime : '9:00 PM'}`;
}

/** Same ball style as the Results tab — yellow bg, brown number */
function NumberBalls({
  numbers,
  accent,
  accentText,
}: {
  numbers: number[];
  accent: string;
  accentText: string;
}) {
  return (
    <View style={s.ballsRow}>
      {numbers.map((n, idx) => (
        <View key={idx} style={[s.ball, { backgroundColor: accent }]}>
          <Text style={[s.ballText, { color: accentText }]}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

/** Settled balls — matched = yellow/brown (results style), unmatched = muted */
function SettledBalls({
  numbers,
  officialNumbers,
  gameId,
  accent,
  accentText,
  mutedBg,
  mutedText,
}: {
  numbers: number[];
  officialNumbers: number[];
  gameId: string;
  accent: string;
  accentText: string;
  mutedBg: string;
  mutedText: string;
}) {
  const isDigit = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(gameId);
  return (
    <View style={s.ballsRow}>
      {numbers.map((n, idx) => {
        const hit = isDigit ? officialNumbers[idx] === n : officialNumbers.includes(n);
        return (
          <View key={idx} style={[s.ball, { backgroundColor: hit ? accent : mutedBg }]}>
            <Text style={[s.ballText, { color: hit ? accentText : mutedText, fontWeight: hit ? '900' : '700' }]}>
              {n}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ActiveCard({ ticket, p }: { ticket: Ticket; p: ReturnType<typeof usePalette> }) {
  return (
    <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardGame, { color: p.textStrong }]}>{ticket.gameName}</Text>
          <View style={s.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={p.textSoft} />
            <Text style={[s.cardMeta, { color: p.textSoft }]}>{formatTicketDrawLabel(ticket)}</Text>
          </View>
        </View>
        <View style={[s.badge, { backgroundColor: p.chipIdle }]}>
          <Ionicons name="time-outline" size={11} color={p.chipIdleText} />
          <Text style={[s.badgeText, { color: p.chipIdleText }]}>PENDING</Text>
        </View>
      </View>

      <NumberBalls numbers={ticket.numbers} accent={p.accent} accentText={p.accentText} />

      <View style={s.cardFoot}>
        <Text style={[s.footText, { color: p.textSoft }]}>
          Stake <Text style={[s.footVal, { color: p.textStrong }]}>{formatPHP(ticket.stake)}</Text>
        </Text>
        {(ticket.jackpot ?? 0) > 0 && (
          <Text style={[s.footText, { color: p.textSoft }]}>
            Jackpot <Text style={[s.footVal, { color: p.accent }]}>{formatJackpot(ticket.jackpot!)}</Text>
          </Text>
        )}
      </View>
      <Text style={[s.placedAt, { color: p.textSoft }]}>Placed {ticket.placedAt}</Text>
    </View>
  );
}

function HistoryCard({ ticket, p }: { ticket: Ticket; p: ReturnType<typeof usePalette> }) {
  const winning = ticket.officialNumbers ?? [];
  const isDigit = ['2d-ez2', '3d-swertres', '4digit', '6digit'].includes(ticket.gameId);
  const drawTime = ticket.drawTime?.trim();

  let matchCount = 0;
  if (isDigit) {
    ticket.numbers.forEach((n, idx) => { if (winning[idx] === n) matchCount++; });
  } else {
    ticket.numbers.forEach(n => { if (winning.includes(n)) matchCount++; });
  }

  // Exact match for digit games or status is won
  const isExactMatch = isDigit && winning.length > 0 && matchCount === ticket.numbers.length;
  const won = ticket.status === 'won' || (ticket.payout ?? 0) > 0 || isExactMatch;
  
  // Calculate multiplier for digit games (stake / 10)
  const multiplier = isDigit ? (ticket.stake / 10) : 1;
  const potentialPayout = isExactMatch ? (ticket.jackpot ?? 0) * multiplier : 0;
  const payout = (ticket.payout ?? 0) > 0 ? (ticket.payout ?? 0) : potentialPayout;

  let iconName: keyof typeof Ionicons.glyphMap;
  let label: string;
  let badgeBg: string;
  let badgeTxt: string;

  if (won) {
    const isJackpot = !isDigit && matchCount === 6;
    iconName  = isJackpot ? 'trophy' : 'checkmark-circle';
    label     = isJackpot ? 'JACKPOT' : (isDigit ? 'WINNER' : `${matchCount}/6 WIN`);
    badgeBg   = p.accent + '33';
    badgeTxt  = p.accent;
  } else if (matchCount > 0) {
    iconName  = 'star-half';
    label     = isDigit ? `${matchCount} MATCH` : `${matchCount}/6 MATCH`;
    badgeBg   = p.chipIdle;
    badgeTxt  = p.chipIdleText;
  } else {
    iconName  = 'close-circle';
    label     = 'NO MATCH';
    badgeBg   = p.chipIdle;
    badgeTxt  = p.chipIdleText;
  }

  return (
    <View style={[
      s.card,
      { backgroundColor: p.cardBg, borderColor: p.cardBorder },
      won && { borderLeftWidth: 4, borderLeftColor: p.accent },
    ]}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardGame, { color: p.textStrong }]}>{ticket.gameName}</Text>
          <View style={s.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={p.textSoft} />
            <Text style={[s.cardMeta, { color: p.textSoft }]}>
              {formatDateStr(ticket.drawDateKey)}{drawTime ? ` · ${drawTime}` : ''}
            </Text>
          </View>
        </View>
        <View style={[s.badge, { backgroundColor: badgeBg }]}>
          <Ionicons name={iconName} size={11} color={badgeTxt} />
          <Text style={[s.badgeText, { color: badgeTxt }]}>{label}</Text>
        </View>
      </View>

      {/* Your numbers */}
      {winning.length > 0 ? (
        <SettledBalls
          numbers={ticket.numbers}
          officialNumbers={winning}
          gameId={ticket.gameId}
          accent={p.accent}
          accentText={p.accentText}
          mutedBg={p.stageBg}
          mutedText={p.textSoft}
        />
      ) : (
        <NumberBalls numbers={ticket.numbers} accent={p.accent} accentText={p.accentText} />
      )}

      <View style={s.cardFoot}>
        <Text style={[s.footText, { color: p.textSoft }]}>
          Stake <Text style={[s.footVal, { color: p.textStrong }]}>{formatPHP(ticket.stake)}</Text>
        </Text>
        {payout > 0 && (
          <Text style={[s.footText, { color: p.textSoft }]}>
            Payout <Text style={[s.footVal, { color: p.accent }]}>{formatPHP(payout)}</Text>
          </Text>
        )}
      </View>
      <Text style={[s.placedAt, { color: p.textSoft }]}>Placed {ticket.placedAt}</Text>
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
          <Text style={[s.heroTitle, { color: '#ffffff' }]}>My Tickets</Text>
          <Text style={[s.heroSub,   { color: 'rgba(255,255,255,0.70)' }]}>Admin account</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
          <Ionicons name="shield-checkmark-outline" size={52} color={p.textSoft} />
          <Text style={[s.heroTitle, { color: p.textStrong, textAlign: 'center', fontSize: 18 }]}>
            Admins don't place bets
          </Text>
          <Text style={[s.heroSub, { color: p.textSoft, textAlign: 'center' }]}>
            Use the Admin tab to manage draw results.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const shown = filter === 'active' ? active : history;
  const totalWon = history.reduce((sum, t) => sum + (t.payout ?? 0), 0);

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
                <Text style={[s.filterText, { color: isActive ? p.chipActiveText : p.textSoft }]}>
                  {key === 'active' ? 'Pending' : 'Settled'}
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
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardMeta:  { fontSize: 11, fontFamily: Fonts.mono },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800', fontFamily: Fonts.mono },
  ballsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  ball:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  ballText:  { fontSize: 12, fontWeight: '800', fontFamily: Fonts.mono },
  officialRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  officialLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono, minWidth: 38 },
  cardFoot:  { flexDirection: 'row', gap: 14, marginTop: 4, marginBottom: 6 },
  footText:  { fontSize: 12, fontFamily: Fonts.sans },
  footVal:   { fontWeight: '700', fontFamily: Fonts.mono },
  placedAt:  { fontSize: 11, fontFamily: Fonts.sans },
});
