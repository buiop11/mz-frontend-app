import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Themed';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';
import { GoogleAuthResult, useGoogleAuth } from '@/src/auth/useGoogleAuth';

type Props = {
  onAuthResult: (result: GoogleAuthResult) => void | Promise<void>;
};

export function GoogleLoginPanel({ onAuthResult }: Props) {
  const t = useTokens();
  const [loading, setLoading] = useState(false);

  const onGoogleResult = useCallback(
    async (result: GoogleAuthResult) => {
      try {
        await onAuthResult(result);
      } finally {
        setLoading(false);
      }
    },
    [onAuthResult]
  );

  const { isReady, signIn } = useGoogleAuth(onGoogleResult);

  const onPressGoogleLogin = async () => {
    if (!isReady) return;
    setLoading(true);
    await signIn();
  };

  return (
    <Card border background="surface" radius={t.radius.lg} padding={20}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: t.colors.text }}>
        로그인이 필요해요
      </Text>
      <Text style={{ marginTop: 6, fontSize: 12, color: t.colors.subtext }}>
        구글 계정으로 로그인하고 우리의 결정을 함께 만들어요.
      </Text>

      <Pressable
        disabled={!isReady || loading}
        onPress={onPressGoogleLogin}
        style={({ pressed }) => [
          styles.googleBtn,
          {
            borderColor: t.colors.border,
            backgroundColor: t.colors.surface,
            opacity: !isReady || loading ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.text }}>
            G  구글로 계속하기
          </Text>
        )}
      </Pressable>
    </Card>
  );
}

export function GoogleLoginEnvMissingCard() {
  const t = useTokens();
  return (
    <Card border background="surface" radius={t.radius.lg} padding={20}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: t.colors.text }}>
        구글 로그인 설정이 필요해요
      </Text>
      <Text style={{ marginTop: 6, fontSize: 12, color: t.colors.subtext }}>
        mobile 폴더에 .env 파일을 만들고 Google Cloud에서 발급한 클라이언트 ID를 넣어주세요.
        {'\n\n'}
        Expo 웹(브라우저)에서는 webClientId가 필요합니다. 안드로이드 전용 ID만 있어도 코드가
        자동으로 채워 주지만, 가능하면 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID(웹 애플리케이션 유형)를
        반드시 발급해 두는 것을 권장합니다.
        {'\n\n'}
        자세한 절차는 docs/google-login-setup.md 를 참고한 뒤, 변경 후 npx expo start -c 로 다시
        실행하세요.
      </Text>
      <Pressable
        onPress={() =>
          Alert.alert(
            '환경 변수 예시',
            'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com\n' +
              'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...\n' +
              'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...'
          )
        }
        style={({ pressed }) => [styles.hintBtn, { opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ fontSize: 13, color: t.colors.text, textDecorationLine: 'underline' }}>
          .env 예시 보기
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  googleBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
});
