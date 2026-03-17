import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

interface DrawRecord {
  id: string;
  game: string;
  date: string;
  numbers: number[];
  winningNumbers: number[];
  matched: number;
  stake: number;
  payout: number;
}

const HISTORY: DrawRecord[] = [
  { id: '1', game: 'Lotto 6/42',       date: 'Mar 15, 2026', numbers: [7,14,23,31,42,6],  winningNumbers: [7,14,5,19,33,40],   matched: 2, stake: 20,  payout: 0     },
  { id: '2', game: 'Mega Lotto 6/45',  date: 'Mar 12, 2026', numbers: [3,11,19,28,37,45], winningNumbers: [1,8,16,22,30,44],   matched: 0, stake: 40,  payout: 0     },
  { id: '3', game: 'Super Lotto 6/49', date: 'Mar 9, 2026',  numbers: [5,17,22,33,41,8],  winningNumbers: [5,17,22,10,26,39],  matched: 3, stake: 20,  payout: 1000  },
  { id: '4', game: 'Lotto 6/42',       date: 'Mar 6, 2026',  numbers: [2,9,20,30,40,49],  winningNumbers: [9,13,18,25,36,42],  matched: 1, stake: 20,  payout: 0     },
  { id: '5', game: 'Grand Lotto 6/55', date: 'Mar 3, 2026',  numbers: [12,18,25,34,43,4], winningNumbers: [12,18,25,34,7,50],  matched: 4, stake: 60,  payout: 30000 },
  { id: '6', game: 'Mega Lotto 6/45',  date: 'Feb 28, 2026', numbers: [1,16,24,36,44,10], winningNumbers: [3,9,20,29,38,45],   matched: 0, stake: 20,  payout: 0     },
  { id: '7', game: 'Lotto 6/42',       date: 'Feb 25, 2026', numbers: [8,13,21,29,38,47], winningNumbers: [8,13,6,17,30,41],   matched: 2, stake: 40,  payout: 0     },
  { id: '8', game: 'Super Lotto 6/49', date: 'Feb 22, 2026', numbers: [6,15,26,35,46,3],  winningNumbers: [6,11,19,28,40,49],  matched: 1, stake: 20,  payout: 0     },
];

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

function statusInfo(matched: number): { label: string; iconName: keyof typeof Ionicons.glyphMap } {
  if (matched === 6) return { label: 'JACKPOT',        iconName: 'trophy'              };
  if (matched >= 4)  return { label: `${matched}/6 WIN`, iconName: 'star'              };
  if (matched === 3) return { label: `${matched}/6 WIN`, iconName: 'ribbon'            };
  if (matched > 0)   return { label: `${matched}/6`,     iconName: 'ellipse'           };
  return               { label: 'NO MATCH',              iconName: 'close-circle'      };
}

export default function HistoryScreen() {
  const p = usePalette();

  const totalStaked = HISTORY.reduce((s, r) => s + r.stake, 0);
  const totalPayout = HISTORY.reduce((s, r) => s + r.payout, 0);
  const bestMatch   = Math.max(...HISTORY.map((r) => r.matched));

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      {/* Orbs */}
      <View style={[s.orbTop,    { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: p.heroBg }]}>
          <Text style={[s.heroTag,   { color: 'rgba(255,255,255,0.70)' }]}>PCSO LOTTO SIMULATOR</Text>
          <Text style={[s.heroTitle, { color: '#ffffff' }]}>Bet History</Text>
          <Text style={[s.heroSub,   { color: 'rgba(255,255,255,0.70)' }]}>All your past draw tickets</Text>

          <View style={s.statsRow}>
            {[
              { label: 'Total Staked', value: formatPHP(totalStaked) },
              { label: 'Total Payout', value: formatPHP(totalPayout) },
              { label: 'Best Match',   value: `${bestMatch}/6`       },
            ].map(({ label, value }) => (
              <View key={label} style={[s.stat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.70)' }]}>{label}</Text>
                <Text style={[s.statValue, { color: p.accent }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ticket list */}
        {HISTORY.map((record) => {
          const { label, iconName } = statusInfo(record.matched);
          const won = record.payout > 0;

          const ticketBg    = won ? p.accent                  : p.cardBg;
          const cardText    = won ? '#3d2800'                  : p.textStrong;
          const cardSubText = won ? 'rgba(61,40,0,0.65)'      : p.textSoft;
          const ballBg      = won ? 'rgba(0,0,0,0.12)'        : p.secondaryButton;
          const ballText    = won ? '#3d2800'                  : p.secondaryButtonText;
          const badgeBg     = won ? 'rgba(0,0,0,0.12)'        : p.chipIdle;
          const badgeText   = won ? '#3d2800'                  : p.chipIdleText;
          const borderCol   = won ? 'transparent'             : p.cardBorder;

          return (
            <View key={record.id} style={[s.card, { backgroundColor: ticketBg, borderColor: borderCol }]}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardGame, { color: cardText    }]}>{record.game}</Text>
                  <Text style={[s.cardDate, { color: cardSubText }]}>{record.date}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: badgeBg }]}>
                  <Ionicons name={iconName} size={12} color={badgeText} />
                  <Text style={[s.badgeLabel, { color: badgeText }]}>{label}</Text>
                </View>
              </View>

              {/* Number balls */}
              <View style={s.ballsRow}>
                {record.numbers.map((n) => {
                  const isMatch = record.matched >= 3 && record.winningNumbers.includes(n);
                  const thisBallBg   = isMatch ? '#3d2800'                  : ballBg;
                  const thisBallText = isMatch ? '#f4b400'                  : ballText;
                  return (
                    <View key={n} style={[s.ball, { backgroundColor: thisBallBg }, isMatch && s.ballHighlight]}>
                      <Text style={[s.ballText, { color: thisBallText, fontWeight: isMatch ? '900' : '700' }]}>{n}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={s.cardFooter}>
                <Text style={[s.footerText, { color: cardSubText }]}>
                  Stake: <Text style={{ color: cardText, fontFamily: Fonts.mono }}>{formatPHP(record.stake)}</Text>
                </Text>
                {won && (
                  <Text style={[s.footerText, { color: cardText, fontWeight: '800' }]}>
                    Payout: <Text style={{ fontFamily: Fonts.mono }}>{formatPHP(record.payout)}</Text>
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80,   right: -85,  opacity: 0.55 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.42 },
  scroll: { padding: 16, gap: 14 },

  hero: { borderRadius: 18, padding: 16 },
  heroTag:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono },
  heroTitle: { marginTop: 4, fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded },
  heroSub:   { marginTop: 4, fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },
  statsRow:  { marginTop: 12, flexDirection: 'row', gap: 8 },
  stat:      { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  statValue: { marginTop: 4, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },

  card:    { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  cardGame:{ fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  cardDate:{ fontSize: 12, fontWeight: '500', marginTop: 2, fontFamily: Fonts.sans },

  badge:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeLabel: { fontSize: 11, fontWeight: '800', fontFamily: Fonts.mono },

  ballsRow: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  ball:          { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ballHighlight: { borderWidth: 2, borderColor: '#3d2800' },
  ballText:      { fontSize: 12, fontWeight: '700', fontFamily: Fonts.mono },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans },
});
