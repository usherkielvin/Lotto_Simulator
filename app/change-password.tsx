import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
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

export default function ChangePasswordScreen() {
  const p = usePalette();
  const router = useRouter();
  const { session } = useSession();

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showCon,  setShowCon]  = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const nextRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = () => {
    if (!current)           return 'Enter your current password.';
    if (next.length < 6)    return 'New password must be at least 6 characters.';
    if (next !== confirm)   return 'Passwords do not match.';
    if (next === current)   return 'New password must be different from current.';
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setBusy(true);
    setError('');
    try {
      await apiFetch('/profile/password', {
        method: 'PUT',
        userId: session?.userId,
        body: { currentPassword: current, newPassword: next },
      });
      setSuccess(true);
      setTimeout(() => router.back(), 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  const strength = next.length === 0 ? null
    : next.length < 6  ? 'weak'
    : next.length < 10 ? 'fair'
    : /[^a-zA-Z0-9]/.test(next) ? 'strong'
    : 'good';

  const strengthColor = { weak: '#dc2626', fair: '#f59e0b', good: '#3b82f6', strong: '#059669' }[strength ?? 'weak'];
  const strengthLabel = { weak: 'Too short', fair: 'Fair', good: 'Good', strong: 'Strong' }[strength ?? 'weak'];

  return (
    <SafeAreaView style={[s.root, { backgroundColor: p.screenBg }]}>
      <View style={[s.orbTop, { backgroundColor: p.orbOne }]} />
      <View style={[s.orbBottom, { backgroundColor: p.orbTwo }]} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={p.textStrong} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textStrong }]}>Change Password</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Icon banner */}
        <View style={[s.banner, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>
          <View style={[s.bannerIcon, { backgroundColor: p.chipIdle }]}>
            <Ionicons name="lock-closed-outline" size={22} color={p.chipIdleText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: p.textStrong }]}>Update your password</Text>
            <Text style={[s.bannerSub, { color: p.textSoft }]}>Use a strong password you don't use elsewhere.</Text>
          </View>
        </View>

        {/* Fields card */}
        <View style={[s.card, { backgroundColor: p.cardBg, borderColor: p.cardBorder }]}>

          {/* Current password */}
          <View style={s.fieldBlock}>
            <Text style={[s.fieldLabel, { color: p.textSoft }]}>Current Password</Text>
            <View style={[s.inputRow, { borderColor: p.cardBorder, backgroundColor: p.stageBg }]}>
              <Ionicons name="lock-closed-outline" size={16} color={p.textSoft} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: p.textStrong }]}
                value={current}
                onChangeText={(v) => { setCurrent(v); setError(''); setSuccess(false); }}
                placeholder="Current password"
                placeholderTextColor={p.textSoft}
                secureTextEntry={!showCur}
                returnKeyType="next"
                onSubmitEditing={() => nextRef.current?.focus()}
              />
              <Pressable onPress={() => setShowCur(v => !v)} hitSlop={8}>
                <Ionicons name={showCur ? 'eye-off-outline' : 'eye-outline'} size={18} color={p.textSoft} />
              </Pressable>
            </View>
          </View>

          <View style={[s.divider, { backgroundColor: p.cardBorder }]} />

          {/* New password */}
          <View style={s.fieldBlock}>
            <Text style={[s.fieldLabel, { color: p.textSoft }]}>New Password</Text>
            <View style={[s.inputRow, { borderColor: p.cardBorder, backgroundColor: p.stageBg }]}>
              <Ionicons name="key-outline" size={16} color={p.textSoft} style={s.inputIcon} />
              <TextInput
                ref={nextRef}
                style={[s.input, { color: p.textStrong }]}
                value={next}
                onChangeText={(v) => { setNext(v); setError(''); setSuccess(false); }}
                placeholder="New password"
                placeholderTextColor={p.textSoft}
                secureTextEntry={!showNew}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <Pressable onPress={() => setShowNew(v => !v)} hitSlop={8}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={p.textSoft} />
              </Pressable>
            </View>
            {/* Strength bar */}
            {strength && (
              <View style={s.strengthRow}>
                <View style={s.strengthTrack}>
                  {(['weak','fair','good','strong'] as const).map((lvl, i) => (
                    <View
                      key={lvl}
                      style={[s.strengthSeg, {
                        backgroundColor: ['weak','fair','good','strong'].indexOf(strength) >= i
                          ? strengthColor : p.chipIdle,
                      }]}
                    />
                  ))}
                </View>
                <Text style={[s.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
              </View>
            )}
          </View>

          <View style={[s.divider, { backgroundColor: p.cardBorder }]} />

          {/* Confirm password */}
          <View style={s.fieldBlock}>
            <Text style={[s.fieldLabel, { color: p.textSoft }]}>Confirm New Password</Text>
            <View style={[s.inputRow, {
              borderColor: confirm && confirm !== next ? '#dc2626' : p.cardBorder,
              backgroundColor: p.stageBg,
            }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={p.textSoft} style={s.inputIcon} />
              <TextInput
                ref={confirmRef}
                style={[s.input, { color: p.textStrong }]}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setError(''); setSuccess(false); }}
                placeholder="Repeat new password"
                placeholderTextColor={p.textSoft}
                secureTextEntry={!showCon}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Pressable onPress={() => setShowCon(v => !v)} hitSlop={8}>
                <Ionicons name={showCon ? 'eye-off-outline' : 'eye-outline'} size={18} color={p.textSoft} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Feedback */}
        {!!error && (
          <View style={s.feedbackRow}>
            <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
            <Text style={[s.feedbackText, { color: '#dc2626' }]}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={s.feedbackRow}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
            <Text style={[s.feedbackText, { color: '#059669' }]}>Password updated successfully.</Text>
          </View>
        )}

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={busy || !current || !next || !confirm}
          style={[s.saveBtn, {
            backgroundColor: p.secondaryButton,
            opacity: busy || !current || !next || !confirm ? 0.45 : 1,
          }]}
        >
          {busy
            ? <ActivityIndicator color="#ffffff" />
            : <>
                <Ionicons name="lock-closed" size={16} color={p.secondaryButtonText} />
                <Text style={[s.saveBtnText, { color: p.secondaryButtonText }]}>Update Password</Text>
              </>
          }
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  orbTop:     { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -85, opacity: 0.45 },
  orbBottom:  { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.35 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 17, fontWeight: '800', fontFamily: Fonts.rounded },
  scroll:     { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  banner:     { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bannerTitle:{ fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  bannerSub:  { fontSize: 12, fontFamily: Fonts.sans, marginTop: 2 },

  card:       { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  fieldBlock: { paddingVertical: 12, gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: Fonts.mono },
  inputRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 2 },
  inputIcon:  { marginRight: 8 },
  input:      { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: Fonts.sans, paddingVertical: 10 },
  divider:    { height: 1, marginLeft: 0 },

  strengthRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strengthTrack:{ flex: 1, flexDirection: 'row', gap: 4 },
  strengthSeg:  { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:{ fontSize: 11, fontWeight: '700', fontFamily: Fonts.mono, width: 52, textAlign: 'right' },

  feedbackRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  feedbackText:{ fontSize: 13, fontFamily: Fonts.sans, flex: 1 },

  saveBtn:    { borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText:{ fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
});
