import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// 앱이 OAuth 결과를 받기 위해 필요한 호출 (한 번만 호출되면 됩니다).
WebBrowser.maybeCompleteAuthSession();

// 👇 Google Cloud Console에서 발급받은 OAuth 클라이언트 ID들을 여기에 넣어주세요.
//    - Android: 패키지명(com.anonymous.mobile) + SHA-1 지문 등록
//    - iOS: 번들 ID 등록 (지금은 아직 안 써도 OK)
//    - Web: Expo Go 또는 웹에서 테스트할 때 사용
//
//    환경변수로도 주입 가능 (앱 재시작 필요):
//      mobile/.env
//        EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxx.apps.googleusercontent.com
//        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
//        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
//
// expo-auth-session 은 플랫폼마다 요구하는 속성이 다릅니다 (Android → androidClientId,
// iOS → iosClientId, 웹·그 외 → webClientId). 비어 있으면 `|| undefined` 로 인해
// 런타임에서 바로 에러가 납니다. 웹 ID 하나만 넣어도(Expo 권장) 네이티브에 폴백합니다.
const ANDROID_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '').trim();
const IOS_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();
const WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

export function getGoogleWebRedirectUri(): string | undefined {
  if (Platform.OS !== 'web' || globalThis.window === undefined) return undefined;
  return globalThis.window.location.origin;
}

/** 현재 실행 플랫폼에서 사용할 수 있는 구글 클라이언트 ID가 있으면 true */
export function isGoogleAuthEnvConfigured(): boolean {
  if (Platform.OS === 'web') return Boolean(WEB_CLIENT_ID);
  if (Platform.OS === 'android') return Boolean(ANDROID_CLIENT_ID || WEB_CLIENT_ID);
  if (Platform.OS === 'ios') return Boolean(IOS_CLIENT_ID || WEB_CLIENT_ID);
  return Boolean(ANDROID_CLIENT_ID || IOS_CLIENT_ID || WEB_CLIENT_ID);
}

export type GoogleAuthResult =
  | { type: 'success'; idToken: string }
  | { type: 'cancel' }
  | { type: 'error'; message: string };

export function useGoogleAuth(onResult: (result: GoogleAuthResult) => void) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // 네이티브 전용 ID가 없으면 같은 프로젝트의 웹 클라이언트 ID로 채움 (Expo 문서·Go 시나리오).
    androidClientId: ANDROID_CLIENT_ID || WEB_CLIENT_ID || undefined,
    iosClientId: IOS_CLIENT_ID || WEB_CLIENT_ID || undefined,
    // 웹에서는 반드시 Google Cloud의 "웹 애플리케이션" 클라이언트 ID만 사용해야 합니다.
    webClientId: WEB_CLIENT_ID || undefined,
    redirectUri: getGoogleWebRedirectUri(),
    // idToken을 받기 위한 스코프
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.authentication?.idToken ?? response.params?.id_token;
      if (idToken) {
        onResult({ type: 'success', idToken });
      } else {
        onResult({ type: 'error', message: 'idToken을 받지 못했습니다.' });
      }
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      onResult({ type: 'cancel' });
    } else if (response.type === 'error') {
      onResult({ type: 'error', message: response.error?.message ?? '알 수 없는 오류' });
    }
  }, [response, onResult]);

  return {
    isReady: !!request,
    signIn: () => promptAsync(),
  };
}
