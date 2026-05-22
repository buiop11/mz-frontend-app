import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';
import { loginWithGoogle } from '@/src/api/client';
import { GoogleLoginEnvMissingCard, GoogleLoginPanel } from '@/src/auth/GoogleLoginPanel';
import { clearSession, loadSession, saveSession, StoredUser } from '@/src/auth/storage';
import { GoogleAuthResult, isGoogleAuthEnvConfigured } from '@/src/auth/useGoogleAuth';

export default function MeScreen() {
  const t = useTokens();
  const [user, setUser] = useState<StoredUser | null>(null);
  // 앱이 켜질 때 저장된 세션이 있는지 확인하는 동안의 로딩
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session) setUser(session.user);
      setBootstrapping(false);
    })();
  }, []);

  const handleAuthResult = useCallback(async (result: GoogleAuthResult) => {
    if (result.type === 'cancel') {
      return;
    }
    if (result.type === 'error') {
      Alert.alert('로그인 실패', result.message);
      return;
    }

    try {
      const { token, user } = await loginWithGoogle(result.idToken);
      await saveSession(token, user);
      setUser(user);
    } catch (e: any) {
      Alert.alert('백엔드 연동 실패', e?.message ?? '알 수 없는 오류');
    }
  }, []);

  const onPressLogout = async () => {
    await clearSession();
    setUser(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <AppHeader title="마이페이지" />

      <View style={styles.content} lightColor="transparent" darkColor="transparent">
        {bootstrapping ? (
          <Card border background="surface" radius={t.radius.lg} padding={18}>
            <ActivityIndicator />
          </Card>
        ) : user ? (
          <>
            <Card border background="surface" radius={t.radius.lg} padding={18}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: t.colors.text }}>
                {user.name}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: t.colors.subtext }}>
                {user.email}
              </Text>
            </Card>

            <Card background="muted" radius={t.radius.lg} padding={18}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.text }}>설정</Text>
              <Text style={{ marginTop: 8, fontSize: 12, color: t.colors.subtext }}>
                알림, 파트너 초대(추후)
              </Text>
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
        ) : isGoogleAuthEnvConfigured() ? (
          <GoogleLoginPanel onAuthResult={handleAuthResult} />
        ) : (
          <GoogleLoginEnvMissingCard />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
  logoutBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
