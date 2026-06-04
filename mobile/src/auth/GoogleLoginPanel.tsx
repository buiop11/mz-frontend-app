import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { Card } from '@/src/ui/components/Card';
import { useTokens } from '@/src/ui/tokens';
import { GoogleAuthResult, useGoogleAuth } from '@/src/auth/useGoogleAuth';

type Props = Readonly<{
  onAuthResult: (result: GoogleAuthResult) => void | Promise<void>;
  statusText?: string | null;
}>;

export function GoogleLoginPanel({ onAuthResult, statusText }: Props) {
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
  const buttonDisabled = !isReady || loading;
  const buttonOpacity = buttonDisabled ? 0.5 : 1;

  const onPressGoogleLogin = async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      await signIn();
    } catch (e: any) {
      setLoading(false);
      Alert.alert('로그인 실패', e?.message ?? '구글 로그인 창을 열지 못했습니다.');
    }
  };

  return (
    <Card border background="surface" radius={24} padding={22}>
      <View style={styles.badge} lightColor="transparent" darkColor="transparent">
        <Text style={{ fontSize: 11, fontWeight: '700', color: t.colors.tint }}>GOOGLE LOGIN</Text>
      </View>
      <Text style={{ marginTop: 12, fontSize: 19, fontWeight: '800', color: t.colors.text }}>
        로그인이 필요해요
      </Text>
      <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: t.colors.subtext }}>
        구글 계정으로 안전하게 로그인하고, 우리의 결정 기록을 이어서 사용할 수 있어요.
      </Text>
      {loading || statusText ? (
        <Text style={{ marginTop: 10, fontSize: 11, lineHeight: 16, color: t.colors.subtext }}>
          {statusText ?? '구글 로그인 응답을 기다리는 중입니다.'}
        </Text>
      ) : null}

      <Pressable
        disabled={buttonDisabled}
        onPress={onPressGoogleLogin}
        style={({ pressed }) => [
          styles.googleBtn,
          {
            borderColor: t.colors.border,
            backgroundColor: t.colors.gold,
            opacity: pressed && !buttonDisabled ? 0.85 : buttonOpacity,
          },
        ]}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.googleContent} lightColor="transparent" darkColor="transparent">
            <View style={styles.googleMark} lightColor="transparent" darkColor="transparent">
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#2A5A55' }}>G</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#121212' }}>구글로 계속하기</Text>
          </View>
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(212, 180, 131, 0.16)',
  },
  googleBtn: {
    marginTop: 18,
    height: 54,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMark: {
    width: 28,
    height: 28,
    marginRight: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 90, 85, 0.16)',
  },
  hintBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
});
