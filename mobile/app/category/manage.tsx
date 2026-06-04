import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import {
  deleteCategory,
  getMemberCategories,
  type Category,
} from '@/src/api/category';
import { useAuth } from '@/src/auth/AuthProvider';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

export default function CategoryManageScreen() {
  const t = useTokens();
  const router = useRouter();
  const { user } = useAuth();
  const memberSeq = user?.memberSeq;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSeq, setDeletingSeq] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    if (memberSeq == null) {
      setCategories([]);
      setLoading(false);
      setError('로그인이 필요합니다. 다시 로그인해 주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMemberCategories({ memberSeq, currentPage: 1 });
      setCategories(res.list.filter((c) => c.categorySeq > 0));
    } catch (e: unknown) {
      console.error('[category/manage] load failed', e);
      setCategories([]);
      setError(e instanceof Error ? e.message : '카테고리를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [memberSeq]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  const openCreate = useCallback(() => {
    router.push({ pathname: '/category/new', params: { returnTo: 'manage' } });
  }, [router]);

  const openEdit = useCallback(
    (item: Category) => {
      router.push({
        pathname: '/category/edit',
        params: {
          categorySeq: String(item.categorySeq),
          name: item.name,
          emoji: item.emoji,
        },
      });
    },
    [router],
  );

  const confirmDelete = useCallback(
    (item: Category) => {
      if (memberSeq == null) return;
      Alert.alert(
        '카테고리 삭제',
        `「${item.name}」 분야를 삭제할까요?\n연결된 안건이 있으면 삭제되지 않을 수 있어요.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              setDeletingSeq(item.categorySeq);
              try {
                await deleteCategory(memberSeq, item.categorySeq);
                await loadCategories();
              } catch (e: unknown) {
                Alert.alert(
                  '삭제 실패',
                  e instanceof Error ? e.message : '카테고리를 삭제하지 못했어요.',
                );
              } finally {
                setDeletingSeq(null);
              }
            },
          },
        ],
      );
    },
    [loadCategories, memberSeq],
  );

  const renderBody = () => {
    if (loading) {
      return (
        <Card border background="surface" radius={18} padding={24} style={styles.centerCard}>
          <ActivityIndicator color={t.colors.tint} />
          <Text style={[styles.hint, { color: t.colors.subtext }]}>카테고리를 불러오는 중이에요</Text>
        </Card>
      );
    }

    if (error) {
      return (
        <Card border background="surface" radius={18} padding={18}>
          <Text style={[styles.errorTitle, { color: t.colors.text }]}>불러오지 못했어요</Text>
          <Text style={[styles.hint, { color: t.colors.subtext }]}>{error}</Text>
          <Pressable
            onPress={loadCategories}
            style={({ pressed }) => [
              styles.retryBtn,
              { borderColor: t.colors.border, opacity: pressed ? 0.75 : 1 },
            ]}>
            <Text style={{ color: t.colors.text, fontSize: 13, fontWeight: '700' }}>다시 시도</Text>
          </Pressable>
        </Card>
      );
    }

    if (categories.length === 0) {
      return (
        <Card border background="surface" radius={18} padding={22} style={styles.centerCard}>
          <Text style={{ fontSize: 34 }}>📂</Text>
          <Text style={[styles.emptyTitle, { color: t.colors.text }]}>아직 분야가 없어요</Text>
          <Text style={[styles.hint, { color: t.colors.subtext }]}>
            위 버튼으로 첫 카테고리를 만들어 보세요.
          </Text>
        </Card>
      );
    }

    return categories.map((item) => {
      const busy = deletingSeq === item.categorySeq;
      return (
        <Card
          key={item.categorySeq}
          border
          background="surface"
          radius={16}
          padding={0}
          style={styles.rowCard}>
          <RNView style={styles.row}>
            <Text style={styles.rowEmoji}>{item.emoji}</Text>
            <Text style={[styles.rowTitle, { color: t.colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Pressable
              disabled={busy}
              onPress={() => openEdit(item)}
              style={({ pressed }) => [
                styles.actionBtn,
                { borderColor: t.colors.border, opacity: pressed || busy ? 0.7 : 1 },
              ]}>
              <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 12 }}>수정</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => confirmDelete(item)}
              style={({ pressed }) => [styles.deleteBtn, { opacity: pressed || busy ? 0.7 : 1 }]}>
              {busy ? (
                <ActivityIndicator size="small" color="#D65041" />
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
      <AppHeader
        title="카테고리 관리"
        leftIconName="chevron-left"
        onPressLeft={() => router.back()}
        rightIconName="plus"
        onPressRight={openCreate}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => [
            styles.addBanner,
            {
              borderColor: t.colors.border,
              backgroundColor: t.colors.surface,
              opacity: pressed ? 0.86 : 1,
            },
          ]}>
          <RNView style={[styles.addIconWrap, { backgroundColor: 'rgba(122, 204, 192, 0.16)' }]}>
            <Feather name="plus" size={18} color={t.colors.tint} />
          </RNView>
          <RNView style={styles.addTextCol}>
            <Text style={[styles.addTitle, { color: t.colors.text }]}>새 카테고리 추가</Text>
          </RNView>
          <Feather name="chevron-right" size={18} color={t.colors.tabIconDefault} />
        </Pressable>

        <Text style={[styles.sectionLabel, { color: t.colors.subtext }]}>
          내 카테고리 · {loading ? '…' : categories.length}개
        </Text>

        {renderBody()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  addBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTextCol: { flex: 1 },
  addTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  sectionLabel: {
    marginTop: 4,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  centerCard: { alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 10, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  errorTitle: { fontSize: 15, fontWeight: '800' },
  retryBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: '800' },
  rowCard: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  actionBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F4B6AE',
    backgroundColor: '#FFF7F6',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  deleteText: { color: '#D65041', fontSize: 12, fontWeight: '800' },
});
