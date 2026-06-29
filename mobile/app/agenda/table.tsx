import Feather from '@expo/vector-icons/Feather';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import {
  Candidate,
  formatCandidatePrice,
  formatCandidatePriceOrDate,
  getCandidateList,
} from '@/src/api/candidate';
import { getTopicDetail } from '@/src/api/topic';
import { useAuth } from '@/src/auth/AuthProvider';

const PICK_COLOR = '#D4B483';

export default function CandidateTableScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const memberSeq = user?.memberSeq;

  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    categoryName?: string;
  }>();

  const topicSeqRaw = typeof params.id === 'string' ? params.id : '';
  const topicSeq = Number.parseInt(topicSeqRaw, 10);
  const topicTitle = typeof params.title === 'string' ? params.title : '안건 상세';
  const categoryName = typeof params.categoryName === 'string' ? params.categoryName : '';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [decidedSeq, setDecidedSeq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (memberSeq == null || !Number.isFinite(topicSeq) || topicSeq <= 0) {
      setCandidates([]);
      setError('안건 정보를 확인할 수 없습니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, detail] = await Promise.all([
        getCandidateList({ memberSeq, topicSeq, currentPage: 1 }),
        getTopicDetail(topicSeq, memberSeq).catch(() => null),
      ]);
      setCandidates(list);
      const fixed = list.find((c) => c.fixed);
      const decided =
        detail?.pickedCandidateSeq ??
        (fixed?.candidateSeq ?? null) ??
        (detail?.candidateSeq ? Number(detail.candidateSeq) : null);
      setDecidedSeq(decided != null && Number.isFinite(decided) && decided > 0 ? decided : null);
    } catch (e: unknown) {
      setCandidates([]);
      setError(e instanceof Error ? e.message : '후보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [memberSeq, topicSeq]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const total = candidates.length;

  const topSub = useMemo(() => {
    if (categoryName.trim()) return categoryName.trim();
    return total > 0 ? `후보 ${total}건 · 한눈에 비교` : '한눈에 비교';
  }, [categoryName, total]);

  const openLink = useCallback(async (url: string | null) => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('링크', '페이지를 열 수 없어요.');
    }
  }, []);

  const openEdit = useCallback(
    (candidateSeq: number) => {
      router.push({
        pathname: '/candidate/edit',
        params: {
          candidateSeq: String(candidateSeq),
          topicSeq: String(topicSeq),
        },
      });
    },
    [router, topicSeq],
  );

  return (
    <View style={styles.root}>
      <RNView style={[styles.topbar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.topbarBack} hitSlop={8}>
          <Feather name="chevron-left" size={20} color="#63635E" />
        </Pressable>
        <RNView style={styles.topbarInfo}>
          <Text style={styles.topbarTitle} numberOfLines={1}>
            {topicTitle}
          </Text>
          {topSub ? (
            <Text style={styles.topbarSub} numberOfLines={1}>
              {topSub}
            </Text>
          ) : null}
        </RNView>
        <Feather name="grid" size={18} color={PICK_COLOR} />
      </RNView>

      {loading ? (
        <RNView style={styles.center}>
          <ActivityIndicator color={PICK_COLOR} />
          <Text style={styles.hint}>후보를 불러오는 중이에요</Text>
        </RNView>
      ) : error ? (
        <RNView style={styles.center}>
          <Text style={styles.errorTitle}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </RNView>
      ) : total === 0 ? (
        <RNView style={styles.center}>
          <Text style={styles.errorTitle}>등록된 후보가 없어요</Text>
          <Text style={styles.hint}>후보를 등록하면 여기서 한눈에 비교할 수 있어요.</Text>
        </RNView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
          showsVerticalScrollIndicator>
          {/* 표 헤더 */}
          <RNView style={[styles.row, styles.headerRow]}>
            <Text style={[styles.headImg, styles.headText]}>이미지</Text>
            <Text style={[styles.headMain, styles.headText]}>이름 · 가격</Text>
            <Text style={[styles.headLink, styles.headText]}>링크</Text>
          </RNView>

          {candidates.map((item) => {
            const isPicked = decidedSeq != null && item.candidateSeq === decidedSeq;
            return (
              <CandidateRow
                key={item.candidateSeq}
                candidate={item}
                isPicked={isPicked}
                onOpenLink={() => openLink(item.linkUrl)}
                onPress={() => openEdit(item.candidateSeq)}
              />
            );
          })}

          <Text style={styles.footerHint}>행을 누르면 후보를 수정할 수 있어요.</Text>
        </ScrollView>
      )}
    </View>
  );
}

