import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '').trim();
const IOS_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();
const WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

/** Google Cloud Console에 등록해야 하는 리디렉션 URI 목록 (Expo Go / 웹 / 네이티브) */
export function getGoogleOAuthRedirectUris(): string[] {
  const uris = new Set<string>();

  if (Platform.OS === 'web' && globalThis.window !== undefined) {
    uris.add(globalThis.window.location.origin);
  }

  uris.add(
    AuthSession.makeRedirectUri({
      scheme: 'mobile',
      path: 'redirect',
    }),
  );

  const fullName = Constants.expoConfig?.originalFullName;
  if (fullName) {
    uris.add(`https://auth.expo.io/${fullName}`);
  }

  return [...uris].filter(Boolean);
}

/** @deprecated getGoogleOAuthRedirectUris()[0] — 웹에서만 의미 있음 */
export function getGoogleWebRedirectUri(): string | undefined {
  if (Platform.OS !== 'web' || globalThis.window === undefined) return undefined;
  return globalThis.window.location.origin;
}

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
  // redirectUri는 플랫폼별로 Google 훅이 makeRedirectUri로 자동 설정 (Expo Go 포함)
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: ANDROID_CLIENT_ID || WEB_CLIENT_ID || undefined,
    iosClientId: IOS_CLIENT_ID || WEB_CLIENT_ID || undefined,
    webClientId: WEB_CLIENT_ID || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  const redirectUriHint = useMemo(() => getGoogleOAuthRedirectUris().join('\n'), []);

  useEffect(() => {
    if (__DEV__ && redirectUriHint) {
      console.info('[google-auth] Google Console에 등록할 리디렉션 URI:\n', redirectUriHint);
    }
  }, [redirectUriHint]);

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
      const msg = response.error?.message ?? '알 수 없는 오류';
      const hint =
        Platform.OS !== 'web' && msg.includes('redirect')
          ? '\n\nExpo Go에서는 Google Console(웹 클라이언트)에 위 리디렉션 URI를 모두 등록해야 해요. 로그인 화면에 표시된 URI를 확인하세요.'
          : '';
      onResult({ type: 'error', message: msg + hint });
    }
  }, [response, onResult]);

  return {
    isReady: !!request,
    signIn: () => promptAsync(),
    redirectUriHint,
  };
}
