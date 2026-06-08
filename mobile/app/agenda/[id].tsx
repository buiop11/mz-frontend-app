import Feather from '@expo/vector-icons/Feather';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  useWindowDimensions,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import {
  Candidate,
  formatCandidatePriceOrDate,
  getCandidateList,
  pickCandidateBySeq,
} from '@/src/api/candidate';
import { Comment, createComment, getCommentList } from '@/src/api/comment';
import {
  getTopicDetail,
  isPickStatus,
  revertTopicPick,
  type TopicDetail,
} from '@/src/api/topic';
import { useAuth } from '@/src/auth/AuthProvider';
import { useTopicsRefresh } from '@/src/topics/TopicsRefreshProvider';

const PICK_COLOR = '#D4B483';
const PICK_DONE = '#2A5A55';
const CARD_BACKGROUNDS = ['#223331', '#2A2A34', '#342E24', '#262626'];

export default function AgendaDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { bumpTopicsRefresh } = useTopicsRefresh();
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

  const pageWidth = screenWidth;
  const carouselRef = useRef<ScrollView>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [pickedSeq, setPickedSeq] = useState<number | null>(null);
  const [pickOverlay, setPickOverlay] = useState(false);
  const [pickTargetSeq, setPickTargetSeq] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [commentsByCandidate, setCommentsByCandidate] = useState<Record<number, Comment[]>>({});
  const [draftByCandidate, setDraftByCandidate] = useState<Record<number, string>>({});
  const [commentLoadingSeq, setCommentLoadingSeq] = useState<number | null>(null);

  const loadCommentsFor = useCallback(
    async (candidateSeq: number) => {
      if (memberSeq == null) return;
      setCommentLoadingSeq(candidateSeq);
      try {
        const list = await getCommentList({ memberSeq, candidateSeq, currentPage: 1 });
        setCommentsByCandidate((prev) => ({ ...prev, [candidateSeq]: list }));
      } catch {
        setCommentsByCandidate((prev) => ({ ...prev, [candidateSeq]: prev[candidateSeq] ?? [] }));
      } finally {
        setCommentLoadingSeq((prev) => (prev === candidateSeq ? null : prev));
      }
    },
    [memberSeq],
  );

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
      setTopicDetail(detail);
      const fixed = list.find((c) => c.fixed);
      const decided =
        detail?.pickedCandidateSeq ??
        (fixed?.candidateSeq ?? null) ??
        (detail?.candidateSeq ? Number(detail.candidateSeq) : null);
      setPickedSeq(
        decided != null && Number.isFinite(decided) && decided > 0 ? decided : null,
      );
      setIndex(0);
      setCommentsByCandidate({});
      setDraftByCandidate({});
      carouselRef.current?.scrollTo({ x: 0, animated: false });
      await Promise.all(list.map((c) => loadCommentsFor(c.candidateSeq)));
    } catch (e: unknown) {
      setCandidates([]);
      setError(e instanceof Error ? e.message : '후보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [memberSeq, topicSeq, loadCommentsFor]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openCandidateEdit = useCallback(
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

  const openCandidateCreate = useCallback(() => {
    router.push({
      pathname: '/candidate/edit',
      params: { topicSeq: String(topicSeq) },
    });
  }, [router, topicSeq]);

  const current = candidates[index] ?? null;
  const currentCandidateSeq = current?.candidateSeq ?? null;
  const total = candidates.length;

  const topicVotingComplete = useMemo(() => {
    if (topicDetail?.status && isPickStatus(topicDetail.status)) return true;
    if (topicDetail?.tag && /pick/i.test(topicDetail.tag)) return true;
    return candidates.some((c) => c.fixed);
  }, [topicDetail, candidates]);

  const decidedCandidateSeq = useMemo(() => {
    if (topicDetail?.pickedCandidateSeq) return topicDetail.pickedCandidateSeq;
    if (pickedSeq != null) return pickedSeq;
    return candidates.find((c) => c.fixed)?.candidateSeq ?? null;
  }, [topicDetail, pickedSeq, candidates]);

  const isPickedCurrent =
    currentCandidateSeq != null && decidedCandidateSeq === currentCandidateSeq;

  const topSub = useMemo(() => {
    if (categoryName.trim()) return categoryName.trim();
    return total > 0 ? `후보 ${total}건` : '후보 비교';
  }, [categoryName, total]);

  const syncIndexFromOffset = useCallback(
    (x: number) => {
      const next = Math.round(x / pageWidth);
      if (next >= 0 && next < total) setIndex(next);
    },
    [pageWidth, total],
  );

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return;
      setIndex(next);
      carouselRef.current?.scrollTo({ x: next * pageWidth, animated: true });
    },
    [total, pageWidth],
  );

  const onCarouselScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncIndexFromOffset(e.nativeEvent.contentOffset.x);
    },
    [syncIndexFromOffset],
  );

  const onCarouselScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncIndexFromOffset(e.nativeEvent.contentOffset.x);
    },
    [syncIndexFromOffset],
  );

  const openPickOverlay = () => {
    if (currentCandidateSeq == null) return;
    setPickTargetSeq(currentCandidateSeq);
    setPickOverlay(true);
  };

  const handleUndoDecision = useCallback(() => {
    if (memberSeq == null) {
      Alert.alert('되돌리기 실패', '로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      return;
    }
    if (!Number.isFinite(topicSeq) || topicSeq <= 0) return;

    const runRevert = async () => {
      setReverting(true);
      try {
        await revertTopicPick({ memberSeq, topicSeq });
        bumpTopicsRefresh();
        await load();
      } catch (e: unknown) {
        Alert.alert(
          '되돌리기 실패',
          e instanceof Error ? e.message : '결정 되돌리기에 실패했어요.',
        );
      } finally {
        setReverting(false);
      }
    };

    const message = '최종 결정을 되돌릴까요? 다시 투표할 수 있어요.';

    if (Platform.OS === 'web') {
      const ok = globalThis.confirm?.(message);
      if (ok) {
        void runRevert();
      }
      return;
    }

    Alert.alert('결정 되돌리기', message, [
      { text: '취소', style: 'cancel' },
      {
        text: '되돌리기',
        style: 'destructive',
        onPress: () => {
          void runRevert();
        },
      },
    ]);
  }, [bumpTopicsRefresh, load, memberSeq, topicSeq]);

  const confirmPick = async () => {
    if (memberSeq == null || pickTargetSeq == null) return;
    setPicking(true);
    try {
      await pickCandidateBySeq(pickTargetSeq);
      bumpTopicsRefresh();
      setPickedSeq(pickTargetSeq);
      setCandidates((prev) =>
        prev.map((c) => ({ ...c, fixed: c.candidateSeq === pickTargetSeq })),
      );
      setPickOverlay(false);
      setPickTargetSeq(null);
      setTopicDetail((prev) =>
        prev
          ? {
              ...prev,
              status: 'PICK',
              tag: 'Pick!',
              pickedCandidateSeq: pickTargetSeq,
              candidateSeq: String(pickTargetSeq),
            }
          : prev,
      );
    } catch (e: unknown) {
      Alert.alert(
        'Pick 실패',
        e instanceof Error ? e.message : 'Pick 처리에 실패했어요.',
      );
    } finally {
      setPicking(false);
    }
  };

  const pickTargetName =
    candidates.find((c) => c.candidateSeq === pickTargetSeq)?.name ?? current?.name ?? '이 후보';

  const openLink = async (url: string | null) => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('링크', '페이지를 열 수 없어요.');
    }
  };

  const setDraft = (candidateSeq: number, text: string) => {
    setDraftByCandidate((prev) => ({ ...prev, [candidateSeq]: text }));
  };

  const addComment = async (candidateSeq: number) => {
    const text = (draftByCandidate[candidateSeq] ?? '').trim();
    if (!text || memberSeq == null) return;

    try {
      const created = await createComment({ memberSeq, candidateSeq, content: text });
      setCommentsByCandidate((prev) => ({
        ...prev,
        [candidateSeq]: [...(prev[candidateSeq] ?? []), created],
      }));
      setDraft(candidateSeq, '');
    } catch {
      const fallback: Comment = {
        commentSeq: Date.now(),
        candidateSeq,
        memberSeq,
        authorName: user?.name ?? '나',
        content: text,
      };
      setCommentsByCandidate((prev) => ({
        ...prev,
        [candidateSeq]: [...(prev[candidateSeq] ?? []), fallback],
      }));
      setDraft(candidateSeq, '');
    }
  };

  if (!Number.isFinite(topicSeq) || topicSeq <= 0) {
    return (
      <View style={styles.root}>
        <ScreenTopBar
          title="안건 상세"
          sub=""
          indexLabel=""
          onBack={() => router.back()}
          topInset={insets.top}
        />
        <RNView style={styles.center}>
          <Text>잘못된 안건 번호입니다.</Text>
        </RNView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenTopBar
        title={topicTitle}
        sub={topSub}
        indexLabel={total > 0 ? `${index + 1} / ${total}` : ''}
        onBack={() => router.back()}
        topInset={insets.top}
      />

      <RNView style={styles.navRow}>
        <Text style={styles.navCount}>
          등록된 후보 <Text style={styles.navCountStrong}>{loading ? '…' : total}</Text>건
        </Text>
        <RNView style={styles.navBtns}>
          <Pressable
            onPress={() => goTo(index - 1)}
            disabled={index <= 0 || total === 0}
            style={({ pressed }) => [
              styles.navBtn,
              (index <= 0 || total === 0) && styles.navBtnDisabled,
              { opacity: pressed ? 0.75 : 1 },
            ]}>
            <Text style={styles.navBtnText}>‹ 이전</Text>
          </Pressable>
          <Pressable
            onPress={() => goTo(index + 1)}
            disabled={index >= total - 1 || total === 0}
            style={({ pressed }) => [
              styles.navBtn,
              (index >= total - 1 || total === 0) && styles.navBtnDisabled,
              { opacity: pressed ? 0.75 : 1 },
            ]}>
            <Text style={styles.navBtnText}>다음 ›</Text>
          </Pressable>
          <Pressable
            onPress={openCandidateCreate}
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <Feather name="plus" size={13} color="#121212" />
            <Text style={styles.addBtnText}>후보 추가</Text>
          </Pressable>
        </RNView>
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
          <Text style={styles.hint}>후보 추가 버튼으로 첫 후보를 등록해보세요.</Text>
        </RNView>
      ) : (
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled>
          <RNView style={styles.voteBar}>
            <Text style={styles.voteTitle}>참여자 투표 현황</Text>
            <RNView style={styles.voteMember}>
              <RNView style={[styles.voteAvatar, { backgroundColor: '#2A5A55' }]}>
                <Text style={styles.voteAvatarText}>나</Text>
              </RNView>
              <Text style={styles.voteName}>{user?.name ?? '나'}</Text>
              <RNView
                style={[
                  styles.voteStatus,
                  decidedCandidateSeq != null ? styles.voteDone : styles.voteWait,
                ]}>
                <Text
                  style={[
                    styles.voteStatusText,
                    decidedCandidateSeq != null ? styles.voteDoneText : styles.voteWaitText,
                  ]}>
                  {decidedCandidateSeq != null ? '투표완료' : '미투표'}
                </Text>
              </RNView>
            </RNView>
          </RNView>

          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            snapToInterval={pageWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            scrollEventThrottle={16}
            onScroll={onCarouselScroll}
            onMomentumScrollEnd={onCarouselScrollEnd}
            style={[
              styles.carousel,
              Platform.OS === 'web' ? ({ overflow: 'scroll' } as const) : null,
            ]}
            contentContainerStyle={styles.carouselContent}>
            {candidates.map((item, itemIndex) => {
              const seq = item.candidateSeq;
              return (
                <RNView key={seq} style={[styles.slidePage, { width: pageWidth }]}>
                  <RNView style={styles.slideSheet}>
                    <CandidateCard
                      candidate={item}
                      bg={CARD_BACKGROUNDS[itemIndex % CARD_BACKGROUNDS.length]}
                      onOpenLink={() => openLink(item.linkUrl)}
                      onEdit={() => openCandidateEdit(seq)}
                      showTitlePickBadge={
                        topicVotingComplete && seq === decidedCandidateSeq
                      }
                    />
                    <CandidateComments
                      embedded
                      comments={commentsByCandidate[seq] ?? []}
                      loading={commentLoadingSeq === seq}
                      draft={draftByCandidate[seq] ?? ''}
                      onChangeDraft={(t) => setDraft(seq, t)}
                      onSend={() => addComment(seq)}
                    />
                  </RNView>
                </RNView>
              );
            })}
          </ScrollView>

          <RNView style={styles.slideFooter}>
            {total > 1 ? (
              <RNView style={styles.dotsRow}>
                {candidates.map((c, i) => (
                  <RNView key={c.candidateSeq} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
              </RNView>
            ) : null}
            <RNView style={styles.swipeHint}>
              <Feather name="chevrons-left" size={13} color="#888780" />
              <Text style={styles.swipeHintText}>카드를 좌우로 스와이프해 후보를 비교해요</Text>
            </RNView>
          </RNView>
        </ScrollView>
      )}

      {total > 0 && current ? (
        <RNView style={[styles.bottomBtns, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {topicVotingComplete ? (
            <Pressable
              onPress={handleUndoDecision}
              disabled={reverting}
              style={({ pressed }) => [
                styles.btnHold,
                styles.bottomBtnFull,
                { opacity: pressed || reverting ? 0.85 : 1 },
              ]}>
              {reverting ? (
                <ActivityIndicator color="#E8E4DC" size="small" />
              ) : (
                <Text style={styles.btnHoldText}>결정 되돌리기</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={openPickOverlay}
              disabled={picking || currentCandidateSeq == null}
              style={({ pressed }) => [
                styles.btnPick,
                styles.bottomBtnFull,
                isPickedCurrent && { backgroundColor: PICK_DONE },
                { opacity: pressed || picking ? 0.9 : 1 },
              ]}>
              <Feather name={isPickedCurrent ? 'check' : 'heart'} size={16} color="#fff" />
              <Text style={styles.btnPickText}>
                {isPickedCurrent ? 'Pick됨 ✓' : '이걸로 Pick!'}
              </Text>
            </Pressable>
          )}
        </RNView>
      ) : null}

      <Modal visible={pickOverlay} transparent animationType="fade" onRequestClose={() => setPickOverlay(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickOverlay(false)}>
          <Pressable style={styles.overlayCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.overlayEmoji}>🎉</Text>
            <Text style={styles.overlayTitle}>Pick! 결정</Text>
            <Text style={styles.overlaySub}>
              <Text style={{ fontWeight: '700' }}>{pickTargetName}</Text>
              로{'\n'}최종 결정할까요?
            </Text>
            <RNView style={styles.overlayMetaBox}>
              <Text style={styles.overlayMeta}>
                후보 {index + 1} / {total} · candidateSeq: {pickTargetSeq ?? '-'}
              </Text>
            </RNView>
            <RNView style={styles.overlayBtns}>
              <Pressable
                onPress={() => setPickOverlay(false)}
                disabled={picking}
                style={({ pressed }) => [styles.ovCancel, { opacity: pressed ? 0.85 : 1 }]}>
                <Text style={styles.ovCancelText}>돌려주기</Text>
              </Pressable>
              <Pressable
                onPress={confirmPick}
                disabled={picking}
                style={({ pressed }) => [styles.ovConfirm, { opacity: pressed || picking ? 0.9 : 1 }]}>
                {picking ? (
                  <ActivityIndicator color="#121212" size="small" />
                ) : (
                  <Text style={styles.ovConfirmText}>확인</Text>
                )}
              </Pressable>
            </RNView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ScreenTopBar({
  title,
  sub,
  indexLabel,
  onBack,
  topInset,
}: Readonly<{
  title: string;
  sub: string;
  indexLabel: string;
  onBack: () => void;
  topInset: number;
}>) {
  return (
    <RNView style={[styles.topbar, { paddingTop: topInset + 10 }]}>
      <Pressable onPress={onBack} style={styles.topbarBack} hitSlop={8}>
        <Feather name="chevron-left" size={20} color="#63635E" />
      </Pressable>
      <RNView style={styles.topbarInfo}>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.topbarSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </RNView>
      {indexLabel ? <Text style={styles.topbarIdx}>{indexLabel}</Text> : null}
    </RNView>
  );
}

function CandidateCard({
  candidate,
  bg,
  onOpenLink,
  onEdit,
  showTitlePickBadge,
}: Readonly<{
  candidate: Candidate;
  bg: string;
  onOpenLink: () => void;
  onEdit: () => void;
  showTitlePickBadge: boolean;
}>) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = candidate.imageUrl && !imgFailed;

  return (
    <RNView style={styles.candidateCard}>
      <RNView style={[styles.imgArea, { backgroundColor: bg }]}>
        {showImage ? (
          <Image
            source={{ uri: candidate.imageUrl! }}
            style={styles.candidateImage}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Feather name="shopping-bag" size={40} color="#9FE1CB" />
        )}
      </RNView>

      <RNView style={styles.cardBody}>
        <RNView style={styles.candTitleRow}>
          <Text style={[styles.candName, styles.candNameFlex]} numberOfLines={2}>
            {candidate.name}
          </Text>
          <RNView style={styles.candTitleActions}>
            {showTitlePickBadge ? (
              <RNView style={styles.titlePickBadge}>
                <Text style={styles.titlePickBadgeText}>Pick!</Text>
              </RNView>
            ) : null}
            <Pressable
              onPress={onEdit}
              hitSlop={8}
              style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.82 : 1 }]}>
              <Feather name="edit-2" size={12} color="#D4B483" />
              <Text style={styles.editBtnText}>수정</Text>
            </Pressable>
          </RNView>
        </RNView>
        <Text style={styles.candPrice}>{formatCandidatePriceOrDate(candidate)}</Text>

        {candidate.linkUrl ? (
          <Pressable
            onPress={onOpenLink}
            style={({ pressed }) => [styles.infoRow, { opacity: pressed ? 0.85 : 1 }]}>
            <Feather name="link" size={14} color="#D4B483" />
            <Text style={styles.infoRowText}>링크에서 자세히 보기</Text>
            <Feather name="external-link" size={14} color="#D4B483" />
          </Pressable>
        ) : null}

        <RNView style={[styles.detailBox, !candidate.info && styles.detailBoxEmpty]}>
          <Text style={styles.detailLabel}>상세 정보</Text>
          <Text style={styles.detailText}>
            {candidate.info?.trim() ? candidate.info : '등록된 상세 정보가 없어요.'}
          </Text>
        </RNView>
      </RNView>
    </RNView>
  );
}

function CandidateComments({
  comments,
  loading,
  draft,
  onChangeDraft,
  onSend,
  embedded = false,
}: Readonly<{
  comments: Comment[];
  loading: boolean;
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  embedded?: boolean;
}>) {
  return (
    <RNView style={[styles.commentBlock, embedded && styles.commentBlockEmbedded]}>
      <RNView style={[styles.commentSection, embedded && styles.commentSectionEmbedded]}>
        <RNView style={styles.commentHeader}>
          <Text style={styles.commentLabel}>댓글</Text>
          <RNView style={styles.commentCountBadge}>
            <Text style={styles.commentCountText}>{comments.length}개</Text>
          </RNView>
        </RNView>
        {loading ? (
          <ActivityIndicator color={PICK_DONE} style={{ marginVertical: 8 }} />
        ) : comments.length === 0 ? (
          <Text style={styles.commentEmpty}>아직 댓글이 없어요.</Text>
        ) : (
          comments.map((c) => (
            <RNView key={c.commentSeq} style={styles.commentItem}>
              <RNView style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{c.authorName.slice(0, 1)}</Text>
              </RNView>
              <RNView style={styles.commentBody}>
                <Text style={styles.commentAuthor}>{c.authorName}</Text>
                <Text style={styles.commentText}>{c.content}</Text>
              </RNView>
            </RNView>
          ))
        )}
      </RNView>

      <RNView style={[styles.commentInputRow, embedded && styles.commentInputRowEmbedded]}>
        <TextInput
          value={draft}
          onChangeText={onChangeDraft}
          placeholder="댓글 남기기..."
          placeholderTextColor="#888780"
          style={styles.commentInput}
          returnKeyType="send"
          onSubmitEditing={onSend}
        />
        <Pressable
          onPress={onSend}
          style={({ pressed }) => [styles.commentSend, { opacity: pressed ? 0.85 : 1 }]}>
          <Feather name="send" size={15} color="#fff" />
        </Pressable>
      </RNView>
    </RNView>
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
  topbarIdx: { fontSize: 12, color: '#D4B483' },
  navRow: {
    backgroundColor: '#121212',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2F2F2F',
  },
  navCount: { fontSize: 12, color: '#BDBDBD' },
  navCountStrong: { fontWeight: '700', color: '#D4B483' },
  navBtns: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    backgroundColor: '#1E1E1E',
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontSize: 12, fontWeight: '600', color: '#F2F2F2' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: PICK_COLOR,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#121212' },
  voteBar: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#1E1E1E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    padding: 12,
    borderRadius: 12,
  },
  voteTitle: { fontSize: 11, fontWeight: '600', color: '#BDBDBD', marginBottom: 8 },
  voteMember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    backgroundColor: '#252525',
  },
  voteAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteAvatarText: { fontSize: 10, fontWeight: '700', color: '#D4B483' },
  voteName: { fontSize: 12, color: '#F2F2F2' },
  voteStatus: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  voteDone: { backgroundColor: '#1F3C39' },
  voteWait: { backgroundColor: '#252525' },
  voteStatusText: { fontSize: 11, fontWeight: '600' },
  voteDoneText: { color: '#D4B483' },
  voteWaitText: { color: '#BDBDBD' },
  mainScroll: { flex: 1 },
  mainScrollContent: { paddingBottom: 16 },
  carousel: { flexGrow: 0 },
  carouselContent: { alignItems: 'flex-start' },
  slidePage: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  slideSheet: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    overflow: 'hidden',
  },
  slideFooter: {
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: '#121212',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(43,36,34,0.2)',
  },
  dotActive: { backgroundColor: PICK_COLOR, width: 16 },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  swipeHintText: { fontSize: 11, color: '#888780' },
  commentBlock: { marginTop: 10 },
  commentBlockEmbedded: { marginTop: 0 },
  commentSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
  },
  commentSectionEmbedded: {
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2F2F2F',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentLabel: { fontSize: 11, fontWeight: '600', color: '#D4B483' },
  commentCountBadge: {
    backgroundColor: '#252525',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  commentCountText: { fontSize: 11, color: '#BDBDBD' },
  commentEmpty: { fontSize: 12, color: '#BDBDBD' },
  commentItem: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2F2F2F',
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A5A55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 11, fontWeight: '700', color: '#D4B483' },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 11, color: '#BDBDBD', marginBottom: 2 },
  commentText: { fontSize: 13, color: '#F2F2F2', lineHeight: 18 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  commentInputRowEmbedded: {
    marginTop: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    backgroundColor: '#1E1E1E',
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 13,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    backgroundColor: '#252525',
    color: '#F2F2F2',
  },
  commentSend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A5A55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBtns: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: '#121212',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2F2F2F',
  },
  bottomBtnFull: { flex: 1 },
  btnHold: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
  },
  btnHoldText: { fontSize: 14, fontWeight: '600', color: '#F2F2F2' },
  btnPick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PICK_COLOR,
  },
  btnPickText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  candidateCard: {
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
  },
  imgArea: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  candidateImage: { width: '100%', height: '100%' },
  cardBody: { padding: 14 },
  candTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  candName: { fontSize: 16, fontWeight: '700', color: '#F2F2F2' },
  candNameFlex: { flex: 1 },
  candTitleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3E3A31',
    backgroundColor: '#252525',
  },
  editBtnText: { fontSize: 11, fontWeight: '700', color: '#D4B483' },
  titlePickBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#D4B483',
  },
  titlePickBadgeText: { fontSize: 11, fontWeight: '800', color: '#121212' },
  candPrice: { fontSize: 15, fontWeight: '600', color: PICK_COLOR, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#252525',
    borderRadius: 12,
    marginBottom: 8,
  },
  infoRowText: { flex: 1, fontSize: 13, color: '#F2F2F2' },
  detailBox: {
    backgroundColor: '#252525',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 0,
  },
  detailBoxEmpty: { opacity: 0.85 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: '#D4B483', marginBottom: 4 },
  detailText: { fontSize: 13, color: '#F2F2F2', lineHeight: 20 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  overlayEmoji: { fontSize: 36, marginBottom: 10 },
  overlayTitle: { fontSize: 18, fontWeight: '600', color: '#2B2422', marginBottom: 6 },
  overlaySub: {
    fontSize: 13,
    color: '#63635E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  overlayMetaBox: {
    width: '100%',
    backgroundColor: '#252525',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  overlayMeta: {
    fontSize: 12,
    color: '#63635E',
    textAlign: 'center',
    lineHeight: 18,
  },
  overlayBtns: { flexDirection: 'row', gap: 8, width: '100%' },
  ovCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D3D1CC',
    alignItems: 'center',
  },
  ovCancelText: { fontSize: 13, color: '#2B2422' },
  ovConfirm: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: PICK_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  ovConfirmText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
