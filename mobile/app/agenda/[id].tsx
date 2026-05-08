import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { getAgendaById } from '@/src/data/mock';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

export default function AgendaDetailScreen() {
  const t = useTokens();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const agenda = getAgendaById(id);

  if (!agenda) {
    return (
      <View style={[styles.root, { backgroundColor: t.colors.background }]}>
        <AppHeader title="상세" leftIconName="chevron-left" onPressLeft={() => router.back()} />
        <View style={styles.empty} lightColor="transparent" darkColor="transparent">
          <Text style={{ color: t.colors.text }}>존재하지 않는 안건입니다.</Text>
        </View>
      </View>
    );
  }

  const candidate = agenda.candidates[0];

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader
        title="안건 상세"
        leftIconName="chevron-left"
        onPressLeft={() => router.back()}
        rightIconName="share-2"
        onPressRight={() => {
          // 공유는 이후 연결
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.image,
            {
              backgroundColor: t.colors.muted,
              borderRadius: t.radius.xl,
            },
          ]}>
          {candidate.badgeText ? (
            <View style={[styles.badge, { backgroundColor: t.colors.tint, borderRadius: t.radius.pill }]}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{candidate.badgeText}</Text>
            </View>
          ) : null}
        </View>

        <Text style={{ fontSize: 22, fontWeight: '600', color: t.colors.text }}>{candidate.title}</Text>

        <View style={styles.priceRow} lightColor="transparent" darkColor="transparent">
          {candidate.priceText ? (
            <Text style={{ fontSize: 20, fontWeight: '600', color: t.colors.danger }}>{candidate.priceText}</Text>
          ) : null}
          <Text style={{ fontSize: 12, color: t.colors.subtext }}>무료배송</Text>
        </View>

        {candidate.description ? (
          <Text style={{ fontSize: 14, lineHeight: 20, color: t.colors.subtext }}>{candidate.description}</Text>
        ) : null}

        <View style={styles.metaRow} lightColor="transparent" darkColor="transparent">
          <Card background="muted" radius={8} padding={10}>
            <Text style={{ fontSize: 12, color: t.colors.text }}>후보 {agenda.candidates.length}개</Text>
          </Card>
          <Card background="muted" radius={8} padding={10}>
            <Text style={{ fontSize: 12, color: t.colors.text }}>댓글 {agenda.commentCount}</Text>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.cta, { backgroundColor: t.colors.background }]}>
        <Pressable style={[styles.wish, { backgroundColor: t.colors.surface, borderRadius: 14, borderColor: t.colors.border, borderWidth: 1 }]}>
          <Feather name="heart" size={22} color={t.colors.danger} />
        </Pressable>
        <Pressable style={[styles.primary, { backgroundColor: t.colors.text, borderRadius: 14 }]}>
          <Text style={{ color: t.colors.surface, fontSize: 16, fontWeight: '600' }}>투표하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 280, overflow: 'hidden' },
  badge: { position: 'absolute', left: 16, top: 16, paddingHorizontal: 12, paddingVertical: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', gap: 8 },
  cta: {
    height: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wish: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  primary: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
});

