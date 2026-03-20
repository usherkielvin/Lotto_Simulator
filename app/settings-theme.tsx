import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { ThemeMode, getThemeMode, initThemeMode, setThemeMode, subscribeThemeMode } from '@/hooks/theme-mode-store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';

const MODES: { value: ThemeMode; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Use device setting', hint: 'Follows your phone or browser preference.', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light mode', hint: 'Bright surfaces and high daytime contrast.', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark mode', hint: 'Dark surfaces for low-light sessions.', icon: 'moon-outline' },
];

export default function ThemeSettingsScreen() {
  const p = usePalette();
  const router = useRouter();
  const activeScheme = useColorScheme();

  const [mode, setMode] = useState<ThemeMode>(getThemeMode());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    initThemeMode()
      .catch(() => {})
      .finally(() => setMode(getThemeMode()));

    return subscribeThemeMode(() => setMode(getThemeMode()));
  }, []);

  const applyMode = async (nextMode: ThemeMode) => {
    if (nextMode === mode || busy) return;
    setMode(nextMode); // update UI immediately
    setBusy(true);
    try {
      await setThemeMode(nextMode);
    } finally {
      setBusy(false);
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
        <Text style={[s.headerTitle, { color: p.textStrong }]}>App Theme</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.currentCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.currentLabel, { color: p.textSoft }]}>Current appearance</Text>
          <Text style={[s.currentValue, { color: p.textStrong }]}>{activeScheme === 'dark' ? 'Dark' : 'Light'}</Text>
        </View>

        <View style={[s.optionsCard, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}> 
          {MODES.map((item, idx) => {
            const selected = item.value === mode;
            return (
              <View key={item.value}>
                <Pressable
                  style={s.optionRow}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    if (!busy && !selected) {
                      setMode(item.value);
                      applyMode(item.value);
                    }
                  }}
                  onFocus={() => {
                    if (!busy && !selected) {
                      setMode(item.value);
                      applyMode(item.value);
                    }
                  }}
                  disabled={busy}
                >
                  <View style={[s.iconWrap, { backgroundColor: selected ? p.chipActive : p.chipIdle }]}> 
                    <Ionicons name={item.icon} size={16} color={selected ? p.chipActiveText : p.chipIdleText} />
                  </View>

                  <View style={s.optionCopy}>
                    <Text style={[s.optionLabel, { color: p.textStrong }]}>{item.label}</Text>
                    <Text style={[s.optionHint, { color: p.textSoft }]}>{item.hint}</Text>
                  </View>

                  {selected ? <Ionicons name="checkmark-circle" size={20} color={p.accent} /> : <Ionicons name="ellipse-outline" size={20} color={p.textSoft} />}
                </Pressable>
                {idx < MODES.length - 1 && <View style={[s.divider, { backgroundColor: p.cardBorder }]} />}
              </View>
            );
          })}
        </View>
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
  currentCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  currentLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.mono },
  currentValue: { marginTop: 6, fontSize: 26, fontWeight: '800', fontFamily: Fonts.rounded },
  optionsCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1 },
  optionLabel: { fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  optionHint: { marginTop: 2, fontSize: 12, fontFamily: Fonts.sans },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 42 },
});
