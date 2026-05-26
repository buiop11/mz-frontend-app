// 백엔드 서버 주소.
// 👉 백엔드 주소를 바꾸려면 여기를 수정하거나,
//    mobile/.env 파일에 EXPO_PUBLIC_API_URL=http://your-backend 를 넣어주세요.
//
// 주의(안드로이드 에뮬레이터):
//   - 에뮬레이터에서 PC의 localhost는 'http://10.0.2.2:포트' 로 접근해야 합니다.
//   - 실기기에서는 PC의 LAN IP (예: http://192.168.0.10:8080) 를 사용하세요.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080';

export type GoogleLoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    memberSeq?: number;
    googleId?: string;
  };
  accessTokenExpiredDt?: string;
  passwordExpiredYn?: boolean;
};

type GoogleLoginApiResponse = {
  code?: string;
  message?: string;
  data?: {
    email?: string | null;
    memberSeq?: number;
    accessToken?: string;
    accessTokenExpiredDt?: string;
    passwordExpiredYn?: boolean;
  };
};

function displayNameFromEmail(email: string): string {
  const [localPart] = email.split('@');
  return localPart || '구글 사용자';
}

type GoogleIdTokenPayload = {
  sub?: string;
  email?: string;
  name?: string;
};

function decodeBase64Url(value: string): string | null {
  if (globalThis.atob === undefined) return null;

  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  try {
    return decodeURIComponent(
      Array.from(globalThis.atob(padded))
        .map((char) => `%${(char.codePointAt(0) ?? 0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  } catch {
    return null;
  }
}

function decodeGoogleIdToken(idToken: string): GoogleIdTokenPayload | null {
  const [, payload] = idToken.split('.');
  if (!payload) return null;

  const decoded = decodeBase64Url(payload);
  if (!decoded) return null;

  try {
    return JSON.parse(decoded) as GoogleIdTokenPayload;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// 구글에서 받은 idToken을 백엔드로 보내 우리 서비스 토큰을 발급받습니다.
// 백엔드 엔드포인트: POST /api/login/google  body: { idToken }
export async function loginWithGoogle(idToken: string): Promise<GoogleLoginResponse> {
  const url = `${API_BASE_URL}/api/login/google`;
  console.info('[auth] POST', url);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { Accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
      10000,
    );
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`백엔드 로그인 API 응답이 지연되고 있습니다. (${url})`);
    }
    throw new Error(`백엔드 로그인 API 호출 실패: ${e?.message ?? String(e)}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`백엔드 로그인 실패 (${res.status}): ${text}`);
  }

  const json = (await res.json()) as GoogleLoginApiResponse;
  const data = json.data;
  const googleIdentity = decodeGoogleIdToken(idToken);
  const email = data?.email?.trim() || googleIdentity?.email?.trim();

  if (!data?.accessToken || data.memberSeq == null) {
    throw new Error(json.message ?? '로그인 응답에 필요한 사용자 정보가 없습니다.');
  }

  return {
    token: data.accessToken,
    accessTokenExpiredDt: data.accessTokenExpiredDt,
    passwordExpiredYn: data.passwordExpiredYn,
    user: {
      id: String(data.memberSeq),
      memberSeq: data.memberSeq,
      googleId: googleIdentity?.sub,
      name: googleIdentity?.name ?? (email ? displayNameFromEmail(email) : `회원 ${data.memberSeq}`),
      email: email ?? '',
    },
  };
}
