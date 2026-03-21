import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/hooks/use-api';
import { usePalette } from '@/hooks/use-palette';
import { useSession } from '@/hooks/use-session';

const MAX_DISPLAY_NAME = 32;

export default function EditProfileScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session, signIn } = useSession();
  const userId = session?.userId;

  const [displayName, setDisplayName] = useState(session?.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const isDirty = displayName.trim() !== (session?.displayName ?? '').trim();

  const handleSave = async () => {
    const trimmed = displayName.trim();

    if (!trimmed) { setError('Display name cannot be empty.'); return; }
    if (trimmed.length > MAX_DISPLAY_NAME) { setError(`Max ${MAX_DISPLAY_NAME} characters.`); return; }
    if (!isDirty) { router.back(); return; }

    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ displayName: string }>('/profile', {
        method: 'PUT',
        userId,
        body: { displayName: trimmed },
      });
      // Update session so the rest of the app reflects the new name immediately
      if (session) {
        await signIn({ ...session, displayName: res.displayName });
      }
      setSaved(true);
      setTimeout(() => router.back(), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      Alert.alert('Discard changes?', 'You have unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          disabled={busy || !isDirty}
          style={[s.saveBtn, { opacity: busy || !isDirty ? 0.4 : 1 }]}
        >
          {busy
            ? <ActivityIndicator size="small" color={p.accent} />
            : <Text style={[s.saveBtnText, { color: p.accent }]}>Save</Text>
          }
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Avatar preview */}
        <View style={[s.avatarWrap, { backgroundColor: p.heroBg }]}>
          <View style={[s.avatar, { backgroundColor: p.accent }]}>
            <Text style={[s.avatarInitial, { color: p.accentText }]}>
              {(displayName.trim() || session?.displayName || 'A')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={[s.avatarUsername, { color: p.textSoft }]}>@{session?.username}</Text>
        </View>

        {/* Form */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.fieldLabel, { color: p.textSoft }]}>Display Name</Text>
          <View style={[s.inputRow, { borderColor: error ? '#dc2626' : p.cardBorder, backgroundColor: p.stageBg }]}>
            <Ionicons name="person-outline" size={18} color={p.textSoft} style={{ marginRight: 8 }} />
            <TextInput
              ref={inputRef}
              style={[s.input, { color: p.textStrong }]}
              value={displayName}
              onChangeText={(v) => { setDisplayName(v); setError(''); setSaved(false); }}
              placeholder="Your display name"
              placeholderTextColor={p.textSoft}
              maxLength={MAX_DISPLAY_NAME}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {displayName.length > 0 && (
              <Pressable onPress={() => { setDisplayName(''); setError(''); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={p.textSoft} />
              </Pressable>
            )}
          </View>
          <Text style={[s.charCount, { color: displayName.length > MAX_DISPLAY_NAME - 5 ? '#dc2626' : p.textSoft }]}>
            {displayName.length}/{MAX_DISPLAY_NAME}
          </Text>

          {!!error && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {saved && (
            <View style={s.successRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
              <Text style={s.successText}>Profile updated</Text>
            </View>
          )}
        </View>

        {/* Username (read-only info) */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <Text style={[s.fieldLabel, { color: p.textSoft }]}>Username</Text>
          <View style={[s.inputRow, { borderColor: p.cardBorder, backgroundColor: p.stageBg, opacity: 0.7 }]}>
            <Ionicons name="at-outline" size={18} color={p.textSoft} style={{ marginRight: 8 }} />
            <Text style={[s.input, { color: p.textSoft, paddingVertical: 12 }]}>{session?.username}</Text>
          </View>
          <Text style={[s.hint, { color: p.textSoft }]}>Username cannot be changed.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  orbTop:    { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80,  right: -85,   opacity: 0.45 },
  orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.35 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: Fonts.rounded },
  saveBtn:   { paddingHorizontal: 12, paddingVertical: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  scroll:    { padding: 20, gap: 14 },
  avatarWrap:{ borderRadius: 18, padding: 24, alignItems: 'center', gap: 10 },
  avatar:    { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 30, fontWeight: '800', fontFamily: Fonts.rounded },
  avatarUsername:{ fontSize: 13, fontWeight: '600', fontFamily: Fonts.mono },
  card:      { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  fieldLabel:{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: Fonts.mono },
  inputRow:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12 },
  input:     { flex: 1, fontSize: 16, fontWeight: '600', fontFamily: Fonts.sans, paddingVertical: 12 },
  charCount: { fontSize: 11, fontFamily: Fonts.mono, textAlign: 'right' },
  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontSize: 13, fontFamily: Fonts.sans, color: '#dc2626' },
  successRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  successText:{ fontSize: 13, fontFamily: Fonts.sans, color: '#059669' },
  hint:      { fontSize: 12, fontFamily: Fonts.sans },
});
