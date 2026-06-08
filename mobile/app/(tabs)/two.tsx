import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { getPickTopicLogs, type PickTopicLogItem } from '@/src/api/topic';
import { useAuth } from '@/src/auth/AuthProvider';
import { useTopicsRefresh } from '@/src/topics/TopicsRefreshProvider';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

type LogViewMode = 'timeline' | 'calendar';
type CalendarCellType = 'prev' | 'current' | 'next';

type DecisionLog = {
  id: string;
  agendaId: string;
  title: string;
  pick: string;
  summary: string;
  categoryLabel: string;
  categoryColor: string;
  date: Date;
  dateKey: string;
  pickMeta: string;
};

type CalendarCell = {
  date: Date;
  dateKey: string;
  day: number;
  type: CalendarCellType;
};

const CATEGORY_COLORS: Record<string, string> = {
  wedding: '#2A5A55',
  meal: '#B08450',
  buy: '#6E5A9A',
  date: '#4F7A8A',
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function HistoryScreen() {
  const t = useTokens();
  const router = useRouter();
  const { user } = useAuth();
  const { refreshToken } = useTopicsRefresh();
  const memberSeq = user?.memberSeq;
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<LogViewMode>('timeline');
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (memberSeq == null) {
      setLogs([]);
      setLoading(false);
      setError('로그인이 필요합니다. 다시 로그인해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const pickedTopics = await getPickTopicLogs({ memberSeq });
      const nextLogs = buildDecisionLogs(pickedTopics);
      setLogs(nextLogs);
      setSelectedDateKey((prev) =>
        prev && nextLogs.some((item) => item.dateKey === prev) ? prev : null,
      );
    } catch (e: unknown) {
      console.error('[log] load picked topics failed', e);
      setLogs([]);
      setError(e instanceof Error ? e.message : '로그를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [memberSeq]);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs]),
  );

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshToken]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, DecisionLog[]>();
    for (const item of logs) {
      const bucket = map.get(item.dateKey);
      if (bucket) bucket.push(item);
      else map.set(item.dateKey, [item]);
    }
    return map;
  }, [logs]);

  const calendarCells = useMemo(() => buildCalendarCells(currentMonth), [currentMonth]);
  const selectedDayLogs = selectedDateKey ? logsByDate.get(selectedDateKey) ?? [] : [];

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
      }),
    [currentMonth],
  );

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 10, borderBottomColor: t.colors.border, backgroundColor: t.colors.surface },
        ]}>
        <Text style={[styles.topTitle, { color: t.colors.text }]}>
          Pick <Text style={{ color: t.colors.gold }}>로그</Text>
        </Text>
        <View style={[styles.toggleWrap, { borderColor: t.colors.border }]}>
          <Pressable
            onPress={() => setMode('timeline')}
            style={({ pressed }) => [
              styles.toggleButton,
              mode === 'timeline' && styles.toggleButtonActive,
              { opacity: pressed ? 0.82 : 1 },
            ]}>
            <Feather name="list" size={15} color={mode === 'timeline' ? t.colors.gold : t.colors.tabIconDefault} />
            <Text
              style={[
                styles.toggleText,
                { color: mode === 'timeline' ? t.colors.gold : t.colors.subtext },
              ]}>
              타임라인
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('calendar')}
            style={({ pressed }) => [
              styles.toggleButton,
              mode === 'calendar' && styles.toggleButtonActive,
              { opacity: pressed ? 0.82 : 1 },
            ]}>
            <Feather
              name="calendar"
              size={15}
              color={mode === 'calendar' ? t.colors.gold : t.colors.tabIconDefault}
            />
            <Text
              style={[
                styles.toggleText,
                { color: mode === 'calendar' ? t.colors.gold : t.colors.subtext },
              ]}>
              캘린더
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <Card border background="surface" radius={16} padding={18} style={styles.centerCard}>
            <ActivityIndicator color={t.colors.gold} />
            <Text style={[styles.loadingText, { color: t.colors.subtext }]}>
              Pick 로그를 불러오는 중이에요.
            </Text>
          </Card>
        ) : error ? (
          <Card border background="surface" radius={16} padding={18}>
            <Text style={[styles.errorTitle, { color: t.colors.text }]}>
              로그를 불러오지 못했어요
            </Text>
            <Text style={[styles.errorBody, { color: t.colors.subtext }]}>{error}</Text>
            <Pressable
              onPress={() => {
                void loadLogs();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                { borderColor: t.colors.border, opacity: pressed ? 0.75 : 1 },
              ]}>
              <Text style={[styles.retryButtonText, { color: t.colors.text }]}>
                다시 시도
              </Text>
            </Pressable>
          </Card>
        ) : logs.length === 0 ? (
          <Card border background="surface" radius={16} padding={20} style={styles.centerCard}>
            <Text style={[styles.emptyTitle, { color: t.colors.text }]}>
              Pick 완료된 안건이 없어요
            </Text>
            <Text style={[styles.loadingText, { color: t.colors.subtext }]}>
              완료된 안건만 로그/캘린더에 표시됩니다.
            </Text>
          </Card>
        ) : mode === 'timeline' ? (
          <View style={styles.timelineWrap} lightColor="transparent" darkColor="transparent">
            <Text style={[styles.timelineGuide, { color: t.colors.subtext }]}>
              안건을 Pick 한 날짜 최신순으로 기록돼요.
            </Text>
            {logs.map((item, index) => {
              const isLast = index === logs.length - 1;
              const showConnector = isLast === false;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/agenda/${item.agendaId}`)}
                  style={({ pressed }) => [
                    styles.timelinePressable,
                    { opacity: pressed ? 0.76 : 1, backgroundColor: pressed ? t.colors.muted : 'transparent' },
                  ]}>
                  <View style={styles.timelineItem} lightColor="transparent" darkColor="transparent">
                    <View style={styles.timelineRail} lightColor="transparent" darkColor="transparent">
                      <View style={[styles.timelineDotOuter, { backgroundColor: withAlpha(item.categoryColor, 0.24) }]}>
                        <View style={[styles.timelineDotInner, { backgroundColor: item.categoryColor }]} />
                      </View>
                      {showConnector ? <View style={[styles.timelineLine, { backgroundColor: t.colors.border }]} /> : null}
                    </View>
                    <View style={styles.timelineBody} lightColor="transparent" darkColor="transparent">
                      <Text style={[styles.timelineDate, { color: t.colors.tabIconDefault }]}>
                        {formatFullDate(item.date)}
                      </Text>
                      <Text style={[styles.timelineCategory, { color: item.categoryColor }]} numberOfLines={1}>
                        {item.categoryLabel}
                      </Text>
                      <Text style={[styles.timelineTitle, { color: t.colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.timelinePick, { color: t.colors.subtext }]} numberOfLines={1}>
                        Pick! {item.pick}
                        {item.pickMeta ? ` (${item.pickMeta})` : ''}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.calendarWrap} lightColor="transparent" darkColor="transparent">
            <View style={styles.calendarNav} lightColor="transparent" darkColor="transparent">
              <Pressable
                onPress={() => setCurrentMonth((prev) => addMonth(prev, -1))}
                style={({ pressed }) => [
                  styles.monthNavButton,
                  { borderColor: t.colors.border, opacity: pressed ? 0.75 : 1, backgroundColor: t.colors.surface },
                ]}
                accessibilityRole="button"
                accessibilityLabel="이전 달">
                <Feather name="chevron-left" size={16} color={t.colors.text} />
              </Pressable>
              <Text style={[styles.monthLabel, { color: t.colors.text }]}>{monthLabel}</Text>
              <Pressable
                onPress={() => setCurrentMonth((prev) => addMonth(prev, 1))}
                style={({ pressed }) => [
                  styles.monthNavButton,
                  { borderColor: t.colors.border, opacity: pressed ? 0.75 : 1, backgroundColor: t.colors.surface },
                ]}
                accessibilityRole="button"
                accessibilityLabel="다음 달">
                <Feather name="chevron-right" size={16} color={t.colors.text} />
              </Pressable>
            </View>

            <View style={styles.calendarGrid} lightColor="transparent" darkColor="transparent">
              {WEEKDAY_LABELS.map((day) => (
                <Text key={day} style={[styles.dayOfWeek, { color: t.colors.subtext }]}>
                  {day}
                </Text>
              ))}

              {calendarCells.map((cell) => {
                const isToday = isSameDate(cell.date, new Date());
                const isSelected = selectedDateKey === cell.dateKey;
                const events = logsByDate.get(cell.dateKey) ?? [];
                const isCurrentMonth = cell.type === 'current';
                return (
                  <Pressable
                    key={cell.dateKey}
                    onPress={() => setSelectedDateKey(cell.dateKey)}
                    style={({ pressed }) => [
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                      { opacity: pressed ? 0.82 : 1 },
                    ]}>
                    <Text
                      style={[
                        styles.calendarDayText,
                        { color: isCurrentMonth ? t.colors.text : t.colors.tabIconDefault },
                        isToday && styles.calendarTodayText,
                      ]}>
                      {cell.day}
                    </Text>
                    {events.length > 0 ? (
                      <View style={styles.eventDots} lightColor="transparent" darkColor="transparent">
                        {events.slice(0, 3).map((ev) => (
                          <View key={`${cell.dateKey}-${ev.id}`} style={[styles.eventDot, { backgroundColor: ev.categoryColor }]} />
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Card border background="surface" radius={16} padding={14} style={styles.dayCard}>
              <Text style={[styles.dayCardTitle, { color: t.colors.subtext }]}>
                {selectedDateKey ? `${formatDateLabel(selectedDateKey)}의 결정` : '날짜를 선택해 로그를 확인하세요'}
              </Text>
              {renderDayCardContent({
                selectedDateKey,
                selectedDayLogs,
                emptyColor: t.colors.tabIconDefault,
                  accentColor: t.colors.gold,
                borderColor: t.colors.border,
                textColor: t.colors.text,
                subColor: t.colors.subtext,
                onPressLog: (agendaId) => router.push(`/agenda/${agendaId}`),
              })}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function buildDecisionLogs(items: PickTopicLogItem[]): DecisionLog[] {
  const now = new Date();
  const logs = items.map((topic, idx) => {
    const date = parseTopicDate(topic, now, idx);
    const chosen = pickLabelFromTopic(topic);
    const categoryLabel = topic.categoryName?.trim() || '기타';
    const categoryColor = resolveCategoryColor(topic.categoryName);
    const summary = buildTimelineSummary(topic, chosen);
    const pickMeta = buildPickMeta(topic);

    return {
      id: `${topic.topicSeq}-${formatDateKey(date)}`,
      agendaId: String(topic.topicSeq),
      title: topic.title,
      pick: chosen,
      summary,
      categoryLabel,
      categoryColor,
      date,
      dateKey: formatDateKey(date),
      pickMeta,
    };
  });

  return logs.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function parseTopicDate(topic: PickTopicLogItem, baseDate: Date, index: number): Date {
  // 타임라인·캘린더 상단 날짜는 Pick 일정(pickDate)이 아니라 실제 결정 시각(updateDt) 기준.
  const fromUpdate = parseIsoDate(topic.updateDt);
  if (fromUpdate) return fromUpdate;
  const fromPick = parseIsoDate(topic.pickDate);
  if (fromPick) return fromPick;
  const fallback = new Date(baseDate);
  fallback.setDate(baseDate.getDate() - index);
  return fallback;
}

function parseIsoDate(raw?: string): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pickLabelFromTopic(topic: PickTopicLogItem): string {
  const byName = topic.candidateName?.trim();
  if (byName) return stripMetaSuffix(byName);
  return '최종 선택 완료';
}

function buildTimelineSummary(topic: PickTopicLogItem, pickLabel: string): string {
  if (topic.candidateInfo?.trim()) return topic.candidateInfo.trim();
  return pickLabel;
}

function buildPickMeta(topic: PickTopicLogItem): string {
  if (typeof topic.candidatePrice === 'number' && Number.isFinite(topic.candidatePrice)) {
    return `${formatPrice(topic.candidatePrice)}원`;
  }
  if (topic.pickDate) {
    const d = parseIsoDate(topic.pickDate);
    if (d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}.${m}.${day}`;
    }
  }
  return '';
}

function formatPrice(value: number): string {
  return value.toLocaleString('ko-KR');
}

function stripMetaSuffix(text: string): string {
  // 후보명에 가격/날짜가 섞여 내려오는 경우 하단 메타(price/pickDate)와 중복되지 않게 제거한다.
  return text.replace(/\s*\((?:[\d,]+원|20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})\)\s*$/u, '').trim();
}

