# 코드 리팩토링 계획

낮은 우선순위 → 높은 우선순위 순서. 한 단계씩 진행하며, 각 단계는 독립적으로 커밋 가능.

---

## 1단계: 데드 코드 제거 (낮음)

### 1-1. `globals.css` — 미사용 CSS 클래스 삭제

`.swipe-chevron-left`, `.swipe-chevron-right` 클래스가 존재하지 않는 키프레임(`swipe-chevron-bounce-left`, `swipe-chevron-bounce-right`)을 참조하며, 코드베이스 어디서도 사용되지 않음.

**변경**: `globals.css:511-516` 삭제 (6줄)

### 1-2. `_4. introduction.md.bak` 백업 파일 삭제

`src/content/` 내 `.bak` 파일. 이전 버전 백업이며 git 히스토리에 남아 있으므로 삭제해도 무방.

**변경**: `src/content/_4. introduction.md.bak` 삭제

---

## 2단계: inline style → Tailwind 임의값 통일 (낮음)

### 배경

컴포넌트 전반에 `style={{ color: 'var(--text-primary)' }}` 패턴이 50곳 이상 반복됨. Tailwind 임의값 문법(`text-[var(--text-primary)]`)으로 교체하면 JSX가 깔끔해지고 스타일이 className에 집중됨.

### 주의사항 (CLAUDE.md 규칙)

- `var(--…)` 색상 변수를 사용하는 요소에 **색상 관련 `transition` 금지** — `@property`가 `:root`에서 이미 처리
- `border` shorthand 사용 금지 — `borderWidth`, `borderStyle`, `borderColor` 분리 필수
- 따라서 `border` 관련 inline style은 Tailwind로 옮길 때 `border border-[var(--border-warm)]` 같은 형식 사용 (이미 `.border-warm` 유틸리티 클래스도 존재)

### 대상 파일 및 변경 패턴

| 파일 | 주요 변경 |
|------|----------|
| `MarkdownSection.tsx` | `style={{ color: 'var(--text-primary)' }}` → `className="text-[var(--text-primary)]"` 등 ~15곳 |
| `ProfileSidebar.tsx` | 사이드바 색상 inline style → Tailwind 임의값 |
| `ProfileMobile.tsx` | 동일 패턴 |
| `NotebookShell.tsx` | 배경색, 테두리색 등 |
| `ImageModal.tsx` | 모달 배경/그림자 |
| `ViewParamModal.tsx` | 모달 배경/그림자 |

### 변환 불가 항목 (inline style 유지)

- `boxShadow: 'var(--modal-shadow)'` — Tailwind에 shadow 임의값으로 CSS 변수를 넣으면 동작하지 않는 경우가 있음. 테스트 후 판단
- `background: linear-gradient(...)` — 복합 값은 inline 유지가 자연스러움
- 동적 값 (`accentColor` prop 등) — 런타임에 결정되므로 inline 필수

---

## 3단계: `TabButton.tsx` 매직 넘버 정리 (낮음)

### 현재 상태

```typescript
const ACTIVE_SIZE = '32px';      // 86줄
const INACTIVE_SIZE = '26px';    // 87줄
const ACTIVE_MAX = '150px';      // 88줄
const INACTIVE_MAX = '130px';    // 89줄
const VERTICAL_WORD_SPACING = '-0.6em'; // 90줄
const FADE_SIZE = 24;            // 91줄
const ACCENT_SIZE = '6px';       // 268줄
const STRIP_SIZE = '44px';       // 269줄
```

### 변경

상수들이 이미 파일 상단에 네이밍되어 있어 가독성 문제는 크지 않음. 단, 탭 버튼과 탭 스트립의 상수가 파일 내 떨어져 있으므로 하나의 config 객체로 그룹화:

```typescript
const TAB_CONFIG = {
  button: {
    activeSize: '32px',
    inactiveSize: '26px',
    activeMaxCross: '150px',
    inactiveMaxCross: '130px',
    verticalWordSpacing: '-0.6em',
  },
  strip: {
    size: '44px',
    accentSize: '6px',
    fadeSize: 24,
  },
} as const;
```

---

## 4단계: 모달 중복 로직 통합 (중간)

### 현재 상태

`ImageModal.tsx`(108줄)과 `ViewParamModal.tsx`(119줄)에 동일 패턴 반복:

