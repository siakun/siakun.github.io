# CLAUDE.md - siakun.github.io

## 프로젝트 개요

siakun의 개인 포트폴리오 + 블로그 사이트. GitHub Pages로 정적 배포된다.

## 기술 스택

- **프레임워크**: Next.js (Static Export)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **패키지 매니저**: npm
- **코드 품질**: ESLint + Prettier
- **CI/CD**: GitHub Actions → GitHub Pages

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router (SSG 기반)
│   ├── page.tsx            # 홈 전용 페이지 (Client Component)
│   ├── [tabId]/page.tsx    # 동적 탭 라우트 (generateStaticParams로 정적 생성)
│   ├── not-found.tsx       # 커스텀 404 페이지
│   ├── layout.tsx          # 루트 레이아웃 (Server Component, NotebookShell 래핑)
│   └── globals.css         # 글로벌 스타일 + CSS 변수 (디자인 시스템)
├── components/
│   ├── common/             # 범용 컴포넌트 (ImageModal, HashRedirect 등)
│   ├── layout/             # 레이아웃
│   │   ├── NotebookShell.tsx   # 노트북 껍데기 (사이드바 + 바인더 + 탭스트립 + 콘텐츠 래퍼)
│   │   ├── ProfileSidebar.tsx  # 데스크탑 사이드바
│   │   └── ProfileMobile.tsx   # 모바일 프로필 헤더
│   ├── sections/           # 섹션 컴포넌트
│   │   ├── MarkdownSection.tsx     # 마크다운 렌더러
│   │   ├── TabContentRenderer.tsx  # 탭 콘텐츠 렌더러 (markdown/component 분기)
│   │   └── markdown/               # 마크다운 하위 컴포넌트 (CodeBlock, Callout)
│   └── tabs/               # 탭 UI 컴포넌트
│       └── TabButton.tsx    # 탭 버튼 + 탭 스트립
├── content/                # 콘텐츠 원본 파일 (파일명 규칙: "<번호>. <id>.<확장자>")
│   ├── *.md                #   마크다운 → { type: 'markdown' } 탭으로 변환
│   └── *.tsx               #   React 컴포넌트 → { type: 'component' } 탭으로 변환
├── generated/              # 자동 생성 파일 (직접 import 금지 — 아래 주의사항 참고)
├── lib/
│   └── tabs.ts             # 탭 정의 및 콘텐츠 (generated의 유일한 소비자)
├── data/                   # 정적 데이터
│   └── profile.ts          # 프로필 정보
├── hooks/                  # 커스텀 훅
│   └── useTabNavigation.ts # 탭 전환 (usePathname + router.push 기반)
└── types/                  # TypeScript 타입 정의
public/
└── certificates/           # 자격증 이미지 (about.md에서 참조)
```

## generated 폴더 (자동 생성)

`src/generated/`는 `scripts/generate-content-index.mjs`가 빌드 타임에 자동 생성하는 파일들이 위치한다. `npm run generate` (또는 `predev`/`prebuild` 훅)으로 생성된다.

### 생성되는 파일
- `tab-defs.ts` — 탭 메타데이터 (ID, 라벨, 아이콘, description)
- `tab-content-map.ts` — 전체 탭 콘텐츠 매핑 (home 제외)
- `tab-[tabId].ts` — 각 탭의 개별 콘텐츠

### 주의사항
- **`@/generated/`를 직접 import하지 않는다.** generated 파일은 빌드 전에는 존재하지 않으므로 직접 참조하면 IDE 에러가 발생하고 의존성이 분산된다.
- **`src/lib/tabs.ts`가 generated의 유일한 소비자이다.** 다른 모든 파일은 `@/lib/tabs`를 통해서만 탭 데이터에 접근한다.
- **generated 파일을 수동 편집하지 않는다.** 콘텐츠 변경은 `src/content/`에서, 생성 로직 변경은 `scripts/generate-content-index.mjs`에서 수행한다.

```
src/generated/  ← 직접 참조 금지
      ↓
src/lib/tabs.ts ← 유일한 소비자, re-export
      ↓
