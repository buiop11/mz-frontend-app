import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { getMemberTopics, TopicSummary } from '@/src/api/topic';
import { useAuth } from '@/src/auth/AuthProvider';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

// 화면 진입 시 한 번에 보여줄 "진행 중 안건" 카드 최대 개수.
const MAX_VISIBLE_TOPICS = 4;

// 안건 카드의 상태 뱃지 색상 팔레트 (시안과 동일하게 mint/neutral 두 종류).
const BADGE_PALETTE: Record<'mint' | 'neutral', { bg: string; fg: string }> = {
  mint: { bg: '#DDF7F1', fg: '#248B82' },
  neutral: { bg: '#EFE6DC', fg: '#8A7766' },
};

export default function HomeScreen() {
  const t = useTokens();
  const router = useRouter();
  const { user } = useAuth();

  // 백엔드 /api/topic 응답을 화면 상태로 보관한다.
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const memberSeq = user?.memberSeq;

  const loadTopics = useCallback(async () => {
    // 회원번호가 없으면 API를 호출할 수 없으므로 빈 상태로 두고 안내 메시지를 띄운다.
    if (memberSeq == null) {
      console.warn('[home] memberSeq 가 없어 /api/topic 호출 생략');
      setTopics([]);
      setTotalCount(0);
      setError('회원번호를 확인할 수 없습니다. 다시 로그인해 주세요.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getMemberTopics({ memberSeq, currentPage: 1 });
      // SUC001 응답이면 빈 리스트라도 그대로 화면에 반영한다 (예전엔 fromApi 가 false 면 더미가 무시돼서 빈 상태가 보였음).
      setTopics(result.list);
      setTotalCount(result.totalCount ?? result.list.length);
    } catch (e: any) {
      // 콘솔에 풀스택을 그대로 남겨야 백엔드 연동 문제를 빠르게 진단할 수 있다.
      console.error('[home] /api/topic 호출 실패', e);
      setTopics([]);
      setTotalCount(0);
      setError(e?.message ?? '안건 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [memberSeq]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const visibleTopics = topics.slice(0, MAX_VISIBLE_TOPICS);
  const stats = useMemo(() => buildStats(topics, totalCount), [topics, totalCount]);

  // 화면 진입 직후 사용자 이름이 비어 있을 수 있어 '우리' 폴백을 둔다.
  const displayName = (user?.name?.trim() || '우리').replace(/\s/g, '');

  // 상단 배너에 노출할 "이번 주 N건" 카운트 — 진행 중 + 완료 모두 포함한 totalCount 기준.
  const weeklyAgendaCount = Math.max(stats.thisWeek, visibleTopics.length, 0);

  const goCreate = useCallback(() => router.push('/create'), [router]);
  const goAgendaList = useCallback(() => router.push('/list'), [router]);

  const renderTopicContent = () => {
    if (loading) {
      return (
        <Card border background="surface" radius={18} padding={24} style={styles.centerCard}>
          <ActivityIndicator />
          <Text style={[styles.centerCardCaption, { color: t.colors.subtext }]}>
            안건을 불러오는 중입니다.
          </Text>
        </Card>
      );
    }

    if (error) {
      return (
        <Card border background="surface" radius={18} padding={18}>
          <Text style={[styles.errorTitle, { color: t.colors.text }]}>안건을 불러오지 못했어요</Text>
          <Text style={[styles.errorBody, { color: t.colors.subtext }]}>{error}</Text>
          <Pressable
            onPress={loadTopics}
            style={({ pressed }) => [
              styles.retryButton,
              { borderColor: t.colors.border, opacity: pressed ? 0.6 : 1 },
            ]}>
            <Text style={[styles.retryButtonText, { color: t.colors.text }]}>다시 시도</Text>
          </Pressable>
        </Card>
      );
    }

    if (visibleTopics.length === 0) {
      return (
        <Card border background="surface" radius={18} padding={20} style={styles.centerCard}>
          <Text style={[styles.emptyTitle, { color: t.colors.text }]}>
            아직 진행 중인 안건이 없어요
          </Text>
          <Text style={[styles.emptyBody, { color: t.colors.subtext }]}>
            첫 안건을 만들고 함께 결정해보세요.
          </Text>
        </Card>
      );
    }

    return (
      <View
        style={styles.topicGrid}
        lightColor="transparent"
        darkColor="transparent">
        {visibleTopics.map((topic) => (
          <TopicCard
            key={topic.topicSeq}
            topic={topic}
            onPress={() =>
              router.push({
                pathname: '/agenda/[id]',
                params: {
                  id: String(topic.topicSeq),
                  title: topic.title,
                  categoryName: topic.categoryName ?? '',
                },
              })
            }
            textColor={t.colors.text}
            subColor={t.colors.subtext}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* 1) 타이틀 + 알림 벨 */}
        <View style={styles.headerRow} lightColor="transparent" darkColor="transparent">
          <Text style={[styles.title, { color: t.colors.text, flex: 1 }]} numberOfLines={1}>
            우리의 결정 <Text style={{ color: t.colors.tint }}>대기실</Text>
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.bellButton,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Feather name="bell" size={20} color={t.colors.text} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        {/* 3) 메인 배너 (도트 패턴 + CTA) */}
        <View style={[styles.hero, { backgroundColor: '#50AAA4' }]}>
          {DOTS.map((dot) => (
            <View
              key={dot.key}
              style={[styles.dot, { left: dot.left, top: dot.top }]}
              lightColor="transparent"
              darkColor="transparent"
            />
          ))}
          <Text style={styles.heroTitle}>
            {displayName}님, 이번 주 {weeklyAgendaCount}개의 의결사항이 있어요!
          </Text>
          <Text style={styles.heroSub}>
            링크를 붙여 넣고 후보를 모아, 투표로 가볍게 결정해요.
          </Text>
          <View style={styles.heroRow} lightColor="transparent" darkColor="transparent">
            <Pressable
              onPress={goCreate}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: '#322B2A', opacity: pressed ? 0.85 : 1 },
              ]}>
              <Text style={styles.primaryButtonText}>안건 만들기</Text>
            </Pressable>
            <Pressable
              onPress={goAgendaList}
              style={({ pressed }) => [
                styles.secondaryButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}>
              <Text style={styles.secondaryButtonText}>초대하기</Text>
            </Pressable>
          </View>
        </View>

        {/* 4) 통계 카드 */}
        <Card
          border
          background="surface"
          radius={18}
          padding={0}
          style={styles.statsCard}>
          {stats.items.map((item) => (
            <View
              key={item.label}
              style={styles.statItem}
              lightColor="transparent"
              darkColor="transparent">
              <Text
                style={[
                  styles.statValue,
                  { color: item.highlight ? t.colors.tint : t.colors.text },
                ]}>
                {item.value}
              </Text>
              <Text style={[styles.statLabel, { color: t.colors.subtext }]}>{item.label}</Text>
            </View>
          ))}
        </Card>

        {/* 5) 진행 중 안건 헤더 */}
        <View
          style={styles.sectionHeader}
          lightColor="transparent"
          darkColor="transparent">
          <Text style={[styles.sectionTitle, { color: t.colors.text }]}>진행 중 안건</Text>
          <Pressable
            onPress={goAgendaList}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.sectionMore, { color: t.colors.tint }]}>전체 보기</Text>
          </Pressable>
        </View>

        {/* 6) 진행 중 안건 카드 그리드 */}
        {renderTopicContent()}
      </ScrollView>
    </View>
  );
}

type TopicCardProps = Readonly<{
  topic: TopicSummary;
  onPress: () => void;
  textColor: string;
  subColor: string;
}>;

function TopicCard({ topic, onPress, textColor, subColor }: TopicCardProps) {
  const badge = BADGE_PALETTE[topic.tagVariant] ?? BADGE_PALETTE.mint;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.topicPressable,
        { opacity: pressed ? 0.8 : 1 },
      ]}>
      <Card border background="surface" radius={18} padding={18} style={styles.topicCard}>
        <Text style={styles.topicEmoji}>{topic.emoji}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: badge.bg }]}
          lightColor="transparent"
          darkColor="transparent">
          <Text style={[styles.statusText, { color: badge.fg }]}>{topic.tag}</Text>
        </View>
        <Text style={[styles.topicTitle, { color: textColor }]} numberOfLines={2}>
          {topic.title}
        </Text>
        {topic.categoryName ? (
          <Text style={[styles.topicSub, { color: subColor }]} numberOfLines={1}>
            {topic.categoryName}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

// 배너 배경 위에 깔리는 도트 패턴 좌표를 미리 계산해 둔다 (렌더마다 재계산되지 않도록 모듈 스코프).
const DOTS = Array.from({ length: 63 }, (_, i) => ({
  key: `dot-${i}`,
  left: 22 + (i % 9) * 35,
  top: 18 + Math.floor(i / 9) * 25,
}));

function buildStats(topics: TopicSummary[], totalCount: number) {
  // 상태 문자열은 백엔드/프론트에서 케이싱이 다를 수 있어 대문자로 비교한다.
  const openCount = topics.filter((topic) => isOpenStatus(topic.status)).length;
  const pickedCount = topics.filter((topic) => isPickedStatus(topic.status)).length;
  // "이번 주" 카운트는 페이지네이션 totalCount 기준으로 잡되, 최소한 현재 보고 있는 개수보다 작게 보이지 않게 한다.
  const thisWeek = Math.max(totalCount || topics.length, topics.length);

  return {
    thisWeek,
    items: [
      { label: '진행 중', value: openCount, highlight: false },
      { label: '이번 주', value: thisWeek, highlight: true },
      { label: 'Pick 완료', value: pickedCount, highlight: false },
    ],
  };
}

function isPickedStatus(status: string) {
  return ['PICK', 'PICKED', 'DONE', 'CONFIRMED', 'COMPLETED', 'CLOSED'].includes(status);
}

function isOpenStatus(status: string) {
  if (!status) return true;
  return !isPickedStatus(status);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingTop: 14, gap: 14, paddingBottom: 28 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modePill: {
    height: 28,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modeText: { color: '#6CAEA5', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  bellButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F05F4F',
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  hero: {
    minHeight: 218,
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.94)',
    fontSize: 14,
    lineHeight: 21,
  },
  heroRow: { marginTop: 18, flexDirection: 'row', gap: 10 },
  primaryButton: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: {
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  statsCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '700' },
  sectionHeader: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionMore: { fontSize: 13, fontWeight: '600' },
  centerCard: { alignItems: 'center', justifyContent: 'center' },
  centerCardCaption: { marginTop: 10, fontSize: 12 },
  errorTitle: { fontWeight: '700' },
  errorBody: { marginTop: 8, fontSize: 12, lineHeight: 18 },
  retryButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: { fontSize: 13, fontWeight: '700' },
  emptyTitle: { fontWeight: '700' },
  emptyBody: { marginTop: 8, fontSize: 12 },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topicPressable: { width: '48%' },
  topicCard: {
    minHeight: 148,
    marginBottom: 14,
    justifyContent: 'space-between',
  },
  topicEmoji: { fontSize: 24 },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: '800' },
  topicTitle: { marginTop: 10, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  topicSub: { marginTop: 4, fontSize: 11 },
});
