# Android(에뮬레이터/SDK) 설치 & 트러블슈팅 가이드 (Expo / Windows)

이 문서는 `c:\matjzing\mz-frontend-app\mobile` 프로젝트를 Windows에서 Android로 실행하면서 실제로 겪었던 문제들을 **초보자 기준**으로 정리한 것입니다.

## 목표

- Expo 프로젝트를 **Android 에뮬레이터**에서 실행한다.
- `adb`/SDK 경로가 제대로 잡혀서 `npx expo run:android`가 동작한다.

---

## 0) 가장 많이 헷갈리는 개념 3개

### (1) 프로젝트 설정 vs PC(환경) 설정

- **프로젝트 설정**: `mobile/app.json`, (필요시 생성되는) `mobile/android/*`
- **PC 설정(중요)**: Android SDK 위치, 환경변수, PATH, Emulator/AVD 존재 여부

현재 프로젝트는 Expo Managed로 시작했기 때문에, 처음에는 **`mobile/android/` 폴더가 없습니다.**  
즉, 처음부터 `build.gradle` 같은 파일을 직접 수정하는 구조가 아니고, PC 환경 설정이 먼저 제대로 되어야 합니다.

### (2) `ANDROID_HOME` vs `ANDROID_SDK_ROOT`가 왜 2개?

- `ANDROID_HOME`: 예전부터 널리 쓰이던 레거시 이름(여전히 참고하는 툴이 있음)
- `ANDROID_SDK_ROOT`: 상대적으로 최신 표준에 가까운 이름(새 툴/스크립트가 우선하기도 함)

**가장 안전한 세팅**은 둘 다 같은 경로로 맞추는 것입니다.

### (3) PowerShell vs cmd 문법이 다름

- PowerShell: `echo $env:ANDROID_HOME`
- cmd: `echo %ANDROID_HOME%`

cmd에서 PowerShell 문법을 치면 환경변수가 안 찍히고 “그대로 문자열”이 나옵니다.

---

## 1) SDK가 어디에 설치되어 있어야 하나?

예를 들어 SDK를 `C:\Android`에 설치했다면, 아래 폴더들이 보여야 정상입니다.

- `C:\Android\platform-tools\` (adb)
- `C:\Android\build-tools\`
- `C:\Android\platforms\`
- `C:\Android\cmdline-tools\latest\bin\` (sdkmanager/avdmanager)
- `C:\Android\emulator\` (emulator.exe)

> `emulator.exe`는 보통 `cmdline-tools\latest\bin` 아래에 존재하지 않습니다.  
> 정상 위치는 `C:\Android\emulator\emulator.exe` 입니다.

---

## 2) 환경변수/Path 세팅 (cmd 기준)

### (1) 환경변수 확인

```bat
echo %ANDROID_HOME%
echo %ANDROID_SDK_ROOT%
```

둘 다 비어있거나 엉뚱하면 설정이 필요합니다.

### (2) 환경변수 설정(권장)

```bat
setx ANDROID_HOME "C:\Android"
setx ANDROID_SDK_ROOT "C:\Android"
```

### (3) PATH 설정(필수)

```bat
setx PATH "%PATH%;C:\Android\platform-tools;C:\Android\emulator;C:\Android\cmdline-tools\latest\bin"
```

**중요**: `setx`를 실행한 뒤에는 **터미널을 완전히 닫고 새로 열어야 적용**됩니다.

### (4) 적용 확인

새 cmd에서:

```bat
where adb
where emulator
adb version
adb devices
```

- `where adb` → `C:\Android\platform-tools\adb.exe`가 보여야 정상
- `where emulator` → `C:\Android\emulator\emulator.exe`가 보여야 정상

---

## 3) Android Emulator / 시스템 이미지 설치(명령줄)

Android Studio UI에서 “Android Emulator” 다운로드가 막히는 경우가 있어, `sdkmanager`로 설치할 수 있습니다.

### (1) Emulator + 기본 구성 설치

```bat
C:\Android\cmdline-tools\latest\bin\sdkmanager.bat --sdk_root=C:\Android --install "platform-tools" "emulator" "platforms;android-34" "build-tools;34.0.0"
```

### (2) 라이선스 수락

```bat
C:\Android\cmdline-tools\latest\bin\sdkmanager.bat --sdk_root=C:\Android --licenses
```

### (3) 설치 확인

```bat
dir C:\Android\emulator\emulator.exe
dir C:\Android\platform-tools\adb.exe
```

---

## 4) AVD(가상 디바이스)가 켜졌는지 확인

에뮬레이터가 떠 있는 상태에서:

```bat
adb devices
```

정상이면 예시처럼 보입니다.

```text
List of devices attached
emulator-5554    device
```

---

## 5) 프로젝트 실행(Expo)

### (1) 기본 실행

```bat
cd C:\matjzing\mz-frontend-app\mobile
npx expo start -c
```

### (2) Android 빌드/설치까지 한 번에(문제 원인 로그 확인용)

```bat
cd C:\matjzing\mz-frontend-app\mobile
npx expo run:android
```

> `run:android`는 실패하더라도 “진짜 원인”이 로그에 잘 나오기 때문에, 트러블슈팅에 가장 유용합니다.

---

## 6) 자주 발생한 에러와 해결

### A) `adb`가 인식 안 됨

증상:
- `where adb` → “찾지 못했습니다”
- `adb devices` → “내부 또는 외부 명령이 아닙니다”

원인:
- PATH에 `C:\Android\platform-tools`가 없음

해결:
- 위의 **2) PATH 설정** 수행 후 새 터미널에서 재확인

---

### B) `CommandError: No Android connected device found...`

의미:
- 실기기(USB 디버깅)도 없고, 에뮬레이터도 현재 실행 중이 아님

해결 체크리스트:
- 에뮬레이터 창이 실제로 떠 있는지
- `adb devices`에 `emulator-xxxx device`가 보이는지

---

### C) `The emulator (...) quit before it finished opening`

원인 후보:
- AVD 스냅샷/그래픽 가속 문제
- 시스템 이미지 누락(가장 흔한 케이스는 아래 D)

우회 실행(로그 확인 겸):

```bat
C:\Android\emulator\emulator.exe -avd <AVD_NAME> -no-snapshot -gpu swiftshader_indirect -verbose
```

---

### D) `FATAL | Broken AVD system path... system-images\... is not a valid directory`

의미:
- AVD가 참조하는 **시스템 이미지 폴더가 실제로 설치되어 있지 않음**

해결 방법 1(추천): 안정 버전 AVD 새로 생성
- API 34 또는 35로 새 AVD 생성 후 실행

해결 방법 2: 해당 시스템 이미지 설치

예: android-36 playstore x86_64 이미지 설치

```bat
C:\Android\cmdline-tools\latest\bin\sdkmanager.bat --sdk_root=C:\Android --install "system-images;android-36;google_apis_playstore;x86_64"
```

---

## 7) “우리 프로젝트에서 Build Tools 설정은 어디서 하나?”

Expo Managed 템플릿에서는 보통 처음에 `mobile/android/`가 없기 때문에, `build.gradle` 같은 파일이 없습니다.

아래를 실행하면 네이티브 프로젝트가 생성되면서 `mobile/android/`가 생깁니다.

```bat
cd C:\matjzing\mz-frontend-app\mobile
npx expo run:android
```

생성 후에야 아래에서 Gradle 관련 설정을 볼 수 있습니다.

- `mobile/android/build.gradle`
- `mobile/android/app/build.gradle`
- `mobile/android/gradle/wrapper/gradle-wrapper.properties`

