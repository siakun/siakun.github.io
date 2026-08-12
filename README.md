# siakun.github.io

개인 포트폴리오와 블로그를 GitHub Pages에 정적 사이트로 배포하는 저장소입니다.

마크다운 원본은 private 저장소인 `siakun-private/notes`에서 관리합니다. 빌드할 때 `public/`만 `.content/public/`으로 받아 사이트 저장소의 React 콘텐츠와 번호순으로 합칩니다.

## 기술 스택

- **Next.js** (Static Export) + **TypeScript**
- **Tailwind CSS**
- **ESLint** + **Prettier**
- **GitHub Actions** -> **GitHub Pages** 자동 배포

## 프로젝트 구조 개요

저장소에 HTML을 직접 올리지 않습니다. 사이트 코드와 빌드할 때 받은 마크다운으로 HTML을 만듭니다.

```
사이트 코드 + 외부 콘텐츠                  빌드 결과물 (out/)
├── src/app/page.tsx                     ├── index.html
├── src/content/*.tsx           빌드      ├── 404.html
├── .content/public/*.md       ------>   ├── _next/
├── next.config.ts                        │   └── static/ (JS, CSS)
└── package.json                          └── favicon.ico
```

## 콘텐츠 빌드 전제

로컬에서 전체 사이트를 실행하려면 GitHub CLI(`gh`)와 `siakun-private/notes` 읽기 권한이 필요합니다. GitHub CLI를 설치한 뒤 다음 명령으로 로그인하고 접근 권한을 확인합니다.

```bash
gh auth login --hostname github.com
gh repo view siakun-private/notes
```

`npm run dev`와 `npm run build`는 먼저 `npm run content:pull`로 `public/`을 받고, 이어서 콘텐츠 인덱스를 생성합니다. `gh`가 없거나 인증되지 않았거나 저장소를 읽을 수 없으면 해결 방법을 출력하고 중단합니다.

`npm run generate`는 콘텐츠를 받지 않고 현재 파일만 읽습니다. 외부 경로의 기본값은 `.content/public`이며 `EXTERNAL_CONTENT_DIR`로 다른 경로를 지정할 수 있습니다. 해당 경로가 없으면 외부 마크다운을 건너뛰고 `src/content/`의 `.tsx`만으로 생성합니다. 두 소스의 번호나 ID가 겹치면 충돌한 파일 경로를 출력하고 실패합니다.

GitHub Actions에서는 읽기용 GitHub App의 Actions 변수 `CONTENT_READER_APP_ID`와 시크릿 `CONTENT_READER_APP_KEY`가 필요합니다. 배포 워크플로가 `siakun-private/notes`의 `public/`을 직접 체크아웃하므로 로컬 pull 스크립트는 CI에서 실행을 건너뜁니다.

## 배포 방식

`main` 브랜치에 push하면 자동으로 배포됩니다.

```
main에 push
  ↓
GitHub Actions가 자동 실행 (.github/workflows/deploy.yml)
  ↓
GitHub이 제공하는 Ubuntu 가상 머신에서:
  1. 콘텐츠 저장소의 public/ 체크아웃
  2. npm ci          (의존성 설치)
  3. npm run build   (인덱스 생성과 빌드 -> out/ 디렉터리 생성)
  ↓
out/ 내용물을 GitHub Pages 아티팩트로 업로드
  ↓
GitHub Pages CDN이 아티팩트를 제공
  ↓
https://siakun.github.io에 반영
```

핵심 전제는 다음과 같습니다.

- `out/`은 빌드 결과이므로 커밋하지 않습니다.
- `.content/`도 빌드 입력을 받는 임시 디렉터리이므로 커밋하지 않습니다.
- 빌드 결과물은 GitHub 내부 아티팩트 저장소에 따로 저장됩니다.
- 저장소의 Settings -> Pages -> Source를 **GitHub Actions**로 설정해야 합니다.

## 로컬 실행 방법

### 개발 서버

```bash
npm run dev
```

콘텐츠를 받은 뒤 개발 서버를 시작합니다. `http://localhost:3000`에서 확인할 수 있으며 코드 수정 사항은 브라우저에 바로 반영됩니다(Hot Reload).

### 빌드 미리보기

```bash
npm run build         # out/ 디렉터리에 정적 파일 생성
npx serve out         # out/ 디렉터리를 로컬 웹 서버로 제공
```

실제 `https://siakun.github.io`와 같은 프로덕션 빌드를 로컬에서 확인할 수 있습니다.

### 개발 서버와 빌드 미리보기 비교

|      | `npm run dev`       | `npm run build` + `npx serve out` |
| ---- | ------------------- | --------------------------------- |
| 용도 | 개발 중 실시간 확인 | 배포 전 최종 확인                 |
| 속도 | 빠른 반영           | 빌드 시간 필요                    |
| 결과 | 개발 모드           | 실제 배포와 같은 프로덕션 모드    |

## 기타 명령어

```bash
npm run lint          # ESLint 코드 검사
npm run format        # Prettier 포매팅
npm run content:pull  # 외부 마크다운 받기
npm run generate      # 현재 콘텐츠로 인덱스 생성
```
