import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

type Faq = {
  id: string;
  question: string;
  answer: string;
};

const FAQS: Faq[] = [
  {
    id: 'funding',
    question: 'How do I add demo credits?',
    answer: 'Open Profile, then use Deposit in the demo balance section. It updates your wallet immediately after confirmation.',
  },
  {
    id: 'notifications',
    question: 'Where can I control draw alerts?',
    answer: 'Go to Profile > Settings > Draw notifications and toggle reminders, jackpot alerts, and wallet updates.',
  },
  {
    id: 'privacy',
    question: 'How do I reset local settings?',
    answer: 'Open Privacy and data, then tap Reset Local Settings. This restores local toggles and resets app theme mode to system.',
  },
];

export default function HelpSettingsScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session } = useSession();

  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQS[0]?.id ?? null);
  const [feedback, setFeedback] = useState('');

  const supportEmailLink = useMemo(() => {
    const subject = encodeURIComponent('Lotto Simulator Support');
    const body = encodeURIComponent(
      `Hi Ashcol Support,\n\nI need help with Lotto Simulator.\n\nUsername: ${session?.username ?? 'guest'}\nDisplay Name: ${session?.displayName ?? 'N/A'}\n`,
    );
    return `mailto:support@ashcol.app?subject=${subject}&body=${body}`;
  }, [session?.displayName, session?.username]);

  const contactSupport = async () => {
    setFeedback('');
    try {
      const canOpen = await Linking.canOpenURL(supportEmailLink);
      if (!canOpen) {
        setFeedback('No email app is available on this device.');
        return;
      }

      await Linking.openURL(supportEmailLink);
      setFeedback('Opening your email app.');
    } catch {
      setFeedback('Could not open support email right now.');
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>Help and Support</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable style={[s.contactBtn, { backgroundColor: p.accent }]} onPress={contactSupport}>
          <Ionicons name="mail-open-outline" size={16} color={p.accentText} />
          <Text style={[s.contactText, { color: p.accentText }]}>Contact Support</Text>
        </Pressable>

        <View style={[s.faqCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          {FAQS.map((item, idx) => {
            const isOpen = openFaqId === item.id;
            return (
              <View key={item.id}>
                <Pressable
                  style={s.faqHeader}
                  onPress={() => setOpenFaqId((curr) => (curr === item.id ? null : item.id))}
                >
                  <Text style={[s.faqQuestion, { color: p.textStrong }]}>{item.question}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={p.textSoft} />
                </Pressable>

                {isOpen && <Text style={[s.faqAnswer, { color: p.textSoft }]}>{item.answer}</Text>}
                {idx < FAQS.length - 1 && <View style={[s.divider, { backgroundColor: p.cardBorder }]} />}
              </View>
            );
          })}
        </View>

        {!!feedback && <Text style={[s.feedback, { color: p.textSoft }]}>{feedback}</Text>}
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
  scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  contactBtn: { borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  contactText: { fontSize: 13, fontWeight: '800', fontFamily: Fonts.sans },
  faqCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 12 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  faqAnswer: { marginTop: -2, marginBottom: 12, fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans },
  divider: { height: StyleSheet.hairlineWidth },
  feedback: { textAlign: 'center', fontSize: 12, fontFamily: Fonts.sans },
});
