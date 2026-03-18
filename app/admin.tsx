import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

export default function AdminScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session } = useSession();

  const [gameId, setGameId] = useState('');
  const [drawDateKey, setDrawDateKey] = useState('');
  const [numbers, setNumbers] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (session?.role !== 'admin') {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
        <View style={s.center}>
          <Ionicons name="lock-closed" size={48} color={p.textSoft} />
          <Text style={[s.errorText, { color: p.textSoft }]}>Admin access required</Text>
          <Pressable style={[s.button, { backgroundColor: p.accent }]} onPress={() => router.back()}>
            <Text style={[s.buttonText, { color: p.accentText }]}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    if (!gameId || !drawDateKey || !numbers) {
      setMessage('All fields are required.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await apiFetch('/admin/results', {
        method: 'POST',
        userId: session.userId,
        body: { gameId, drawDateKey, numbers },
      });
      setMessage('Official result saved successfully!');
      setGameId('');
      setDrawDateKey('');
      setNumbers('');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to save result.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.title, { color: p.textStrong }]}>Admin Panel</Text>
          <Text style={[s.subtitle, { color: p.textSoft }]}>Add Official Draw Results</Text>

          <Text style={[s.label, { color: p.textStrong }]}>Game ID</Text>
          <TextInput
            value={gameId}
            onChangeText={setGameId}
            placeholder="e.g., 6-42, 6-55"
            placeholderTextColor={p.textSoft}
            style={[s.input, { backgroundColor: p.stageBg, color: p.textStrong, borderColor: p.cardBorder }]}
          />

          <Text style={[s.label, { color: p.textStrong }]}>Draw Date (YYYY-MM-DD)</Text>
          <TextInput
            value={drawDateKey}
            onChangeText={setDrawDateKey}
            placeholder="e.g., 2026-03-19"
            placeholderTextColor={p.textSoft}
            style={[s.input, { backgroundColor: p.stageBg, color: p.textStrong, borderColor: p.cardBorder }]}
          />

          <Text style={[s.label, { color: p.textStrong }]}>Winning Numbers (comma-separated)</Text>
          <TextInput
            value={numbers}
            onChangeText={setNumbers}
            placeholder="e.g., 5,12,23,34,41,55"
            placeholderTextColor={p.textSoft}
            style={[s.input, { backgroundColor: p.stageBg, color: p.textStrong, borderColor: p.cardBorder }]}
          />

          {message ? <Text style={[s.message, { color: message.includes('success') ? p.payout : p.warning }]}>{message}</Text> : null}

          <Pressable
            style={[s.button, { backgroundColor: p.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={p.accentText} />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color={p.accentText} />
                <Text style={[s.buttonText, { color: p.accentText }]}>Save Official Result</Text>
              </>
            )}
          </Pressable>

          <Pressable style={[s.backButton, { backgroundColor: p.chipIdle }]} onPress={() => router.back()}>
            <Text style={[s.backButtonText, { color: p.chipIdleText }]}>Back to App</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  scroll: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18 },
  title: { fontSize: 24, fontWeight: '800', fontFamily: Fonts.rounded },
  subtitle: { fontSize: 14, fontWeight: '500', fontFamily: Fonts.sans, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', fontFamily: Fonts.mono, marginTop: 14 },
  input: { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.sans },
  message: { marginTop: 14, fontSize: 13, fontWeight: '600', fontFamily: Fonts.sans },
  button: { marginTop: 20, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.rounded },
  backButton: { marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  backButtonText: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: Fonts.sans, marginTop: 12 },
});
