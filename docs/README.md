# 우리결정(OurPick) - 모바일 앱(Expo) 실행/사용/백엔드 연동 가이드

이 문서는 `c:\matjzing\mz-frontend-app\mobile` 폴더의 **Expo(React Native)** 앱을 기준으로 작성되었습니다.

## 실행하는 법 (개발 환경)

### 1) 필수 설치

- **Node.js**: LTS 권장
- **Android Studio**: Android Emulator 사용 시
- **Expo Go 앱**: 실기기 테스트 시(Play Store/App Store)

### Android 설정/에러 해결 가이드

- `docs/android-setup-and-troubleshooting.md`

### 2) 의존성 설치

```bash
cd mobile
npm install
```

### 3) 개발 서버 실행

```bash
cd mobile
npm run start
```
웹으로 확인: 실행 후 w 또는 npm run web
안드로이드: npm run android (에뮬레이터/기기 연결 필요)

실행 후:
- **Android 에뮬레이터**: 터미널 안내에 따라 Android 실행(또는 `npm run android`)
- **실기기**: Expo Go로 QR 스캔
- **웹**: `npm run web`
- npx expo start -c --web

A. 포트/프로세스 정리 (가장 흔한 원인)
cd mobile
npx expo start -c
B. Android 빌드 로그를 “확실히” 뽑기
아래로 실행하면 실패 원인이 콘솔에 더 명확히 찍힙니다.
값을 바꾼 뒤에는 문서에 적힌 대로 npx expo start -c 로 캐시를 지우고 다시 띄워야 EXPO_PUBLIC_* 가 반영됩니다.


# 앱 실행할 때
nvm 적용된 터미널에서:
cd /Users/zzing/Desktop/ourpick/mz-frontend-app/mobile
npm install
npm run start
Android 에뮬레이터는 Android Studio + SDK가 추가로 필요합니다 (nvm과는 별개).
source ~/.zshrc 후 nvm --version 결과를 알려주시면, 다음 단계(에뮬레이터 또는 npm run android)도 이어서 안내하겠습니다.

# 안드로이드 에뮬레이터 실행
cd mobile
npx expo run:android

## 작동시키는 법 (앱 사용 흐름)

현재 MVP는 `mock 데이터`로 동작하며, 화면/네비게이션/레이아웃이 도안(`pencil-new.pen`) 구조에 맞게 구현되어 있습니다.

- **홈(탭)**: 히어로 카드 + 카테고리 + 진행 중 안건 카드
- **목록(탭)**: 안건 리스트 + 검색 UI(입력만, 필터링은 추후)
- **달력(탭)**: 월/요일/날짜 그리드 + 다가오는 일정 카드
- **로그(탭)**: Pick 완료된 안건의 타임라인 형태 로그
- **마이(탭)**: 사용자 카드 + 설정 영역(추후 확장)
- **안건 상세(스택)**: 후보 카드(대표 1개) + CTA(좋아요/투표)
- **달력 상세(스택)**: 선택 일정 상세 카드 + 액션(자세히/캘린더 저장)

## 백엔드 API 연결하는 방법

### 1) API 호출 구조(권장)

현재는 `mock 데이터`를 사용합니다:
- `mobile/src/data/mock.ts`

백엔드가 준비되면 아래 방식으로 전환하는 것을 권장합니다.

- **1단계**: `mobile/src/api/` 폴더 생성
- **2단계**: `fetch` 래퍼(베이스 URL, 에러 처리, 토큰 헤더) 구현
- **3단계**: 화면에서는 “API 함수”만 호출하도록 분리(DRY)

예시(권장 구조):

```text
mobile/src/api/
  client.ts        (fetch 래퍼)
  agendas.ts       (안건/후보/댓글)
  calendar.ts      (일정)
  auth.ts          (로그인/토큰)
```

### 2) 환경변수로 Base URL 주입(Expo)

가장 단순한 방식:
- `mobile/app.json`의 `expo.extra`에 API Base URL을 넣고,
- `expo-constants`로 읽습니다.

예:
- `app.json`

```json
{
  "expo": {
    "extra": {
      "API_BASE_URL": "http://localhost:8080"
    }
  }
}
```

코드에서:

```ts
import Constants from "expo-constants";

const API_BASE_URL =
  (Constants.expoConfig?.extra as any)?.API_BASE_URL ??
  "http://localhost:8080";
```

> 실기기(Expo Go)에서 `localhost`는 **PC가 아니라 휴대폰 자신**을 가리킵니다.  
> 따라서 실기기에서는 `http://내PC_IP:8080` 형태를 사용하세요.

### 3) 최소 API 스펙(프론트 기준)

프론트에서 필요한 대표 엔드포인트 예시는 아래와 같습니다.

- `GET /agendas`: 안건 목록(상태/카테고리/댓글수 포함)
- `POST /agendas`: 안건 생성(카테고리/제목/옵션)
- `GET /agendas/:id`: 안건 상세(후보 리스트)
- `POST /agendas/:id/candidates`: 후보 추가(링크 파싱 결과 포함 가능)
- `POST /agendas/:id/votes`: 투표
- `POST /agendas/:id/confirm`: 확정/확정취소(알림 트리거)
- `GET /agendas/:id/comments`: 댓글 목록
- `POST /agendas/:id/comments`: 댓글 작성
- `GET /calendar`: 일정 목록
- `POST /calendar`: 일정 등록(안건 Pick 시 자동 등록)

## 개발 메모

- 도안 컬러 토큰은 `mobile/constants/Colors.ts`에 반영되어 있습니다.
- 라우팅은 Expo Router 기준입니다:
  - 탭: `mobile/app/(tabs)/*`
  - 상세: `mobile/app/agenda/[id].tsx`, `mobile/app/calendar/[id].tsx`



20260522
# 시뮬레이터 설치 후 오픈 
open -a Simulator
cd /Users/zzing/Desktop/ourpick/mz-frontend-app/mobile
npm run ios