function resolveCategoryColor(categoryName?: string): string {
  const name = (categoryName ?? '').toLowerCase();
  if (name.includes('웨딩')) return CATEGORY_COLORS.wedding;
  if (name.includes('식사')) return CATEGORY_COLORS.meal;
  if (name.includes('구매')) return CATEGORY_COLORS.buy;
  if (name.includes('데이트')) return CATEGORY_COLORS.date;
  return '#6D6A65';
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonth(date: Date, diff: number) {
  return new Date(date.getFullYear(), date.getMonth() + diff, 1);
}

function buildCalendarCells(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekDay = firstDay.getDay();
  const startDate = new Date(year, month, 1 - firstWeekDay);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateKey = formatDateKey(date);
    let type: CalendarCellType = 'current';
    if (date.getMonth() < month || date.getFullYear() < year) type = 'prev';
    if (date.getMonth() > month || date.getFullYear() > year) type = 'next';
    cells.push({ date, dateKey, day: date.getDate(), type });
  }

  return cells;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatFullDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function formatDateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return hex;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function renderDayCardContent({
  selectedDateKey,
  selectedDayLogs,
  emptyColor,
  accentColor,
  borderColor,
  textColor,
  subColor,
  onPressLog,
}: Readonly<{
  selectedDateKey: string | null;
  selectedDayLogs: DecisionLog[];
  emptyColor: string;
  accentColor: string;
  borderColor: string;
  textColor: string;
  subColor: string;
  onPressLog: (agendaId: string) => void;
}>) {
  if (selectedDateKey == null) {
    return <Text style={[styles.dayCardEmpty, { color: emptyColor }]}>캘린더에서 날짜를 선택해 주세요.</Text>;
  }
  if (selectedDayLogs.length === 0) {
    return <Text style={[styles.dayCardEmpty, { color: emptyColor }]}>결정한 안건이 없어요.</Text>;
  }
  return (
    <View style={styles.dayLogList} lightColor="transparent" darkColor="transparent">
      {selectedDayLogs.map((ev) => (
        <Pressable
          key={ev.id}
          onPress={() => onPressLog(ev.agendaId)}
          style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}>
          <View style={[styles.dayLogItem, { borderColor }]} lightColor="transparent" darkColor="transparent">
            <View style={[styles.dayLogDot, { backgroundColor: ev.categoryColor }]} />
            <View style={styles.dayLogInfo} lightColor="transparent" darkColor="transparent">
              <Text style={[styles.dayLogTitle, { color: textColor }]} numberOfLines={1}>
                {ev.title}
              </Text>
              <Text style={[styles.dayLogSub, { color: subColor }]} numberOfLines={1}>
                <Text style={{ color: accentColor }}>Pick! </Text>
                {ev.pick}
                {ev.pickMeta ? ` (${ev.pickMeta})` : ''}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={emptyColor} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  toggleWrap: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    backgroundColor: '#252525',
  },
  toggleButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#2A5A55',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  centerCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  errorBody: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  timelineWrap: { gap: 6 },
  timelineGuide: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  timelinePressable: {
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    width: 26,
    alignItems: 'center',
    paddingTop: 2,
  },
  timelineDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineLine: {
    width: 1,
    flex: 1,
    marginTop: 4,
    minHeight: 42,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineCategory: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  timelineTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  timelinePick: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  calendarWrap: { gap: 12 },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayOfWeek: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  calendarDay: {
    width: '14.28%',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDaySelected: {
    backgroundColor: '#2A5A55',
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  calendarTodayText: {
    color: '#D4B483',
    fontWeight: '800',
  },
  eventDots: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    gap: 3,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  dayCard: { marginTop: 4 },
  dayCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  dayCardEmpty: {
    fontSize: 13,
    paddingVertical: 10,
    textAlign: 'center',
  },
  dayLogList: { gap: 8 },
  dayLogItem: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 9,
  },
  dayLogDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  dayLogInfo: { flex: 1 },
  dayLogTitle: { fontSize: 13, fontWeight: '700' },
  dayLogSub: { marginTop: 2, fontSize: 11 },
});
