import { ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { GoogleLoginEnvMissingCard, GoogleLoginPanel } from '@/src/auth/GoogleLoginPanel';
import { useAuth } from '@/src/auth/AuthProvider';
import {
  GoogleAuthResult,
  getGoogleOAuthRedirectUris,
  isGoogleAuthEnvConfigured,
} from '@/src/auth/useGoogleAuth';
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
            <Text selectable style={{ marginTop: 12, fontSize: 11, lineHeight: 16, color: t.colors.subtext }}>
              Google Console → 웹 애플리케이션 OAuth → 승인된 리디렉션 URI에 아래를 모두 등록하세요.{'\n'}
              {getGoogleOAuthRedirectUris().join('\n')}
              {'\n\n'}
              iPhone + Expo Go: PC와 같은 Wi‑Fi, EXPO_PUBLIC_API_URL은 PC LAN IP(예: http://192.168.0.10)로
              설정하세요. localhost는 폰에서 동작하지 않습니다.{'\n'}
              로그인이 계속 실패하면 npx expo run:ios 로 개발 빌드를 쓰거나 iOS OAuth 클라이언트(번들 ID
              com.anonymous.mobile)를 확인하세요.
            </Text>
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
