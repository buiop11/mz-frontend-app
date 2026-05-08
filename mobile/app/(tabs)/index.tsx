import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { agendas, categories } from '@/src/data/mock';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

export default function HomeScreen() {
  const t = useTokens();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader
        title="우리결정"
        rightIconName="bell"
        onPressRight={() => {
          // 알림 화면은 이후 추가 예정
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card
          background="surface"
          radius={t.radius.xl}
          padding={t.spacing.xl}
          style={{ backgroundColor: t.colors.tint }}>
          <Text style={[styles.heroTitle, { color: '#FFFFFF' }]}>윤아님, 이번 주 3개의 중대 의결사항이 있어요!</Text>
          <Text style={[styles.heroSub, { color: 'rgba(255,255,255,0.95)' }]}>
            후보를 스와이프해서 비교하고, 투표로 결정해요
          </Text>
          <View style={styles.heroRow} lightColor="transparent" darkColor="transparent">
            <Link href="/list" asChild>
              <Pressable
                style={StyleSheet.flatten([
                  styles.heroChip,
                  {
                    backgroundColor: '#FFFFFF',
                    borderRadius: t.radius.pill,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                  },
                ])}>
                <Text style={{ color: t.colors.text, fontSize: 13 }}>보러가기</Text>
              </Pressable>
            </Link>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: t.colors.text }]}>카테고리</Text>
        <View style={styles.catRow} lightColor="transparent" darkColor="transparent">
          {categories.map((c) => (
            <View key={c.id} style={styles.catItem} lightColor="transparent" darkColor="transparent">
              <View
                style={[
                  styles.catCircle,
                  {
                    backgroundColor: t.colors.muted,
                    borderRadius: 26,
                  },
                ]}>
                <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
              </View>
              <Text style={{ color: t.colors.subtext, fontSize: 11 }}>{c.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: t.colors.text }]}>진행 중인 안건</Text>
        <View style={styles.list} lightColor="transparent" darkColor="transparent">
          {agendas.slice(0, 2).map((a) => (
            <Link key={a.id} href={`/agenda/${a.id}`} asChild>
              <Pressable>
                <Card background="muted" radius={t.radius.lg} padding={14} style={styles.rowCard}>
                  <View style={[styles.thumb, { backgroundColor: '#C8E8D8', borderRadius: 12 }]} />
                  <View style={styles.rowRight} lightColor="transparent" darkColor="transparent">
                    <Text style={[styles.rowTitle, { color: t.colors.text }]} numberOfLines={1}>
                      {a.title}
                    </Text>
                    <Text style={[styles.rowDesc, { color: '#9A9080' }]} numberOfLines={1}>
                      {a.subtitle}
                    </Text>
                    <View style={styles.metaRow} lightColor="transparent" darkColor="transparent">
                      <Feather name="message-circle" size={14} color={t.colors.subtext} />
                      <Text style={{ color: t.colors.subtext, fontSize: 12, marginLeft: 6 }}>{a.commentCount}</Text>
                      <View style={{ width: 12 }} lightColor="transparent" darkColor="transparent" />
                      <Text style={{ color: t.colors.subtext, fontSize: 12 }}>{statusLabel(a.status)}</Text>
                    </View>
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

function statusLabel(s: typeof agendas[number]['status']) {
  switch (s) {
    case 'VOTING':
      return '투표 중';
    case 'CONFIRMED':
      return '상대 확인 완료';
    case 'PICKED':
      return '최종 결정(Pick!)';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 24 },
  heroTitle: { fontSize: 20, fontWeight: '600' },
  heroSub: { marginTop: 8, fontSize: 14 },
  heroRow: { marginTop: 12, flexDirection: 'row' },
  heroChip: { alignSelf: 'flex-start' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  catRow: { flexDirection: 'row', gap: 10 },
  catItem: { flex: 1, alignItems: 'center', gap: 6 },
  catCircle: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 12 },
  rowCard: { flexDirection: 'row', gap: 12 },
  thumb: { width: 72, height: 72 },
  rowRight: { flex: 1, gap: 6 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowDesc: { fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
});
