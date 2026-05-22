import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { apiFetch } from '@/src/api/fetch';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { useTokens } from '@/src/ui/tokens';

export default function CategoryNewScreen() {
  const t = useTokens();
  const router = useRouter();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage('카테고리 이름을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/category', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (res.ok && (json?.code === 'SUC001' || res.status === 200)) {
        router.replace({ pathname: '/create', params: { categoryAdded: '1' } });
        return;
      }
      if (res.status === 503) {
        router.replace({ pathname: '/create', params: { categoryName: trimmed } });
        return;
      }
      setMessage(
        typeof json?.message === 'string' && json.message.trim()
          ? json.message.trim()
          : `저장에 실패했습니다. (${res.status})`,
      );
    } catch (err: any) {
      setMessage(String(err?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader
        title="카테고리 추가"
        leftIconName="chevron-left"
        onPressLeft={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={56}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: t.colors.text }]}>새 카테고리 이름</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                borderColor: t.colors.border,
                backgroundColor: t.colors.surface,
                color: t.colors.text,
                borderRadius: t.radius.lg,
              },
            ]}
            placeholder="예) 웨딩, 구매, 데이트"
            placeholderTextColor={t.colors.subtext}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <Text style={[styles.help, { color: t.colors.subtext }]}>
            안건을 묶을 분야를 만들면 목록에서 필터링하기 쉬워요.
          </Text>

          {message ? (
            <View
              style={[
                styles.banner,
                {
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.muted,
                  borderRadius: t.radius.lg,
                },
              ]}>
              <Text style={{ color: t.colors.text, fontSize: 12 }}>{message}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: t.colors.border, backgroundColor: t.colors.background }]}>
          <Pressable
            onPress={handleSave}
            disabled={submitting}
            style={[
              styles.submit,
              {
                backgroundColor: t.colors.text,
                borderRadius: t.radius.lg,
                opacity: submitting ? 0.5 : 1,
              },
            ]}>
            <Text style={{ color: t.colors.surface, fontSize: 15, fontWeight: '600' }}>
              {submitting ? '저장 중…' : '카테고리 저장'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  help: { fontSize: 12, lineHeight: 18 },
  banner: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  submit: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
