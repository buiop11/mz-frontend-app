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
  };
};

// 구글에서 받은 idToken을 백엔드로 보내 우리 서비스 토큰을 발급받습니다.
// 백엔드 엔드포인트: POST /api/login/google  body: { idToken }
export async function loginWithGoogle(idToken: string): Promise<GoogleLoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/login/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`백엔드 로그인 실패 (${res.status}): ${text}`);
  }

  return (await res.json()) as GoogleLoginResponse;
}
