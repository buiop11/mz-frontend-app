import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View as RNView,
} from 'react-native';

import { View } from '@/components/Themed';
import { updateCategory } from '@/src/api/category';
import { useAuth } from '@/src/auth/AuthProvider';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { useTokens } from '@/src/ui/tokens';

import { EMOJI_OPTIONS } from './emojiOptions';

export default function CategoryEditScreen() {
  const t = useTokens();
  const router = useRouter();
  const { user } = useAuth();
  const memberSeq = user?.memberSeq;
  const params = useLocalSearchParams<{
    categorySeq?: string;
    name?: string;
    emoji?: string;
  }>();

  const categorySeq = useMemo(() => {
    const n = Number.parseInt(String(params.categorySeq ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params.categorySeq]);

  const [name, setName] = useState(() => String(params.name ?? '').trim());
  const [emoji, setEmoji] = useState(() => String(params.emoji ?? '📌').trim() || '📌');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage('카테고리 이름을 입력해 주세요.');
      return;
    }
    if (memberSeq == null) {
      setMessage('로그인이 필요합니다. 다시 로그인해 주세요.');
      return;
    }
    if (categorySeq == null) {
      setMessage('수정할 카테고리를 찾을 수 없습니다.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await updateCategory({
        memberSeq,
        categorySeq,
        name: trimmed,
        emoji,
      });
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader
        title="카테고리 수정"
        leftIconName="chevron-left"
        onPressLeft={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={56}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: t.colors.text }]}>카테고리 이름</Text>
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

          <Text style={[styles.label, { color: t.colors.text, marginTop: 8 }]}>이모지</Text>
          <Pressable
            onPress={() => setEmojiOpen(true)}
            disabled={submitting}
            style={({ pressed }) => [
              styles.emojiPick,
              {
                borderColor: t.colors.border,
                backgroundColor: t.colors.surface,
                borderRadius: t.radius.lg,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={styles.emojiBig}>{emoji}</Text>
            <Text style={{ color: t.colors.text, fontSize: 13, fontWeight: '700' }}>이모지 선택</Text>
            <Text style={{ color: t.colors.subtext, fontSize: 12 }}>눌러서 변경</Text>
          </Pressable>

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
            disabled={submitting || categorySeq == null}
            style={[
              styles.submit,
              {
                backgroundColor: t.colors.text,
                borderRadius: t.radius.lg,
                opacity: submitting || categorySeq == null ? 0.5 : 1,
              },
            ]}>
            <Text style={{ color: t.colors.surface, fontSize: 15, fontWeight: '600' }}>
              {submitting ? '저장 중…' : '변경 사항 저장'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={emojiOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEmojiOpen(false)}>
        <RNView style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEmojiOpen(false)} />
          <RNView
            style={[
              styles.modalSheet,
              { backgroundColor: t.colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
            ]}>
            <RNView style={styles.modalHeader}>
              <Text style={{ color: t.colors.text, fontSize: 15, fontWeight: '800' }}>이모지 선택</Text>
              <Pressable onPress={() => setEmojiOpen(false)} hitSlop={10}>
                <Text style={{ color: t.colors.tint, fontSize: 13, fontWeight: '800' }}>닫기</Text>
              </Pressable>
            </RNView>

            <ScrollView contentContainerStyle={styles.emojiGrid} showsVerticalScrollIndicator={false}>
              {EMOJI_OPTIONS.map((e) => {
                const active = e === emoji;
                return (
                  <Pressable
                    key={e}
                    onPress={() => {
                      setEmoji(e);
                      setEmojiOpen(false);
                    }}
                    style={[
                      styles.emojiCell,
                      {
                        borderColor: active ? t.colors.tint : t.colors.border,
                        backgroundColor: active ? t.colors.muted : t.colors.background,
                      },
                    ]}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </RNView>
        </RNView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  label: { fontSize: 14, fontWeight: '600' },
  emojiPick: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiBig: { fontSize: 26, width: 34, textAlign: 'center' },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBackdrop: { flex: 1 },
  modalSheet: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22, maxHeight: '70%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  emojiCell: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
