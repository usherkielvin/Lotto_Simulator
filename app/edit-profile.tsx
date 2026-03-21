import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
const MAX_USERNAME = 24;

export default function EditProfileScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session, signIn } = useSession();
  const userId = session?.userId;

  const [displayName, setDisplayName] = useState(session?.displayName ?? '');
  const [username,    setUsername]    = useState(session?.username ?? '');
  const [avatarUri,   setAvatarUri]   = useState<string | null>(session?.avatarUrl ?? null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const displayRef  = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => displayRef.current?.focus(), 300);
  }, []);

  const isDirty =
    avatarDirty ||
    displayName.trim() !== (session?.displayName ?? '').trim() ||
    username.trim().toLowerCase() !== (session?.username ?? '').toLowerCase();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = asset.base64;
      const mimeType = asset.mimeType ?? 'image/jpeg';
      if (base64) {
        setAvatarUri(`data:${mimeType};base64,${base64}`);
        setAvatarDirty(true);
        setError('');
        setSaved(false);
      }
    }
  };

  const removeAvatar = () => {
    Alert.alert('Remove photo?', 'Your profile picture will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { setAvatarUri(null); setAvatarDirty(true); setSaved(false); } },
    ]);
  };

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    const trimmedUser = username.trim().toLowerCase();

    if (!trimmedName) { setError('Display name cannot be empty.'); return; }
    if (trimmedName.length > MAX_DISPLAY_NAME) { setError(`Display name max ${MAX_DISPLAY_NAME} characters.`); return; }
    if (!trimmedUser) { setError('Username cannot be empty.'); return; }
    if (trimmedUser.length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (trimmedUser.length > MAX_USERNAME) { setError(`Username max ${MAX_USERNAME} characters.`); return; }
    if (!/^[a-z0-9._-]+$/.test(trimmedUser)) { setError('Username: letters, numbers, dots, hyphens, underscores only.'); return; }
    if (!isDirty) { router.back(); return; }

    setBusy(true);
    setError('');
    try {
      const body: Record<string, string> = {
        displayName: trimmedName,
        username: trimmedUser,
      };
      if (avatarDirty) {
        body.avatarUrl = avatarUri ?? '';
      }

      const res = await apiFetch<{ displayName: string; username: string; avatarUrl?: string | null }>('/profile', {
        method: 'PUT',
        userId,
        body,
      });
      if (session) {
        await signIn({ ...session, displayName: res.displayName, username: res.username, avatarUrl: res.avatarUrl ?? null });
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

  const initial = (displayName.trim() || session?.displayName || 'A')[0].toUpperCase();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

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
            ? <ActivityIndicator size="small" color={p.secondaryButton} />
            : <Text style={[s.saveBtnText, { color: p.secondaryButton }]}>Save</Text>
          }
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Avatar picker */}
        <View style={[s.avatarWrap, { backgroundColor: p.heroBg }]}>
          <Pressable onPress={pickImage} style={s.avatarPressable}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImg} />
            ) : (
              <View style={[s.avatarFallback, { backgroundColor: p.accent }]}>
                <Text style={[s.avatarInitial, { color: p.accentText }]}>{initial}</Text>
              </View>
            )}
            {/* Camera badge */}
            <View style={[s.cameraBadge, { backgroundColor: p.secondaryButton }]}>
              <Ionicons name="camera" size={14} color="#ffffff" />
            </View>
          </Pressable>

          <Text style={[s.avatarHint, { color: 'rgba(255,255,255,0.60)' }]}>Tap to change photo</Text>

          {avatarUri && (
            <Pressable onPress={removeAvatar} style={s.removeBtn}>
              <Ionicons name="trash-outline" size={13} color="rgba(255,255,255,0.55)" />
              <Text style={[s.removeBtnText, { color: 'rgba(255,255,255,0.55)' }]}>Remove</Text>
            </Pressable>
          )}

          <Text style={[s.avatarHandle, { color: 'rgba(255,255,255,0.65)' }]}>
            @{username.trim() || session?.username}
          </Text>
        </View>

        {/* Fields */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>

          <View style={s.fieldBlock}>
            <Text style={[s.fieldLabel, { color: p.textSoft }]}>Display Name</Text>
            <View style={[s.inputRow, { borderColor: p.cardBorder, backgroundColor: p.stageBg }]}>
              <Ionicons name="person-outline" size={16} color={p.textSoft} style={s.inputIcon} />
              <TextInput
                ref={displayRef}
                style={[s.input, { color: p.textStrong }]}
                value={displayName}
                onChangeText={(v) => { setDisplayName(v); setError(''); setSaved(false); }}
                placeholder="Your display name"
                placeholderTextColor={p.textSoft}
                maxLength={MAX_DISPLAY_NAME}
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
              />
              {displayName.length > 0 && (
                <Pressable onPress={() => { setDisplayName(''); setError(''); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={p.textSoft} />
                </Pressable>
              )}
            </View>
            <Text style={[s.charCount, { color: displayName.length > MAX_DISPLAY_NAME - 5 ? '#dc2626' : p.textSoft }]}>
              {displayName.length}/{MAX_DISPLAY_NAME}
            </Text>
          </View>

          <View style={[s.divider, { backgroundColor: p.cardBorder }]} />

          <View style={s.fieldBlock}>
            <Text style={[s.fieldLabel, { color: p.textSoft }]}>Username</Text>
            <View style={[s.inputRow, { borderColor: p.cardBorder, backgroundColor: p.stageBg }]}>
              <Ionicons name="at-outline" size={16} color={p.textSoft} style={s.inputIcon} />
              <TextInput
                ref={usernameRef}
                style={[s.input, { color: p.textStrong }]}
                value={username}
                onChangeText={(v) => { setUsername(v.toLowerCase().replace(/[^a-z0-9._-]/g, '')); setError(''); setSaved(false); }}
                placeholder="username"
                placeholderTextColor={p.textSoft}
                maxLength={MAX_USERNAME}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              {username.length > 0 && (
                <Pressable onPress={() => { setUsername(''); setError(''); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={p.textSoft} />
                </Pressable>
              )}
            </View>
            <Text style={[s.hint, { color: p.textSoft }]}>Letters, numbers, dots, hyphens and underscores only.</Text>
          </View>
        </View>

        {!!error && (
          <View style={s.feedbackRow}>
            <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
            <Text style={[s.feedbackText, { color: '#dc2626' }]}>{error}</Text>
          </View>
        )}
        {saved && (
          <View style={s.feedbackRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
            <Text style={[s.feedbackText, { color: '#059669' }]}>Profile updated.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  orbTop:      { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -85, opacity: 0.45 },
  orbBottom:   { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.35 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: Fonts.rounded },
  saveBtn:     { paddingHorizontal: 12, paddingVertical: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  scroll:      { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },

  avatarWrap:     { borderRadius: 18, padding: 24, alignItems: 'center', gap: 8 },
  avatarPressable:{ position: 'relative' },
  avatarImg:      { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:  { fontSize: 32, fontWeight: '800', fontFamily: Fonts.rounded },
  cameraBadge:    { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarHint:     { fontSize: 12, fontFamily: Fonts.sans },
  removeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeBtnText:  { fontSize: 12, fontFamily: Fonts.sans },
  avatarHandle:   { fontSize: 13, fontWeight: '600', fontFamily: Fonts.mono, marginTop: 4 },

  card:        { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  fieldBlock:  { paddingVertical: 12, gap: 8 },
  fieldLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: Fonts.mono },
  inputRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  inputIcon:   { marginRight: 8 },
  input:       { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: Fonts.sans, paddingVertical: 11 },
  charCount:   { fontSize: 11, fontFamily: Fonts.mono, textAlign: 'right' },
  divider:     { height: 1 },
  hint:        { fontSize: 12, fontFamily: Fonts.sans },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  feedbackText:{ fontSize: 13, fontFamily: Fonts.sans, flex: 1 },
});
