import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { usePalette } from '@/hooks/use-palette';

type BetStatus = 'pending' | 'won' | 'lost';
type Filter = 'all' | BetStatus;

interface Bet {
  id: string;
  gameId: string;
  gameName: string;
  drawDateKey: string;
  placedAt: string;
  numbers: number[];
  stake: number;
  status: BetStatus;
  matches?: number | null;
  payout?: number | null;
  officialNumbers?: number[] | null;
}

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v);
}

const STATUS_META: Record<BetStatus, { label: string; iconName: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'PENDING', iconName: 'time-outline'         },
  won:     { label: 'WON',     iconName: 'trophy-outline'       },
  lost:    { label: 'LOST',    iconName: 'close-circle-outline' },
};

function BetCard({ bet, p }: { bet: Bet; p: ReturnType<typeof usePalette> }) {
  const meta   = STATUS_META[bet.status];
  const won    = bet.status === 'won';
  const winning = bet.officialNumbers ?? [];

  const cardBg   = won ? p.accent      : p.cardBg;
  const cardText = won ? '#3d2800'     : p.textStrong;
  const cardSub  = won ? 'rgba(61,40,0,0.65)' : p.textSoft;
  const ballBg   = won ? 'rgba(0,0,0,0.12)'   : p.stageBg;
  const ballTxt  = won ? '#3d2800'     : p.textStrong;
  const badgeBg  =
    bet.status === 'won'     ? 'rgba(0,0,0,0.12)' :
    bet.status === 'pending' ? p.secondaryButton   : p.chipIdle;
  const badgeTxt =
    bet.status === 'won'     ? '#3d2800'            :
    bet.status === 'pending' ? p.secondaryButtonText : p.chipIdleText;

  return (
    <View style={[s.card, { backgroundColor: cardBg, borderColor: won ? 'transparent' : p.cardBorder }]}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardGame, { color: cardText }]}>{bet.gameName}</Text>
          <Text style={[s.cardMeta, { color: cardSub  }]}>
            {bet.status === 'pending' ? `Draw: ${bet.drawDateKey} · 9:00 PM` : bet.drawDateKey}
          </Text>
        </View>
        <View style={[s.badge, { backgroundColor: badgeBg }]}>
          <Ionicons name={meta.iconName} size={12} color={badgeTxt} />
          <Text style={[s.badgeText, { color: badgeTxt }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={s.ballsRow}>
        {bet.numbers.map((n) => {
          const isMatch = won && winning.includes(n);
          return (
            <View key={n} style={[s.ball, { backgroundColor: isMatch ? '#3d2800' : ballBg }, isMatch && s.ballHighlight]}>
              <Text style={[s.ballText, { color: isMatch ? '#f4b400' : ballTxt, fontWeight: isMatch ? '900' : '700' }]}>{n}</Text>
            </View>
          );
        })}
      </View>

      <View style={s.cardFoot}>
        <Text style={[s.footText, { color: cardSub }]}>
          Stake <Text style={[s.footVal, { color: cardText }]}>{formatPHP(bet.stake)}</Text>
        </Text>
        {won && (
          <Text style={[s.footText, { color: cardText, fontWeight: '800' }]}>
            Payout <Text style={[s.footVal]}>{formatPHP(bet.payout ?? 0)}</Text>
          </Text>
        )}
        {bet.status !== 'pending' && (
          <Text style={[s.footText, { color: cardSub }]}>
            Matches <Text style={[s.footVal, { color: cardText }]}>{bet.matches ?? 0}/6</Text>
          </Text>
        )}
      </View>

      <Text style={[s.placedAt, { color: cardSub }]}>Placed {bet.placedAt}</Text>
    </View>
  );
}