나머지 모든 파일 ← @/lib/tabs만 사용
```

## 콘텐츠 렌더링 파이프라인

1. **콘텐츠 작성**: `src/content/` 에 `<번호>. <id>.md` 또는 `<번호>. <id>.tsx` 형식으로 파일 생성
2. **자동 생성**: `npm run generate` → `src/generated/`에 탭 정의 + 콘텐츠 파일 생성
3. **탭 유형**: `{ type: 'markdown', content: string }` 또는 `{ type: 'component', component: ComponentType }`
4. **라우팅**: `app/page.tsx`(홈) + `app/[tabId]/page.tsx`(나머지)가 `lib/tabs.ts`를 통해 콘텐츠 접근
5. **렌더링**: `TabContentRenderer`가 타입에 따라 `MarkdownSection` 또는 React 컴포넌트로 렌더링
6. **새 탭 추가**: `src/content/`에 파일 추가 → `npm run generate` → 자동 반영 (코드 수정 불필요)

## 레이아웃

노트북 스타일 SSG 앱. 각 탭이 고유 URL 경로(`/resume`, `/career` 등)를 가지며, `NotebookShell`이 공통 껍데기(사이드바, 바인더, 탭스트립)를 제공하고 `children`으로 페이지 콘텐츠를 받는다. 데스크탑: 왼쪽 프로필 사이드바 + 바인더 스파인 + 종이 콘텐츠 + 오른쪽 탭 스트립. 모바일: 상단 프로필 + 가로 탭 + 콘텐츠. 마우스 휠/키보드로 탭 전환, 인접 탭 프리패치.

## 언어 규칙

- 응답, 주석 설명: **한국어**
- 변수명, 함수명, 커밋 메시지, 코드 주석: **영어**

### 네이밍
- 컴포넌트: PascalCase (`PostCard.tsx`)
- 함수/변수: camelCase (`getUserName`)
- 상수: UPPER_SNAKE_CASE (`MAX_POSTS_PER_PAGE`)
- 파일명: 컴포넌트는 PascalCase, 그 외는 kebab-case
- CSS 클래스: Tailwind 유틸리티 클래스 사용 (커스텀 클래스는 kebab-case)

### 컴포넌트 패턴
- 함수형 컴포넌트 + Arrow Function 사용
- Props 타입은 컴포넌트 파일 상단에 interface로 정의
- `'use client'`는 필요한 경우에만 사용 (기본은 Server Component)

### 임포트 순서
1. React/Next.js 내장 모듈
2. 외부 라이브러리
3. 내부 모듈 (`@/` alias)
4. 타입 임포트

## 커밋 메시지 규칙

Conventional Commits 형식을 따른다:

```
<type>: <description>
```

### 타입
- `feat`: 새 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포매팅 (동작 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 등 기타 변경
- `content`: 블로그 포스트 등 콘텐츠 추가/수정

## 브랜치 전략

- `main`: 배포 브랜치 (직접 커밋 금지, PR로만 merge)
- `dev`: 개발 브랜치 (기본 작업 브랜치)
- 기능 브랜치: `feat/<feature-name>`, `fix/<bug-name>` 등 dev에서 분기

## 빌드 & 배포

```bash
npm run build    # next build (static export → out/)
npm run dev      # 로컬 개발 서버
npm run lint     # ESLint 실행
npm run format   # Prettier 포매팅
```

- `main` 브랜치에 push/merge 시 GitHub Actions가 자동으로 빌드 & GitHub Pages 배포
- `next.config.ts`에서 `output: 'export'` 설정 필수

## 테마 전환 트랜지션 규칙

테마 색상 전환은 CSS Houdini `@property`로 `:root`에서 CSS 변수 자체를 보간한다. 개별 요소에는 색상 관련 `transition`을 설정하지 않는다.

- 새 색상 변수 추가 시: `globals.css`에 `@property` 등록 → `:root` transition 목록에 추가
- `var(--…)`로 색상을 지정한 요소에 색상 관련 CSS `transition` 금지 (Tailwind `transition-colors`, `transition-all` 포함). `:root`의 `@property`가 이미 색상을 부드럽게 전환하고 있는데, 요소에도 색상 transition이 있으면 전환이 두 번 겹쳐서 색이 이상하게 바뀐다
- `border`를 인라인 스타일로 쓸 때, `border: '1px solid var(--…)'`처럼 한 줄에 쓰면 안 된다. 이렇게 하면 변수 값이 바뀔 때 부드럽게 전환되지 않고 톡 끊겨서 바뀐다. 대신 `borderWidth`, `borderStyle`, `borderColor`로 나눠서 써야 한다
- 요소 레벨 `transition`은 레이아웃 속성(`width`, `opacity`, `transform` 등)에만 사용

## 작업 시 주의사항

- 기존 파일을 수정할 때는 반드시 먼저 Read로 읽어본 후 변경
- 불필요한 파일 생성 최소화
- 보안에 민감한 정보(.env, 키 등)는 절대 커밋하지 않음
- 과도한 엔지니어링 지양: 현재 필요한 만큼만 구현