| 공통 로직 | ImageModal | ViewParamModal |
|-----------|------------|----------------|
| ESC 키 닫기 | `useEffect` + `keydown` | `useEffect` + `keydown` |
| popstate 감지 | `useEffect` + `popstate` | `useEffect` + `popstate` |
| PDF/이미지 분기 렌더링 | `/\.pdf$/i.test(src)` → iframe/img | `/\.pdf$/i.test(viewFile)` → iframe/img |
| 모달 오버레이 | `backgroundColor: 'var(--modal-bg)'` | `backgroundColor: 'var(--modal-bg)'` |
| 콘텐츠 클릭 전파 차단 | `onClick={e => e.stopPropagation()}` | `onClick={e => e.stopPropagation()}` |

### 차이점

| | ImageModal | ViewParamModal |
|---|---|---|
| 열기 방식 | 클릭 → `history.pushState` | URL `?view=` 파라미터 읽기 |
| 닫기 방식 | `history.back()` | `replaceState`로 `?view=` 제거 |
| 에러 처리 | 없음 | `hasError` → `NotFoundContent` 렌더 |
| src 결정 | props로 직접 전달 | `?view=` → `/certificates/${viewFile}` |

### 변경안

**A. `useModalEsc` 훅 추출** — ESC 키 핸들링만 분리 (최소 변경)

```typescript
// src/hooks/useModalEsc.ts
const useModalEsc = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);
};
```

**B. `<MediaViewer>` 컴포넌트 추출** — PDF/이미지 분기 렌더링 통합

```typescript
// src/components/common/MediaViewer.tsx
interface MediaViewerProps {
  src: string;
  alt?: string;
  onError?: () => void;
}
const MediaViewer = ({ src, alt, onError }: MediaViewerProps) => {
  if (/\.pdf$/i.test(src)) {
    return <iframe src={src} title={alt || ''} className="h-[90vh] w-[90vw] max-w-4xl rounded-lg" style={{ boxShadow: 'var(--modal-shadow)', backgroundColor: '#fff' }} onClick={e => e.stopPropagation()} />;
  }
  return <img src={src} alt={alt || ''} className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" style={{ boxShadow: 'var(--modal-shadow)' }} onClick={e => e.stopPropagation()} onError={onError} />;
};
```

**추천**: A + B 모두 적용. 두 모달의 열기/닫기 방식이 근본적으로 다르므로(push vs replace) 전체 모달 로직까지 하나의 훅으로 합치는 것은 오히려 복잡도 증가. ESC 훅 + MediaViewer 추출이 적절한 수준.

---

## 5단계: `useTabNavigation` 분리 (중간)

### 현재 상태 (281줄, useEffect 7개)

| 역할 | 줄 수 | useEffect |
|------|-------|-----------|
| LRU 프리패치 캐시 | 15-54 | - (모듈 레벨) |
| 탭 전환 함수 | 82-112 | - |
| pathname 변경 리셋 | 114-125 | 1개 |
| 인접 탭 프리패치 | 127-154 | 1개 |
| 키보드 네비게이션 | 156-166 | 1개 |
| 외부 휠 → 탭 전환 | 168-182 | - (이벤트 핸들러) |
| 터치 스와이프 | 184-211 | 1개 |
| 내부 휠 → 스크롤 + boundary | 213-270 | 1개 |

### 변경안

현재 훅이 하나의 `contentRef`와 `navigateAdjacent`를 공유하므로, 완전 분리보다는 **역할별 그룹 분리 + 오케스트레이터 패턴**이 적합:

```
useTabNavigation.ts (오케스트레이터, ~40줄)
├── useTabCore.ts        — 탭 상태 + 전환 함수 + pathname 리셋 (~50줄)
├── useTabPrefetch.ts    — LRU 캐시 + 인접 프리패치 (~80줄)
├── useTabKeyboard.ts    — 키보드 ArrowUp/Down (~15줄)
├── useTabWheel.ts       — 외부 휠 + 내부 스크롤 + boundary 감지 (~80줄)
└── useTabTouch.ts       — 터치 스와이프 (~30줄)
```

**주의**: `prefetchLRU`는 모듈 레벨 싱글턴이므로 별도 파일(`prefetch-cache.ts`)로 분리하면 임포트가 명확해짐.

---

## 진행 순서 요약

| 단계 | 난이도 | 예상 변경 | 리스크 |
|------|--------|----------|--------|
| 1. 데드 코드 제거 | 매우 낮음 | 삭제만 | 없음 |
| 2. inline style → Tailwind | 낮음 | className 교체 | 테마 전환 시 시각적 확인 필요 |
| 3. 매직 넘버 정리 | 낮음 | 상수 그룹화 | 없음 |
| 4. 모달 통합 | 중간 | 훅 + 컴포넌트 추출 | 모달 동작 회귀 테스트 필요 |
| 5. 훅 분리 | 중간 | 파일 5개 분리 | 네비게이션 동작 회귀 테스트 필요 |
