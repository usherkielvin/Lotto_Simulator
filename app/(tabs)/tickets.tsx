import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

type TicketStatus = 'pending' | 'won' | 'lost';

interface Ticket {
  id: string;
  game: string;
  drawDate: string;
  placedAt: string;
  numbers: number[];
  stake: number;
  status: TicketStatus;
  matches?: number;
  payout?: number;
}

const TICKETS: Ticket[] = [
  {
    id: '1', game: 'Grand Lotto 6/55', drawDate: 'Mar 17, 2026', placedAt: 'Mar 17, 2026 6:42 PM',
    numbers: [4, 12, 27, 38, 51, 55], stake: 60, status: 'pending',
  },
  {
    id: '2', game: 'Lotto 6/42', drawDate: 'Mar 17, 2026', placedAt: 'Mar 17, 2026 5:10 PM',
    numbers: [3, 9, 18, 24, 36, 41], stake: 20, status: 'pending',
  },
  {
    id: '3', game: 'Super Lotto 6/49', drawDate: 'Mar 16, 2026', placedAt: 'Mar 16, 2026 7:00 PM',
    numbers: [5, 17, 22, 33, 41, 8], stake: 20, status: 'won', matches: 3, payout: 1000,
  },
  {
    id: '4', game: 'Mega Lotto 6/45', drawDate: 'Mar 15, 2026', placedAt: 'Mar 15, 2026 4:30 PM',
    numbers: [7, 14, 23, 31, 42, 6], stake: 40, status: 'lost', matches: 1, payout: 0,
  },
  {
    id: '5', game: 'Grand Lotto 6/55', drawDate: 'Mar 14, 2026', placedAt: 'Mar 14, 2026 3:15 PM',
    numbers: [12, 18, 25, 34, 43, 4], stake: 60, status: 'won', matches: 4, payout: 30000,
  },
  {
    id: '6', game: 'Lotto 6/42', drawDate: 'Mar 13, 2026', placedAt: 'Mar 13, 2026 8:00 PM',
    numbers: [2, 9, 20, 30, 40, 39], stake: 20, status: 'lost', matches: 0, payout: 0,
  },
];

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', minimumFractionDigits: 0,
  }).format(v);
}

const STATUS_META: Record<TicketStatus, { label: string; iconName: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'PENDING', iconName: 'time-outline'         },
  won:     { label: 'WON',     iconName: 'trophy-outline'       },
  lost:    { label: 'LOST',    iconName: 'close-circle-outline' },
};

function TicketCard({ ticket, p }: { ticket: Ticket; p: ReturnType<typeof usePalette> }) {
  const meta = STATUS_META[ticket.status];

  const statusBg =
    ticket.status === 'won'     ? p.chipActive :
    ticket.status === 'pending' ? p.secondaryButton :
    p.chipIdle;

  const statusText =
    ticket.status === 'won'     ? p.accentText :
    ticket.status === 'pending' ? p.secondaryButtonText :
    p.chipIdleText;

  return (
    <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
      {/* Header */}
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardGame, { color: p.textStrong }]}>{ticket.game}</Text>
          <Text style={[s.cardMeta, { color: p.textSoft }]}>Draw: {ticket.drawDate} · 9:00 PM</Text>
        </View>
        <View style={[s.badge, { backgroundColor: statusBg }]}>
          <Ionicons name={meta.iconName} size={12} color={statusText} />
          <Text style={[s.badgeText, { color: statusText }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Number balls */}
      <View style={s.ballsRow}>
        {ticket.numbers.map((n) => (
          <View key={n} style={[s.ball, { backgroundColor: p.stageBg }]}>
            <Text style={[s.ballText, { color: p.textStrong }]}>{n}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={s.cardFoot}>
        <Text style={[s.footText, { color: p.textSoft }]}>
          Stake <Text style={[s.footVal, { color: p.textStrong }]}>{formatPHP(ticket.stake)}</Text>
        </Text>
        {ticket.status === 'won' && (
          <Text style={[s.footText, { color: p.payout }]}>
            Payout <Text style={[s.footVal, { color: p.payout }]}>{formatPHP(ticket.payout ?? 0)}</Text>
          </Text>
        )}
        {ticket.status !== 'pending' && (
          <Text style={[s.footText, { color: p.textSoft }]}>
            Matches <Text style={[s.footVal, { color: p.textStrong }]}>{ticket.matches ?? 0}/6</Text>
          </Text>
        )}
      </View>

      <Text style={[s.placedAt, { color: p.textSoft }]}>Placed {ticket.placedAt}</Text>
    </View>
  );
}

export default function TicketsScreen() {
  const p = usePalette();

  const pending = TICKETS.filter((t) => t.status === 'pending');
  const settled = TICKETS.filter((t) => t.status !== 'pending');
  const totalWon = settled.reduce((sum, t) => sum + (t.payout ?? 0), 0);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop,    { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: p.heroBg }]}>
          <Text style={[s.heroTag,   { color: 'rgba(255,255,255,0.70)' }]}>PCSO LOTTO SIMULATOR</Text>
          <Text style={[s.heroTitle, { color: '#ffffff' }]}>My Tickets</Text>
          <Text style={[s.heroSub,   { color: 'rgba(255,255,255,0.70)' }]}>Track all your active and past bets</Text>

          <View style={s.statsRow}>
            {[
              { label: 'Active',     value: String(pending.length) },
              { label: 'Settled',    value: String(settled.length) },
              { label: 'Total Won',  value: formatPHP(totalWon)    },
            ].map(({ label, value }) => (
              <View key={label} style={[s.stat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.70)' }]}>{label}</Text>
                <Text style={[s.statValue, { color: p.accent }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pending */}
        {pending.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <Ionicons name="time-outline" size={14} color={p.textSoft} />
              <Text style={[s.sectionLabel, { color: p.textSoft }]}>Awaiting draw</Text>
            </View>
            {pending.map((t) => <TicketCard key={t.id} ticket={t} p={p} />)}
          </>
        )}

        {/* Settled */}
        {settled.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <Ionicons name="checkmark-circle-outline" size={14} color={p.textSoft} />
              <Text style={[s.sectionLabel, { color: p.textSoft }]}>Settled</Text>
            </View>
            {settled.map((t) => <TicketCard key={t.id} ticket={t} p={p} />)}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80,   right: -85,   opacity: 0.55 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.42 },
  scroll: { padding: 16, gap: 14 },

  hero:      { borderRadius: 18, padding: 16 },
  heroTag:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono },
  heroTitle: { marginTop: 4, fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded },
  heroSub:   { marginTop: 4, fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
  statsRow:  { marginTop: 12, flexDirection: 'row', gap: 8 },
  stat:      { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  statValue: { marginTop: 4, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },

  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono, textTransform: 'uppercase', letterSpacing: 0.5 },

  card:     { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  cardGame: { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  cardMeta: { fontSize: 11, marginTop: 2, fontFamily: Fonts.sans },

  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800', fontFamily: Fonts.mono },

  ballsRow: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  ball:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ballText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },

  cardFoot: { flexDirection: 'row', gap: 14, marginBottom: 6 },
  footText: { fontSize: 12, fontFamily: Fonts.sans },
  footVal:  { fontWeight: '700', fontFamily: Fonts.mono },

  placedAt: { fontSize: 11, fontFamily: Fonts.sans },
});
