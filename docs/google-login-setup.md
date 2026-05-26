# 구글 로그인 설정 가이드

마이페이지(`me.tsx`)에 추가된 구글 로그인 기능의 동작 원리, 설정 방법, 백엔드 연동 위치를 정리한 문서입니다.

---

## 1. 동작 흐름 (앱 → 구글 → 백엔드)

```
[1] 앱에서 "구글 로그인" 버튼 탭
[2] 구글 OAuth 화면 열림 → 사용자가 구글 계정 선택
[3] 구글이 앱에게 idToken(신원 증명서) 발급
[4] 앱이 idToken을 백엔드(/api/login/google)로 전송
[5] 백엔드가 구글에 idToken 검증 → 우리 서비스용 토큰(JWT 등) 발급
[6] 앱이 그 토큰을 안전한 저장소(SecureStore)에 보관
```

Expo SDK 54의 표준 방식인 **`expo-auth-session`** 을 사용합니다.
(네이티브 빌드 없이 Expo Go에서도 테스트 가능)

---

## 2. 추가된 파일 구조

| 파일 | 역할 |
|---|---|
| `mobile/src/api/client.ts` | **백엔드 주소 & API 호출** — 여기서 `/api/login/google` 호출 |
| `mobile/src/auth/storage.ts` | 로그인 토큰을 SecureStore에 안전하게 저장 |
| `mobile/src/auth/useGoogleAuth.ts` | 구글 OAuth 훅 (expo-auth-session 래퍼) |
| `mobile/app/(tabs)/me.tsx` | 로그인 전/후 UI 분기 |
| `mobile/app.json` | `expo-secure-store` 플러그인 추가됨 |

설치된 의존성:
- `expo-auth-session`
- `expo-secure-store`
- `expo-web-browser` (기존 설치되어 있었음)

---

## 3. 작동시키려면 — 두 가지 설정이 필요합니다

### 3.1. Google Cloud Console에서 OAuth 클라이언트 ID 발급

구글 로그인은 "어떤 앱이 요청하는지" 구글이 알아야 작동합니다. 그래서 클라이언트 ID가 꼭 필요합니다.

1. https://console.cloud.google.com 접속 → 새 프로젝트 생성 (예: `OurPick`)
2. **APIs & Services → Credentials → "Create credentials" → "OAuth client ID"**
3. 다음 3개를 만듭니다:
   - **Android**: 패키지명 `com.anonymous.mobile` + 디버그 SHA-1 지문
     - SHA-1 확인 방법:
       ```bash
       cd mobile/android
       ./gradlew signingReport
       ```
       출력에서 `SHA1:` 라인을 복사

1. Android 폴더로 이동
프로젝트 루트가 c:\matjzing\mz-frontend-app 이니까 PowerShell에서:

cd c:\matjzing\mz-frontend-app\mobile\android
그리고 SHA-1 확인:

.\gradlew signingReport
문서의 ./gradlew signingReport는 Mac/Linux 방식이고, Windows PowerShell에서는 .\gradlew signingReport 입니다.

   - **iOS**: 번들 ID `com.anonymous.mobile` (지금 당장 안 써도 OK)
   - **Web application**: Expo 웹 테스트용
     - 승인된 JavaScript 원본: `http://localhost:8081`
     - 승인된 리디렉션 URI: `http://localhost:8081`
     - Expo 웹 포트가 바뀌면 `8081` 부분도 실제 포트에 맞춰 추가해야 합니다.

### 3.2. 환경변수 파일 생성

발급받은 클라이언트 ID와 백엔드 주소를 **`mobile/.env`** 파일을 새로 만들어서 넣습니다:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

> Expo에서 `EXPO_PUBLIC_` 접두사가 붙은 env 변수는 앱 번들에 포함되어
> 코드에서 `process.env.EXPO_PUBLIC_xxx`로 읽을 수 있습니다.
> **변경 후 `npx expo start -c`로 캐시 클리어 후 재시작해야 반영됩니다.**

---

