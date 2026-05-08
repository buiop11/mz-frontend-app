import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

export default function MeScreen() {
  const t = useTokens();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader title="마이페이지" />

      <View style={styles.content} lightColor="transparent" darkColor="transparent">
        <Card border background="surface" radius={t.radius.lg} padding={18}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: t.colors.text }}>윤아</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: t.colors.subtext }}>커플 모드 · 2인</Text>
        </Card>

        <Card background="muted" radius={t.radius.lg} padding={18}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.text }}>설정</Text>
          <Text style={{ marginTop: 8, fontSize: 12, color: t.colors.subtext }}>
            알림, 파트너 초대(추후), 로그아웃(추후)
          </Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
});

