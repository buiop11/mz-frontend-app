import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { getAgendaById } from '@/src/data/mock';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

export default function CalendarDetailScreen() {
  const t = useTokens();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const agenda = getAgendaById(id);

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader
        title={agenda?.scheduledAt ? titleFromIso(agenda.scheduledAt) : '일정 상세'}
        leftIconName="chevron-left"
        onPressLeft={() => router.back()}
        rightIconName="more-horizontal"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card background="muted" radius={t.radius.lg} padding={16}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.text }}>오늘의 안건</Text>
          <View style={styles.stRow} lightColor="transparent" darkColor="transparent">
            {['🐻', '⭐', '☕'].map((e) => (
              <View
                key={e}
                style={[
                  styles.sticker,
                  { backgroundColor: e === '🐻' ? '#2A5A55' : t.colors.surface, borderRadius: 12 },
                ]}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card border background="surface" radius={t.radius.lg} padding={18}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: t.colors.text }}>{agenda?.title ?? '일정'}</Text>
          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: t.colors.subtext }}>
            {agenda?.subtitle ??
              'MVP에서는 간단한 일정 카드만 제공합니다. 추후 확정된 안건을 캘린더에 자동 등록하도록 확장합니다.'}
          </Text>

          <View style={styles.meta} lightColor="transparent" darkColor="transparent">
            <View style={[styles.tag, { backgroundColor: t.colors.tint, borderRadius: t.radius.pill }]}>
              <Text style={{ color: t.colors.ctaText, fontSize: 11, fontWeight: '700' }}>알림</Text>
            </View>
            <Text style={{ color: t.colors.tabIconDefault, fontSize: 12 }}>오후 3:00 · 온라인</Text>
          </View>

          <View style={styles.actions} lightColor="transparent" darkColor="transparent">
            <Pressable style={[styles.primary, { backgroundColor: t.colors.gold, borderRadius: t.radius.md }]}>
              <Text style={{ color: t.colors.ctaText, fontSize: 15, fontWeight: '700' }}>자세히 보기</Text>
            </Pressable>
            <Pressable style={[styles.secondary, { backgroundColor: t.colors.muted, borderRadius: t.radius.md }]}>
              <Text style={{ color: t.colors.text, fontSize: 15, fontWeight: '600' }}>캘린더에 저장</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function titleFromIso(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 24 },
  stRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  sticker: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  meta: { marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  tag: { paddingVertical: 6, paddingHorizontal: 10 },
  actions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  primary: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  secondary: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
});

