import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import {
  FALLBACK_CATEGORIES,
  getMemberCategories,
  type Category,
} from '@/src/api/category';
import {
  createTopic,
  getTopicDetail,
  updateTopic,
  type TopicFileItem,
} from '@/src/api/topic';
import { useAuth } from '@/src/auth/AuthProvider';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { useTokens } from '@/src/ui/tokens';

const EMOJI_OPTIONS = [
  '🗳️','✨','📌','🛍️','🛒',
  '💕','🍽️','☕','🍰','💍',
  '✈️','🏨','👶','🍼','🎁',
  '🎉','🏠','📷','🎬','🎧',
  '💌',
];

const STATUS_OPTIONS = [
  { value: 'VOTING', label: '투표 중' },
  { value: 'PICK', label: '결정 완료' },
] as const;

type InviteMode = 'invite' | 'solo';

async function copyToClipboard(text: string, okMessage = '클립보드에 복사했어요.') {
  if (!text) return;
  await Clipboard.setStringAsync(text);
  Alert.alert('복사 완료', okMessage);
}

async function shareText(text: string) {
  if (!text) return;
  try {
    await Share.share({ message: text });
  } catch {
    /* noop */
  }
}

export default function CreateScreen() {
  const t = useTokens();
  const router = useRouter();
  const { user } = useAuth();
  const memberSeq = user?.memberSeq;

  const params = useLocalSearchParams<{
    topicSeq?: string;
    categorySeq?: string;
    categoryAdded?: string;
    categoryName?: string;
  }>();

  const topicSeqParam = typeof params.topicSeq === 'string' ? params.topicSeq : null;
  const categorySeqHint = typeof params.categorySeq === 'string' ? params.categorySeq : null;
  const categoryAdded = typeof params.categoryAdded === 'string' ? params.categoryAdded : null;
  const categoryNameHint = typeof params.categoryName === 'string' ? params.categoryName : null;

  const editTopicSeq = useMemo(() => {
    const raw = topicSeqParam?.trim();
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 && String(n) === raw ? n : null;
  }, [topicSeqParam]);

  const isEditMode = editTopicSeq != null;

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [status, setStatus] = useState<string>('VOTING');
  const [inviteMode, setInviteMode] = useState<InviteMode>('invite');
  const [fileList, setFileList] = useState<TopicFileItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [categorySeq, setCategorySeq] = useState<string>(
    String(FALLBACK_CATEGORIES[0]?.categorySeq ?? ''),
  );
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (categoryAdded === '1') {
      setBanner('카테고리가 추가되었습니다. 목록에서 선택해 주세요.');
    }
  }, [categoryAdded]);

  useEffect(() => {
    if (categoryNameHint?.trim()) {
      setBanner(`방금 입력한 분야: ${categoryNameHint.trim()}`);
    }
  }, [categoryNameHint]);

  const loadCategories = useCallback(async () => {
    if (memberSeq == null) {
      setCategories(FALLBACK_CATEGORIES);
      setLoadingCats(false);
      return;
    }
    setLoadingCats(true);
    try {
      const parsed = await getMemberCategories({ memberSeq, currentPage: 1 });
      setCategories(parsed.list);
      if (parsed.list.length > 0) {
        const hint = categorySeqHint ? Number.parseInt(categorySeqHint, 10) : Number.NaN;
        const match =
          Number.isFinite(hint) && parsed.list.some((c) => c.categorySeq === hint);
        setCategorySeq((prev) => {
          if (match) return String(hint);
          if (prev && parsed.list.some((c) => String(c.categorySeq) === prev)) return prev;
          return String(parsed.list[0].categorySeq);
        });
      }
    } catch {
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setLoadingCats(false);
    }
  }, [memberSeq, categorySeqHint]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadTopicDetail = useCallback(async () => {
    if (!isEditMode || editTopicSeq == null || memberSeq == null) return;
    setLoadingDetail(true);
    setBanner(null);
    try {
      const detail = await getTopicDetail(editTopicSeq, memberSeq);
      if (!detail) {
        setBanner('안건 정보를 불러오지 못했습니다.');
        return;
      }
      setTitle(detail.title);
      setEmoji(detail.emoji || EMOJI_OPTIONS[0]);
      setStatus(detail.status || 'VOTING');
      setFileList(detail.fileList ?? []);
      if (detail.categorySeq) {
        const catNum = Number.parseInt(detail.categorySeq, 10);
        if (Number.isFinite(catNum) && catNum > 0) {
          setCategorySeq(String(catNum));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBanner(msg || '안건 정보를 불러오지 못했습니다.');
    } finally {
      setLoadingDetail(false);
    }
  }, [isEditMode, editTopicSeq, memberSeq]);

  useEffect(() => {
    if (isEditMode) loadTopicDetail();
  }, [isEditMode, loadTopicDetail]);

  const categoryLabel = useMemo(() => {
    const n = Number.parseInt(categorySeq, 10);
    const row = categories.find((c) => c.categorySeq === n);
    return row?.name ?? '';
  }, [categories, categorySeq]);

  const inviteLink = useMemo(() => {
    if (!isEditMode || editTopicSeq == null) return '';
    return Linking.createURL('/invite', { queryParams: { topicSeq: String(editTopicSeq) } });
  }, [isEditMode, editTopicSeq]);

  const moveToListAfterSubmit = useCallback(() => {
    router.replace({
      pathname: '/list',
      params: { refreshAt: String(Date.now()) },
    });
  }, [router]);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setBanner('안건 제목을 입력해 주세요.');
      return;
    }
    if (memberSeq == null) {
      Alert.alert('로그인 필요', '안건을 저장하려면 로그인이 필요합니다.');
      return;
    }
    const catNum = Number.parseInt(categorySeq, 10);
    if (!Number.isFinite(catNum) || catNum <= 0) {
      setBanner('카테고리를 선택해 주세요.');
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const payload = {
        memberSeq,
        fileList,
        categorySeq: catNum,
        emoji,
        title: trimmed,
        status: status || 'VOTING',
        googleEventId: null,
      };

      if (isEditMode && editTopicSeq != null) {
        await updateTopic({
          memberSeq,
          topicSeq: editTopicSeq,
          emoji,
          title: trimmed,
          googleEventId: null,
        });
        moveToListAfterSubmit();
      } else {
        await createTopic(payload);
        moveToListAfterSubmit();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert(isEditMode ? '수정 실패' : '등록 실패', msg);
    } finally {
      setSubmitting(false);
    }
  }

  const screenTitle = isEditMode ? '안건 수정' : '안건 생성';
  const submitLabel = isEditMode ? '안건 수정 저장' : '안건 등록';
  const formDisabled = submitting || loadingDetail;
  const submitButtonText = useMemo(() => {
    if (!submitting) return submitLabel;
    return isEditMode ? '수정 중…' : '등록 중…';
  }, [isEditMode, submitLabel, submitting]);

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader title={screenTitle} leftIconName="chevron-left" onPressLeft={() => router.back()} />

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

          {loadingDetail ? (
            <View style={styles.loadingRow} lightColor="transparent" darkColor="transparent">
              <ActivityIndicator color={t.colors.tint} />
              <Text style={{ color: t.colors.subtext, fontSize: 13 }}>안건 정보를 불러오는 중…</Text>
            </View>
          ) : null}

          <View style={styles.field} lightColor="transparent" darkColor="transparent">
            <Text style={[styles.label, { color: t.colors.text }]}>안건 제목</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              editable={!formDisabled}
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
            <Text style={[styles.label, { color: t.colors.text }]}>이모지</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
              {EMOJI_OPTIONS.map((e) => {
                const active = e === emoji;
                return (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    disabled={formDisabled}
                    style={[
                      styles.emojiPill,
                      {
                        borderRadius: t.radius.pill,
                        backgroundColor: active ? t.colors.tint : t.colors.muted,
                        borderColor: active ? t.colors.tint : t.colors.border,
                        opacity: formDisabled ? 0.6 : 1,
                      },
                    ]}>
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
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
                    disabled={loadingCats || formDisabled}
                    style={[
                      styles.catPill,
                      {
                        borderRadius: t.radius.pill,
                        backgroundColor: active ? t.colors.tint : t.colors.muted,
                        borderColor: active ? t.colors.tint : t.colors.border,
                        opacity: loadingCats || formDisabled ? 0.6 : 1,
                      },
                    ]}>
                    <Text
                      style={{
                        color: active ? t.colors.gold : t.colors.text,
                        fontSize: 13,
                        fontWeight: '600',
                      }}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {categoryLabel ? (
              <Text style={[styles.help, { color: t.colors.subtext }]}>선택된 분야: {categoryLabel}</Text>
            ) : null}
          </View>

          <View style={styles.field} lightColor="transparent" darkColor="transparent">
            <Text style={[styles.label, { color: t.colors.text }]}>진행 방식</Text>
            <View style={styles.modeRow} lightColor="transparent" darkColor="transparent">
              <ModePill
                active={inviteMode === 'invite'}
                onPress={() => setInviteMode('invite')}
                icon="user-plus"
                label="초대"
                disabled={formDisabled}
              />
              <ModePill
                active={inviteMode === 'solo'}
                onPress={() => setInviteMode('solo')}
                icon="user"
                label="혼자 모드"
                disabled={formDisabled}
              />
            </View>
            <Text style={[styles.help, { color: t.colors.subtext }]}>
              초대받은 사용자는 초대 링크로 들어온 뒤 회원가입/로그인을 먼저 진행해요. 로그인으로 MEMBER_SEQ를 확보한 다음
              서버에 참여 요청(POST /api/topic/{'{topicSeq}'}/members/join)을 보내 TOPIC_MEMBER에 참여자가 등록돼요.
            </Text>

            {isEditMode && inviteLink ? (
              <View
                style={[
                  styles.inviteBox,
                  {
                    borderColor: t.colors.border,
                    backgroundColor: t.colors.surface,
                    borderRadius: t.radius.xl,
                  },
                ]}
                lightColor="transparent"
                darkColor="transparent">
                <Text style={{ color: t.colors.text, fontSize: 12, fontWeight: '800' }}>초대 링크</Text>
                <Text style={{ color: t.colors.subtext, fontSize: 12, marginTop: 6 }} numberOfLines={2}>
                  {inviteLink}
                </Text>
                <View style={styles.inviteActions} lightColor="transparent" darkColor="transparent">
                  <Pressable
                    onPress={() => copyToClipboard(inviteLink, '초대 링크를 클립보드에 복사했어요.')}
                    disabled={formDisabled}
                    style={({ pressed }) => [
                      styles.inviteBtn,
                      { borderColor: t.colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <Text style={{ color: t.colors.text, fontWeight: '800', fontSize: 12 }}>복사</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => shareText(inviteLink)}
                    disabled={formDisabled}
                    style={({ pressed }) => [
                      styles.inviteBtn,
                      { borderColor: t.colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <Text style={{ color: t.colors.text, fontWeight: '800', fontSize: 12 }}>공유</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: t.colors.border, backgroundColor: t.colors.background }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={formDisabled}
            style={[
              styles.submit,
              {
                backgroundColor: t.colors.gold,
                borderRadius: t.radius.lg,
                opacity: formDisabled ? 0.5 : 1,
              },
            ]}>
            <Text style={{ color: t.colors.ctaText, fontSize: 15, fontWeight: '700' }}>
              {submitButtonText}
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
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  banner: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
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
  emojiRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  emojiPill: {
    borderWidth: 1,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  inviteBox: { borderWidth: 1, padding: 14, marginTop: 6 },
  inviteActions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  inviteBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
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

function ModePill({
  active,
  onPress,
  icon,
  label,
  disabled,
}: Readonly<{
  active: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  disabled: boolean;
}>) {
  const t = useTokens();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.modePill,
        {
          borderRadius: t.radius.pill,
          backgroundColor: active ? t.colors.tint : t.colors.muted,
          borderColor: active ? t.colors.tint : t.colors.border,
          opacity: disabled ? 0.6 : 1,
        },
      ]}>
      <Feather name={icon} size={14} color={active ? t.colors.gold : t.colors.text} />
      <Text style={{ color: active ? t.colors.gold : t.colors.text, fontSize: 13, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}
