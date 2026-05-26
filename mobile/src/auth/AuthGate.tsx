import { ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { GoogleLoginEnvMissingCard, GoogleLoginPanel } from '@/src/auth/GoogleLoginPanel';
import { useAuth } from '@/src/auth/AuthProvider';
import { GoogleAuthResult, getGoogleWebRedirectUri, isGoogleAuthEnvConfigured } from '@/src/auth/useGoogleAuth';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';

const logoSource = require('../../assets/images/ourpick-logo.png');

export function AuthGate({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTokens();
  const router = useRouter();
  const { bootstrapping, session, loginWithGoogleIdToken } = useAuth();
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  const handleAuthResult = useCallback(
    async (result: GoogleAuthResult) => {
      if (result.type === 'cancel') return;
      if (result.type === 'error') {
        Alert.alert('로그인 실패', result.message);
        return;
      }

      try {
        setLoginStatus('백엔드 로그인 API를 호출하는 중입니다.');
        await loginWithGoogleIdToken(result.idToken);
        setLoginStatus(null);
        router.replace('/');
      } catch (e: any) {
        setLoginStatus(null);
        Alert.alert('백엔드 연동 실패', e?.message ?? '알 수 없는 오류');
      }
    },
    [loginWithGoogleIdToken, router],
  );

  if (bootstrapping) {
    return (
      <View style={[styles.root, { backgroundColor: t.colors.background }]}>
        <Card border background="surface" radius={t.radius.lg} padding={18}>
          <ActivityIndicator />
        </Card>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.root, { backgroundColor: t.colors.background }]}>
        <View style={styles.hero} lightColor="transparent" darkColor="transparent">
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: t.colors.text }]}>우리결정</Text>
          <Text style={[styles.subtitle, { color: t.colors.subtext }]}>
            중요한 선택을 함께 기록하고 결정해요.
          </Text>
        </View>

        {isGoogleAuthEnvConfigured() ? (
          <>
            <GoogleLoginPanel onAuthResult={handleAuthResult} statusText={loginStatus} />
            {getGoogleWebRedirectUri() ? (
              <Text selectable style={{ marginTop: 12, fontSize: 11, lineHeight: 16, color: t.colors.subtext }}>
                Google Console 리디렉션 URI: {getGoogleWebRedirectUri()}
              </Text>
            ) : null}
          </>
        ) : (
          <GoogleLoginEnvMissingCard />
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 22 },
  logo: {
    width: 118,
    height: 118,
    marginBottom: 14,
    borderRadius: 28,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