function CandidateRow({
  candidate,
  isPicked,
  onOpenLink,
  onPress,
}: Readonly<{
  candidate: Candidate;
  isPicked: boolean;
  onOpenLink: () => void;
  onPress: () => void;
}>) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = candidate.imageUrl && !imgFailed;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        styles.bodyRow,
        isPicked && styles.bodyRowPicked,
        { opacity: pressed ? 0.85 : 1 },
      ]}>
      {/* 이미지 */}
      <RNView style={styles.headImg}>
        <RNView style={styles.thumb}>
          {showImage ? (
            <Image
              source={{ uri: candidate.imageUrl! }}
              style={styles.thumbImg}
              resizeMode="cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Feather name="shopping-bag" size={20} color="#9FE1CB" />
          )}
        </RNView>
      </RNView>

      {/* 이름 · 가격 · 상세 */}
      <RNView style={styles.headMain}>
        <RNView style={styles.nameRow}>
          {isPicked ? (
            <RNView style={styles.pickBadge}>
              <Text style={styles.pickBadgeText}>Pick!</Text>
            </RNView>
          ) : null}
          <Text style={styles.name} numberOfLines={2}>
            {candidate.name}
          </Text>
        </RNView>
        <Text style={styles.price}>{formatCandidatePriceOrDate(candidate)}</Text>
        {candidate.pickDate?.trim() && candidate.price != null ? (
          <Text style={styles.subPrice}>{formatCandidatePrice(candidate.price)}</Text>
        ) : null}
        {candidate.info?.trim() ? (
          <Text style={styles.detail} numberOfLines={2}>
            {candidate.info.trim()}
          </Text>
        ) : (
          <Text style={styles.detailEmpty}>상세 정보 없음</Text>
        )}
      </RNView>

      {/* 링크 */}
      <RNView style={styles.headLink}>
        {candidate.linkUrl ? (
          <Pressable
            onPress={onOpenLink}
            hitSlop={8}
            style={({ pressed }) => [styles.linkBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Feather name="external-link" size={16} color="#121212" />
          </Pressable>
        ) : (
          <RNView style={styles.linkBtnEmpty}>
            <Feather name="minus" size={14} color="#63635E" />
          </RNView>
        )}
      </RNView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 10, fontSize: 12, color: '#BDBDBD', textAlign: 'center' },
  errorTitle: { fontSize: 15, fontWeight: '700', color: '#F2F2F2' },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    backgroundColor: '#1E1E1E',
  },
  retryText: { fontSize: 13, fontWeight: '700', color: '#F2F2F2' },
  topbar: {
    backgroundColor: '#121212',
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2F2F2F',
  },
  topbarBack: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarInfo: { flex: 1, minWidth: 0 },
  topbarTitle: { fontSize: 14, fontWeight: '700', color: '#F2F2F2' },
  topbarSub: { fontSize: 11, color: '#BDBDBD', marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
  },
  headText: { fontSize: 11, fontWeight: '700', color: '#888780' },
  headImg: { width: 64, alignItems: 'center' },
  headMain: { flex: 1, paddingHorizontal: 10 },
  headLink: { width: 48, alignItems: 'center' },
  bodyRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#1E1E1E',
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderColor: '#2F2F2F',
  },
  bodyRowPicked: { backgroundColor: '#1F3C39' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '700', color: '#F2F2F2', flexShrink: 1 },
  pickBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: PICK_COLOR,
  },
  pickBadgeText: { fontSize: 10, fontWeight: '800', color: '#121212' },
  price: { fontSize: 14, fontWeight: '700', color: PICK_COLOR, marginTop: 3 },
  subPrice: { fontSize: 12, color: '#BDBDBD', marginTop: 1 },
  detail: { fontSize: 12, color: '#BDBDBD', lineHeight: 17, marginTop: 4 },
  detailEmpty: { fontSize: 12, color: '#63635E', fontStyle: 'italic', marginTop: 4 },
  linkBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: PICK_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnEmpty: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHint: { fontSize: 11, color: '#63635E', textAlign: 'center', marginTop: 14 },
});