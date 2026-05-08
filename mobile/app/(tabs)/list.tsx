import Feather from '@expo/vector-icons/Feather';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { agendas } from '@/src/data/mock';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

export default function ListScreen() {
  const t = useTokens();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader title="안건 목록" leftIconName="chevron-left" onPressLeft={() => router.back()} />

      <View style={styles.searchWrap} lightColor="transparent" darkColor="transparent">
        <View style={[styles.searchBox, { backgroundColor: t.colors.muted, borderRadius: t.radius.md }]}>
          <Feather name="search" size={18} color={t.colors.tabIconDefault} />
          <TextInput
            placeholder="안건 검색"
            placeholderTextColor={t.colors.tabIconDefault}
            style={[styles.searchInput, { color: t.colors.text }]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {agendas.map((a) => (
          <Link key={a.id} href={`/agenda/${a.id}`} asChild>
            <Pressable>
              <Card border background="surface" radius={t.radius.lg} padding={12} style={styles.row}>
                <View style={[styles.thumb, { backgroundColor: '#C8E8D8', borderRadius: 12, opacity: a.status === 'PICKED' ? 0.4 : 1 }]} />
                <View style={styles.rowRight} lightColor="transparent" darkColor="transparent">
                  <Text style={[styles.title, { color: t.colors.text }]} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={[styles.desc, { color: '#9A9080' }]} numberOfLines={1}>
                    {a.subtitle}
                  </Text>
                </View>
              </Card>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: { height: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  content: { padding: 16, paddingTop: 12, gap: 12, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64 },
  rowRight: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 12 },
});

