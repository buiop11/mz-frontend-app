import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';
import { useAuth } from '@/src/auth/AuthProvider';

export default function MeScreen() {
  const t = useTokens();
  const router = useRouter();
  const { user, logout } = useAuth();

  const onPressLogout = async () => {
    await logout();
  };

  const renderContent = () => {
    if (!user) {
      return (
        <Card border background="surface" radius={t.radius.lg} padding={18}>
          <Text style={{ color: t.colors.text }}>로그인 정보를 확인할 수 없습니다.</Text>
        </Card>
      );
    }

    return (
      <>
        <Card border background="surface" radius={t.radius.lg} padding={18}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: t.colors.text }}>
            {user.name}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: t.colors.subtext }}>
            {user.email}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 11, color: t.colors.subtext }}>
            회원번호 {user.memberSeq ?? '-'} · Google ID {user.googleId ?? '-'}
          </Text>
        </Card>

        <Card background="muted" radius={t.radius.lg} padding={18}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.text }}>설정</Text>
          <Text style={{ marginTop: 8, fontSize: 12, color: t.colors.subtext }}>
            알림, 파트너 초대(추후)
          </Text>

          <Pressable
            onPress={() => router.push('/category/manage')}
            style={({ pressed }) => [
              styles.menuRow,
              {
                borderColor: t.colors.border,
                backgroundColor: t.colors.surface,
                opacity: pressed ? 0.82 : 1,
              },
            ]}>
            <View
              style={[styles.menuIconWrap, { backgroundColor: 'rgba(212, 180, 131, 0.18)' }]}
              lightColor="transparent"
              darkColor="transparent">
              <Feather name="folder" size={16} color={t.colors.tint} />
            </View>
            <View style={styles.menuTextCol} lightColor="transparent" darkColor="transparent">
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.text }}>
                카테고리 관리
              </Text>
              <Text style={{ marginTop: 3, fontSize: 11, color: t.colors.subtext }}>
                분야 추가 · 수정 · 삭제
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={t.colors.tabIconDefault} />
          </Pressable>

          <Pressable
            onPress={onPressLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              {
                borderColor: t.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text style={{ fontSize: 13, color: t.colors.text }}>로그아웃</Text>
          </Pressable>
        </Card>
      </>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader title="마이페이지" />

      <View style={styles.content} lightColor="transparent" darkColor="transparent">
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
  menuRow: {
    marginTop: 14,
    minHeight: 62,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: { flex: 1 },
  logoutBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
