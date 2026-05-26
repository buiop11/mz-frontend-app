import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import {
  FALLBACK_CATEGORIES,
  parseCategoryApiResponse,
  type Category,
} from '@/src/api/category';
import { apiFetch } from '@/src/api/fetch';
import { FALLBACK_TOPICS, pickTopicSummaryForSeq } from '@/src/api/topic';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { useTokens } from '@/src/ui/tokens';

type InviteMode = 'invite' | 'solo';

function extractTopicSeqFromCreateResponse(json: any): number | null {
  const d = json?.data;
  if (d == null) return null;
  if (typeof d === 'number' && Number.isFinite(d) && d > 0) return d;
  if (typeof d === 'object') {
    const v = d.topicSeq ?? d.topicId ?? d.id ?? d.seq;
    const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export default function CreateScreen() {
  const t = useTokens();
  const router = useRouter();
  const params = useLocalSearchParams<{
    topicSeq?: string;
    categoryAdded?: string;
    categoryName?: string;
  }>();

  const topicSeqParam = typeof params.topicSeq === 'string' ? params.topicSeq : null;
  const categoryAdded = typeof params.categoryAdded === 'string' ? params.categoryAdded : null;
  const categoryNameHint = typeof params.categoryName === 'string' ? params.categoryName : null;

  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [categorySeq, setCategorySeq] = useState<string>(
    String(FALLBACK_CATEGORIES[0]?.categorySeq ?? ''),
  );
  const [inviteMode, setInviteMode] = useState<InviteMode>('invite');
  const [inviteContact, setInviteContact] = useState('');
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (categoryAdded === '1') {
      setBanner('카테고리가 추가되었습니다. 목록에서 선택해 주세요.');
    }
  }, [categoryAdded]);

  useEffect(() => {
    if (categoryNameHint && categoryNameHint.trim()) {
      setBanner(`방금 입력한 분야: ${categoryNameHint.trim()}`);
    }
  }, [categoryNameHint]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCats(true);
      try {
        const res = await apiFetch('/api/category?currentPage=1', {
          headers: { Accept: 'application/json' },
        });
        const json = await res.json();
        const parsed = parseCategoryApiResponse(json);
        if (cancelled) return;
        setCategories(parsed.list);
        if (parsed.list.length > 0) {
          setCategorySeq(String(parsed.list[0].categorySeq));
        }
      } catch {
        if (!cancelled) setCategories(FALLBACK_CATEGORIES);
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!topicSeqParam || !topicSeqParam.trim()) return;
    const raw = topicSeqParam.trim();
    const seq = Number.parseInt(raw, 10);
    if (Number.isFinite(seq) && seq > 0 && String(seq) === raw) {
      let cancelled = false;
      (async () => {
        try {
          const qs = `topicSeq=${encodeURIComponent(seq)}&currentPage=1`;
          const res = await apiFetch(`/api/topic?${qs}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          const json = await res.json();
          if (cancelled) return;
          const sum = pickTopicSummaryForSeq(json, seq);
          if (sum?.title) setTitle(sum.title);
        } catch {
          /* noop */
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const match = FALLBACK_TOPICS.find((tp) => String(tp.topicSeq) === raw);
    if (match?.title) setTitle(match.title);
    return undefined;
  }, [topicSeqParam]);

  const categoryLabel = useMemo(() => {
    const n = Number.parseInt(categorySeq, 10);
    const row = categories.find((c) => c.categorySeq === n);
    return row?.name ?? '';
  }, [categories, categorySeq]);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setBanner('안건 제목을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setBanner(null);
    try {
      const catNum = Number.parseInt(categorySeq, 10);
      const payload = {
        title: trimmed,
        categorySeq: Number.isFinite(catNum) ? catNum : undefined,
        newCategoryName: categoryNameHint && categoryNameHint.trim() ? categoryNameHint.trim() : undefined,
        inviteMode,
        inviteContact: inviteMode === 'invite' ? inviteContact.trim() : '',
      };
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(payload)) {
        if (value != null && value !== '') qs.set(key, String(value));
      }

      const res = await apiFetch(`/api/topic?${qs.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const json = await res.json().catch(() => ({} as any));
      const seq = extractTopicSeqFromCreateResponse(json);

      if (res.ok && seq != null) {
        // 후보 등록 화면(/vote/[id]/candidates)은 추후 추가 예정.
        Alert.alert('안건 등록 완료', `'${trimmed}' 안건이 등록되었습니다.`, [
          { text: '확인', onPress: () => router.replace('/list') },
        ]);
        return;
      }

      Alert.alert(
        '등록 실패',
        typeof json?.message === 'string' && json.message.trim()
          ? json.message.trim()
          : `서버 응답 오류 (${res.status})`,
      );
    } catch (err: any) {
      Alert.alert('등록 실패', String(err?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader title="안건 생성" leftIconName="chevron-left" onPressLeft={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={56}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {banner ? (
            <View
              style={[
                styles.banner,
                {
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.muted,
                  borderRadius: t.radius.lg,
                },
              ]}>
              <Text style={{ color: t.colors.text, fontSize: 12 }}>{banner}</Text>
            </View>
          ) : null}

          <View style={styles.field} lightColor="transparent" darkColor="transparent">
            <Text style={[styles.label, { color: t.colors.text }]}>안건 제목</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[
                styles.input,
                {
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.surface,
                  color: t.colors.text,
                  borderRadius: t.radius.lg,
                },
              ]}
              placeholder="예) 유모차 구매"
              placeholderTextColor={t.colors.subtext}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field} lightColor="transparent" darkColor="transparent">
            <View style={styles.fieldHeader} lightColor="transparent" darkColor="transparent">
              <Text style={[styles.label, { color: t.colors.text }]}>카테고리</Text>
              <Pressable
                onPress={() => router.push('/category/new')}
                style={({ pressed }) => [
                  styles.addChip,
                  {
                    borderColor: t.colors.border,
                    backgroundColor: t.colors.surface,
                    borderRadius: t.radius.pill,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Feather name="folder-plus" size={14} color={t.colors.text} />
                <Text style={{ color: t.colors.text, fontSize: 12, fontWeight: '600' }}>추가</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}>
              {categories.map((c) => {
                const active = String(c.categorySeq) === categorySeq;
                return (
                  <Pressable
                    key={c.categorySeq}
                    onPress={() => setCategorySeq(String(c.categorySeq))}
                    disabled={loadingCats}
                    style={[
                      styles.catPill,
                      {
                        borderRadius: t.radius.pill,
                        backgroundColor: active ? t.colors.tint : t.colors.muted,
                        borderColor: active ? t.colors.tint : t.colors.border,
                        opacity: loadingCats ? 0.6 : 1,
                      },
                    ]}>
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : t.colors.text,
                        fontSize: 13,
                        fontWeight: '600',
                      }}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.field} lightColor="transparent" darkColor="transparent">
            <Text style={[styles.label, { color: t.colors.text }]}>진행 방식</Text>
            <View style={styles.modeRow} lightColor="transparent" darkColor="transparent">
              <ModePill
                active={inviteMode === 'invite'}
                onPress={() => setInviteMode('invite')}
                icon="user-plus"
                label="초대"
              />
              <ModePill
                active={inviteMode === 'solo'}
                onPress={() => setInviteMode('solo')}
                icon="user"
                label="혼자 모드"
              />
            </View>
            <Text style={[styles.help, { color: t.colors.subtext }]}>
              초대하면 참여자와 함께 후보·투표를 진행해요. 혼자 모드는 안건 등록 후 후보 등록 화면에서 링크를
              추가할 수 있어요.
            </Text>
          </View>

          <View
            style={[
              styles.contactBox,
              {
                borderColor: t.colors.border,
                backgroundColor: t.colors.surface,
                borderRadius: t.radius.xl,
              },
            ]}
            lightColor="transparent"
            darkColor="transparent">
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.colors.text }}>
              초대 링크 / 연락처 (선택)
            </Text>
            <TextInput
              value={inviteContact}
              onChangeText={setInviteContact}
              editable={inviteMode === 'invite'}
              style={[
                styles.input,
                {
                  marginTop: 8,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.background,
                  color: t.colors.text,
                  borderRadius: t.radius.md,
                  opacity: inviteMode === 'invite' ? 1 : 0.5,
                },
              ]}
              placeholder="이메일 또는 휴대폰 번호"
              placeholderTextColor={t.colors.subtext}
              autoCapitalize="none"
              keyboardType="default"
            />
            {categoryLabel ? (
              <Text style={[styles.help, { color: t.colors.subtext, marginTop: 8 }]}>
                선택된 분야: {categoryLabel}
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: t.colors.border, backgroundColor: t.colors.background }]}>
          <Pressable
            onPress={handleSubmit}
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
              {submitting ? '등록 중…' : '안건 등록'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ModePill({
  active,
  onPress,
  icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
}) {
  const t = useTokens();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modePill,
        {
          borderRadius: t.radius.pill,
          backgroundColor: active ? t.colors.tint : t.colors.muted,
          borderColor: active ? t.colors.tint : t.colors.border,
        },
      ]}>
      <Feather name={icon} size={14} color={active ? '#FFFFFF' : t.colors.text} />
      <Text style={{ color: active ? '#FFFFFF' : t.colors.text, fontSize: 13, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  banner: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  field: { gap: 8 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  catPill: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modeRow: { flexDirection: 'row', gap: 8 },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  help: { fontSize: 12, lineHeight: 18 },
  contactBox: { borderWidth: 1, padding: 16 },
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