## 4. 백엔드 주소를 바꾸는 위치

**👉 `mobile/src/api/client.ts`**

```ts
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080';
```

환경에 따라 사용할 주소:

| 환경 | 백엔드 주소 |
|---|---|
| **안드로이드 에뮬레이터** + PC 로컬 서버 | `http://10.0.2.2:8080` (← `localhost` 대신 꼭 10.0.2.2) |
| **iOS 시뮬레이터** + PC 로컬 서버 | `http://localhost:8080` |
| **실기기** (Expo Go) + PC 로컬 서버 | `http://192.168.x.x:8080` (PC의 LAN IP) |
| 배포된 서버 | `https://api.your-domain.com` |

가장 깔끔한 방법은 위 `.env` 파일의 `EXPO_PUBLIC_API_URL`로 주입하는 것입니다.

---

## 5. 백엔드 측 계약 (API Contract)

`me.tsx`에서 작성한 코드는 백엔드가 다음과 같이 응답한다고 가정합니다.

### 요청
```
POST /api/login/google
Content-Type: application/json

{ "idToken": "eyJhbGc..." }
```

### 응답 (200 OK)
```json
{
  "code": "SUC001",
  "message": "처리가 완료되었습니다.",
  "data": {
    "email": "emotion@emotion.co.kr",
    "passwordExpiredYn": false,
    "memberSeq": 1,
    "accessToken": "abc...",
    "accessTokenExpiredDt": "2022.09.06 09:00.000"
  }
}
```

프론트는 `data.accessToken`을 로그인 토큰으로 저장하고, `data.memberSeq`와 `data.email`을 마이페이지 사용자 정보로 사용합니다.

---

## 6. 실행 방법

```bash
cd mobile
npx expo start
```

옵션:
- `npx expo start -c` : 캐시 클리어 후 시작 (env 변경 후 권장)
- `npx expo run:android` : 안드로이드 dev build (실기기/에뮬레이터)

> ⚠️ `expo-secure-store`는 네이티브 모듈입니다.
> Expo Go에서도 동작하지만, 추후 안정적인 동작을 위해 **dev build** (`npx expo run:android`) 사용을 권장합니다.

---

## 7. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `webClientId` must be defined … | **Expo 웹(브라우저)** 또는 `Platform`이 웹 기본값인 환경입니다. `expo-auth-session`은 이 경우 `webClientId`가 필수입니다. `mobile/.env`에 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`(Google Cloud에서 **웹 애플리케이션** 유형)를 넣고 `npx expo start -c`로 재시작하세요. 안드로이드 전용 ID만 있는 경우에도 앱 코드가 웹/다른 플랫폼용으로 ID를 맞춰 주지만, 콘솔에서 **웹 클라이언트**를 만들어 두는 것이 가장 안전합니다. |
| 구글 로그인 창이 안 뜸 | 클라이언트 ID가 비어있음 → `.env` 확인 후 `expo start -c` 재시작 |
| `idToken을 받지 못했습니다` | OAuth 클라이언트 ID 종류 확인 (Android/iOS/Web 매칭) |
| `백엔드 로그인 실패 (404/500)` | `API_BASE_URL` 또는 백엔드 라우트(`/api/login/google`) 점검 |
| `Network request failed` | 에뮬레이터는 `10.0.2.2`, 실기기는 LAN IP 사용했는지 확인 |
| Android SHA-1 인증 오류 | `./gradlew signingReport`로 다시 확인 후 콘솔에 정확히 등록 |

---

## 8. 관련 코드 위치 요약

```
mobile/
├── app/(tabs)/me.tsx               ← 로그인 화면 UI
├── src/
│   ├── api/client.ts               ← 백엔드 주소 (★ 여기 수정)
│   └── auth/
│       ├── storage.ts              ← 토큰 저장/조회/삭제
│       └── useGoogleAuth.ts        ← 구글 OAuth 훅
├── app.json                        ← expo-secure-store 플러그인 등록
└── .env                            ← 환경변수 (직접 생성 필요)
```
