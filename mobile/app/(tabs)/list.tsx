import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { getMemberCategories, type Category } from '@/src/api/category';
import { deleteTopic, getMemberTopics, TopicSummary } from '@/src/api/topic';
import { useAuth } from '@/src/auth/AuthProvider';
import { useTopicsRefresh } from '@/src/topics/TopicsRefreshProvider';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

const FAB_COLOR = '#D4B483';

export default function ListScreen() {
  const t = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshToken, bumpTopicsRefresh } = useTopicsRefresh();
  const memberSeq = user?.memberSeq;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategorySeq, setSelectedCategorySeq] = useState<number | null>(null);
  const [showPickedOnly, setShowPickedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTopicSeq, setDeletingTopicSeq] = useState<string | null>(null);

  const fabBottom = Math.max(insets.bottom, 12) + 72;

  const loadCategories = useCallback(async () => {
    if (memberSeq == null) {
      setCategories([]);
      setLoadingCats(false);
      return;
    }
    setLoadingCats(true);
    try {
      const res = await getMemberCategories({ memberSeq, currentPage: 1 });
      setCategories(res.list);
    } catch (e: unknown) {
      console.error('[category] load failed', e);
      setCategories([]);
    } finally {
      setLoadingCats(false);
    }
  }, [memberSeq]);

  const loadTopics = useCallback(
    async (categorySeq: number | null, pickedOnly: boolean) => {
      if (memberSeq == null) {
        setTopics([]);
        setLoadingTopics(false);
        setError('회원번호를 확인할 수 없습니다. 다시 로그인해 주세요.');
        return;
      }
      setLoadingTopics(true);
      setError(null);
      try {
        const res = await getMemberTopics({
          memberSeq,
          currentPage: 1,
          categorySeq: categorySeq ?? undefined,
          picked: pickedOnly ? true : undefined,
        });
        setTopics(res.list);
      } catch (e: unknown) {
        console.error('[topic] load failed', e);
        setTopics([]);
        setError(e instanceof Error ? e.message : '안건을 불러오지 못했어요.');
      } finally {
        setLoadingTopics(false);
      }
    },
    [memberSeq],
  );

  const reload = useCallback(() => {
    void loadCategories();
    void loadTopics(selectedCategorySeq, showPickedOnly);
  }, [loadCategories, loadTopics, selectedCategorySeq, showPickedOnly]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    reload();
  }, [reload, refreshToken]);

  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((item) => item.title.toLowerCase().includes(q));
  }, [query, topics]);

  const openCreate = useCallback(() => {
    const params: Record<string, string> = {};
    if (selectedCategorySeq != null) params.categorySeq = String(selectedCategorySeq);
    router.push({ pathname: '/create', params });
  }, [router, selectedCategorySeq]);

  const confirmDeleteTopic = useCallback(
    (topic: TopicSummary) => {
      if (memberSeq == null) {
        Alert.alert('삭제 실패', '로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
        return;
      }

      const runDelete = async () => {
        setDeletingTopicSeq(String(topic.topicSeq));
        try {
          await deleteTopic(memberSeq, String(topic.topicSeq));
          bumpTopicsRefresh();
        } catch (e: unknown) {
          Alert.alert(
            '삭제 실패',
            e instanceof Error ? e.message : '안건을 삭제하지 못했어요.',
          );
        } finally {
          setDeletingTopicSeq(null);
        }
      };

      // RN Web에서 Alert 버튼 콜백이 동작하지 않는 경우가 있어 confirm으로 폴백한다.
      if (Platform.OS === 'web') {
        const ok = globalThis.confirm?.(`「${topic.title}」 안건을 삭제할까요?`);
        if (ok) {
          void runDelete();
        }
        return;
      }

      Alert.alert(
        '안건 삭제',
        `「${topic.title}」 안건을 삭제할까요?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              void runDelete();
            },
          },
        ],
      );
    },
    [bumpTopicsRefresh, memberSeq],
  );

  const openTopicDetail = useCallback(
    (topic: TopicSummary) => {
      router.push({
        pathname: '/agenda/[id]',
        params: {
          id: String(topic.topicSeq),
          title: topic.title,
          categoryName: topic.categoryName ?? '',
        },
      });
    },
    [router],
  );

  const renderListBody = () => {
    if (loadingTopics) {
      return (
        <Card border background="surface" radius={18} padding={20} style={styles.centerCard}>
          <ActivityIndicator color={t.colors.tint} />
          <Text style={[styles.hint, { color: t.colors.subtext }]}>안건을 불러오는 중이에요</Text>
        </Card>
      );
    }

    if (error) {
      return (
        <Card border background="surface" radius={18} padding={18}>
          <Text style={[styles.errorTitle, { color: t.colors.text }]}>안건을 불러오지 못했어요</Text>
          <Text style={[styles.errorBody, { color: t.colors.subtext }]}>{error}</Text>
          <Pressable
            onPress={() => loadTopics(selectedCategorySeq, showPickedOnly)}
            style={({ pressed }) => [styles.retryBtn, { borderColor: t.colors.border, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 13 }}>다시 시도</Text>
          </Pressable>
        </Card>
      );
    }

    if (filteredTopics.length === 0) {
      return (
        <Card border background="surface" radius={18} padding={20} style={styles.centerCard}>
          <Text style={[styles.emptyTitle, { color: t.colors.text }]}>표시할 안건이 없어요</Text>
          <Text style={[styles.hint, { color: t.colors.subtext }]}>다른 분야를 선택하거나 안건을 추가해보세요.</Text>
        </Card>
      );
    }

    return filteredTopics.map((tp) => {
      const deleting = deletingTopicSeq === String(tp.topicSeq);
      return (
        <Card key={tp.topicSeq} border background="surface" radius={18} padding={0} style={styles.topicCard}>
          <Pressable onPress={() => openTopicDetail(tp)} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
            <RNView style={styles.topicTop}>
              <RNView style={styles.topicTextCol}>
                <RNView style={styles.topicTitleRow}>
                  <RNView style={[styles.topicEmojiWrap, { backgroundColor: t.colors.muted }]}>
                    <Text style={styles.topicEmoji}>{tp.emoji || '🗳️'}</Text>
                  </RNView>
                  <Text style={[styles.topicTitle, { color: t.colors.text }]} numberOfLines={1}>
                    {tp.title}
                  </Text>
                </RNView>
                <Text style={[styles.topicSub, { color: t.colors.subtext }]} numberOfLines={1}>
                  {buildTopicMeta(tp)}
                </Text>
              </RNView>
              <RNView
                style={[
                  styles.statusBadge,
                  { backgroundColor: tp.tagVariant === 'mint' ? '#1F3C39' : '#D4B483' },
                ]}>
                <Text
                  style={[
                    styles.statusText,
                    { color: tp.tagVariant === 'mint' ? '#D4B483' : '#121212' },
                  ]}>
                  {tp.tagVariant === 'mint' ? tp.tag : 'Pick!'}
                </Text>
              </RNView>
            </RNView>
          </Pressable>
          <RNView style={[styles.topicActions, { borderTopColor: t.colors.border }]}>
            <Pressable
              onPress={() => {
                const params: Record<string, string> = { topicSeq: String(tp.topicSeq) };
                if (tp.categorySeq) params.categorySeq = tp.categorySeq;
                router.push({ pathname: '/create', params });
              }}
              style={({ pressed }) => [styles.actionBtn, { borderColor: t.colors.border, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 12 }}>수정</Text>
            </Pressable>
            <Pressable
              disabled={deleting}
              onPress={() => confirmDeleteTopic(tp)}
              style={({ pressed }) => [styles.deleteBtn, { opacity: pressed || deleting ? 0.7 : 1 }]}>
              {deleting ? (
                <ActivityIndicator size="small" color="#DE6C5A" />
              ) : (
                <Text style={styles.deleteText}>삭제</Text>
              )}
            </Pressable>
          </RNView>
        </Card>
      );
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <RNView style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: t.colors.text }]}>
          안건 전체 <Text style={{ color: t.colors.gold }}>목록</Text>
        </Text>
      </RNView>

      <RNView style={styles.catBlock}>
        <RNView style={styles.catLabelRow}>
          <Text style={[styles.catLabel, { color: t.colors.subtext }]}>카테고리</Text>
          <Pressable
            onPress={() => router.push('/category/manage')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="카테고리 관리"
            style={({ pressed }) => [
              styles.catManageBtn,
              { borderColor: t.colors.border, opacity: pressed ? 0.72 : 1 },
            ]}>
            <Feather name="settings" size={14} color={t.colors.subtext} />
          </Pressable>
        </RNView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catScrollContent}
          keyboardShouldPersistTaps="handled">
          <CategoryChip
            label="전체"
            emoji="✨"
            selected={selectedCategorySeq == null && !showPickedOnly}
            onPress={() => {
              setSelectedCategorySeq(null);
              setShowPickedOnly(false);
            }}
            tint={t.colors.tint}
            surface={t.colors.surface}
            border={t.colors.border}
            text={t.colors.text}
          />
          <CategoryChip
            label="Pick"
            emoji="💖"
            selected={showPickedOnly}
            onPress={() => {
              setSelectedCategorySeq(null);
              setShowPickedOnly(true);
            }}
            tint={t.colors.tint}
            surface={t.colors.surface}
            border={t.colors.border}
            text={t.colors.text}
          />
          {loadingCats ? (
            <RNView style={styles.catLoading}>
              <ActivityIndicator size="small" color={t.colors.tint} />
            </RNView>
          ) : (
            categories.map((c) => (
              <CategoryChip
                key={c.categorySeq}
                label={c.name}
                emoji={c.emoji}
                selected={selectedCategorySeq === c.categorySeq}
                onPress={() => {
                  setSelectedCategorySeq(c.categorySeq);
                  setShowPickedOnly(false);
                }}
                tint={t.colors.tint}
                surface={t.colors.surface}
                border={t.colors.border}
                text={t.colors.text}
              />
            ))
          )}
        </ScrollView>
      </RNView>

      <RNView style={styles.searchWrap}>
        <RNView style={[styles.searchBox, { backgroundColor: t.colors.muted }]}>
          <Feather name="search" size={17} color={t.colors.tabIconDefault} />
          <TextInput
            placeholder="안건 검색"
            placeholderTextColor={t.colors.tabIconDefault}
            style={[styles.searchInput, { color: t.colors.text }]}
            value={query}
            onChangeText={setQuery}
          />
        </RNView>
      </RNView>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[styles.listContent, { paddingBottom: fabBottom + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {renderListBody()}
      </ScrollView>

      <Pressable
        onPress={openCreate}
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabBottom, backgroundColor: FAB_COLOR, opacity: pressed ? 0.88 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="안건 추가">
        <Feather name="plus" size={28} color="#121212" />
      </Pressable>
    </View>
  );
}

function buildTopicMeta(tp: TopicSummary) {
  const sub = (tp.sub ?? '').trim();
  if (sub) return sub;
  return tp.categoryName ?? '';
}

function CategoryChip({
  label,
  emoji,
  selected,
  onPress,
  tint,
  surface,
  border,
  text,
}: Readonly<{
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
  tint: string;
  surface: string;
  border: string;
  text: string;
}>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? tint : surface,
          borderColor: selected ? tint : border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}>
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipLabel, { color: selected ? '#D4B483' : text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  catBlock: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  catLabelRow: {
    paddingHorizontal: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  catManageBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 180, 131, 0.15)',
  },
  catScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  catScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  chipEmoji: { fontSize: 14, marginRight: 5 },
  chipLabel: { fontSize: 13, fontWeight: '700', maxWidth: 120 },
  catLoading: {
    height: 36,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  searchBox: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 0,
  },
  listScroll: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  centerCard: { alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 10, fontSize: 12 },
  errorTitle: { fontSize: 15, fontWeight: '800' },
  errorBody: { marginTop: 8, fontSize: 12, lineHeight: 18 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  retryBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  topicCard: { marginBottom: 12, overflow: 'hidden' },
  topicTop: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topicTextCol: { flex: 1, paddingRight: 8 },
  topicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicEmojiWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicEmoji: { fontSize: 14 },
  topicTitle: { fontSize: 15, fontWeight: '800' },
  topicSub: { marginTop: 5, fontSize: 12, lineHeight: 17 },
  statusBadge: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { fontSize: 11, fontWeight: '800' },
  topicActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#5A3A36',
    backgroundColor: '#2A1C1A',
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#DE6C5A', fontSize: 12, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 6,
  },
});
