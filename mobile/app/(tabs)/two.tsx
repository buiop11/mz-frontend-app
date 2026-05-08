import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { agendas } from '@/src/data/mock';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

export default function HistoryScreen() {
  const t = useTokens();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader title="결정 히스토리" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {agendas
          .filter((a) => a.status === 'PICKED')
          .map((a) => (
            <Link key={a.id} href={`/agenda/${a.id}`} asChild>
              <Pressable>
                <Card border background="surface" radius={t.radius.lg} padding={16}>
                  <Text style={{ fontSize: 12, color: t.colors.tabIconDefault }}>2026-05-01</Text>
                  <Text style={{ marginTop: 6, fontSize: 16, fontWeight: '600', color: t.colors.text }}>
                    {a.title} · Pick!
                  </Text>
                  <Text style={{ marginTop: 6, fontSize: 12, color: t.colors.subtext }} numberOfLines={2}>
                    당시 후보들을 비교하고, 투표로 최종 결정했어요.
                  </Text>
                </Card>
              </Pressable>
            </Link>
          ))}

        <Card background="muted" radius={t.radius.lg} padding={16}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.text }}>추억 저장</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: t.colors.subtext }}>
            (MVP) 상세 화면에서 후보/대화 기록을 확인할 수 있게 확장 예정입니다.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
});
