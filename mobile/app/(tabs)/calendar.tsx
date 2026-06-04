import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { agendas } from '@/src/data/mock';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

const days = Array.from({ length: 14 }, (_, i) => i + 1);

export default function CalendarScreen() {
  const t = useTokens();
  const today = 5;

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader title="캘린더" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.monthBar} lightColor="transparent" darkColor="transparent">
          <Pressable hitSlop={10}>
            <Feather name="chevron-left" size={22} color={t.colors.text} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.colors.text }}>2026년 5월</Text>
          <Pressable hitSlop={10}>
            <Feather name="chevron-right" size={22} color={t.colors.text} />
          </Pressable>
        </View>

        <View style={styles.weekRow} lightColor="transparent" darkColor="transparent">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <Text key={d} style={[styles.week, { color: t.colors.tabIconDefault }]}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid} lightColor="transparent" darkColor="transparent">
          {days.map((n) => {
            const isToday = n === today;
            const bg = isToday ? t.colors.tint : t.colors.surface;
            const txt = isToday ? t.colors.gold : t.colors.text;
            const weight: '600' | '400' = isToday ? '600' : '400';
            const fill = n === 14 ? t.colors.muted : bg;

            return (
              <View
                key={n}
                style={[
                  styles.cell,
                  {
                    backgroundColor: n === 14 ? fill : bg,
                    borderRadius: 10,
                  },
                ]}>
                <Text style={{ color: txt, fontSize: 14, fontWeight: weight }}>{n}</Text>
              </View>
            );
          })}
        </View>

        <Text style={{ fontSize: 16, fontWeight: '600', color: t.colors.text }}>다가오는 일정</Text>
        <View style={{ gap: 12 }} lightColor="transparent" darkColor="transparent">
          {agendas
            .filter((a) => a.scheduledAt)
            .slice(0, 2)
            .map((a) => (
              <Link key={a.id} href={`/calendar/${a.id}`} asChild>
                <Pressable>
                  <Card border background="surface" radius={t.radius.lg} padding={14} style={styles.eventRow}>
            <View style={[styles.dot, { backgroundColor: a.status === 'VOTING' ? t.colors.gold : t.colors.danger }]} />
                    <View style={{ flex: 1, gap: 4 }} lightColor="transparent" darkColor="transparent">
                      <Text style={{ fontSize: 15, fontWeight: '600', color: t.colors.text }} numberOfLines={1}>
                        {a.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: t.colors.tabIconDefault }} numberOfLines={1}>
                        {a.scheduledAt ? formatScheduledAt(a.scheduledAt) : ''}
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              </Link>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

function formatScheduledAt(iso: string) {
  // MVP: 펜 도안처럼 "5월 14일 · 오후 3:00"만 보여주기
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  let hour = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  const ampm = hour >= 12 ? '오후' : '오전';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${m}월 ${day}일 · ${ampm} ${hour}:${min}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekRow: { flexDirection: 'row', gap: 4 },
  week: { flex: 1, textAlign: 'center', fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: '13.8%', height: 44, alignItems: 'center', justifyContent: 'center' },
  eventRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

