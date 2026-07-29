# 탭 네비게이션 & 프리패치 시스템

## 개요

`useTabNavigation` 훅이 탭 전환의 모든 경로(휠, 키보드, 클릭)를 단일 `navigateTab()` 함수로 통합 처리한다. App Router의 `router.push()` 기반 URL 전환과 인접 탭 프리패치를 결합하여 SSG 구조에서도 SPA에 가까운 전환 속도를 달성한다.

## 아키텍처

```
입력 소스                     통합 처리                    출력
─────────                  ──────────                  ──────
휠 (외부)  ─┐
키보드 ↑↓  ─┼─→ navigateTab(tabId) ─→ router.push() ─→ 페이지 전환
탭 클릭    ─┘         │
                      ├─→ prefetchedPaths 조회 (캐시 히트 판정)
                      └─→ navigationRequests 기록 (렌더 시간 측정)
```

### 탭 클릭의 navigateTab 통합

탭 버튼(`TabButton`)은 `<Link>` 컴포넌트를 사용하지만, 클릭 시 기본 네비게이션을 `e.preventDefault()`로 차단하고 `onTabClick` 콜백을 통해 `navigateTab()`을 호출한다.

```
NotebookShell
  └─ TabStrip (onTabClick={navigateTab})
       └─ TabButton (onClick → e.preventDefault() → onTabClick(tab.id))
```

이렇게 하면 모든 탭 전환이 `navigateTab()`을 경유하므로, 프리패치 캐시 히트 판정과 디버그 로그가 일관되게 동작한다. `<Link>`의 `href`는 접근성(우클릭 → 새 탭에서 열기)과 SEO를 위해 유지한다.

## 프리패치 전략

### 인접 탭 선택적 프리패치

모든 탭을 한꺼번에 프리패치하지 않고, 현재 탭의 **이전/다음 탭만** 프리패치한다. 휠 기반 순차 탐색이 주 사용 패턴이기 때문이다.

```
탭 순서: [home] [resume] [introduction] [career] [about]
                    ↑ 현재 탭
         ← 프리패치        프리패치 →
```

### 중복 프리패치 방지

모듈 레벨 `Set<string>`(`prefetchedPaths`)으로 이미 요청한 경로를 추적한다. 탭을 왔다 갔다 해도 같은 경로에 대해 `router.prefetch()`를 중복 호출하지 않는다.

```typescript
if (prefetchedPaths.has(path)) return; // 이미 캐시됨 → 서버 요청 안 함
router.prefetch(path);
prefetchedPaths.add(path);
```

### dev vs production 캐싱 차이

| | dev 모드 | production (static export) |
|---|---|---|
| **프리패치** | `router.prefetch()` 호출되지만 dev 서버가 캐시를 안 씀 | 정적 JS 청크를 브라우저 HTTP 캐시에 저장 |
| **네비게이션** | 매번 RSC 페이로드를 서버에서 새로 요청 | 캐시된 청크를 즉시 사용, 네트워크 요청 없음 |
| **체감** | 프리패치 효과 체감 어려움 | 인접 탭 전환이 거의 즉시 완료 |

production에서는 GitHub Pages가 정적 파일을 서빙하므로, 한번 프리패치된 JS 청크는 브라우저 캐시에서 바로 로드된다.

## Passive Wheel 이벤트 처리

### 문제

콘텐츠 영역의 스크롤을 직접 제어하기 위해 `e.preventDefault()`를 호출해야 하지만, React의 `onWheel`은 브라우저가 passive 이벤트 리스너로 등록하므로 `preventDefault()`가 차단된다.

```
Unable to preventDefault inside passive event listener invocation.
```

### 해결

React prop(`onWheel`) 대신 `useEffect` 내에서 네이티브 `addEventListener`로 `{ passive: false }` 옵션을 명시적으로 지정한다.

```typescript
// ❌ React onWheel: passive라 preventDefault 불가
<div onWheel={handleContentWheel} />

// ✅ 네이티브 리스너 (passive: false로 preventDefault 허용)
useEffect(() => {
  const el = contentRef.current;
  if (!el) return;
  const handler = (e: WheelEvent) => {
    e.preventDefault(); // 정상 동작
    // ...
  };
  el.addEventListener('wheel', handler, { passive: false });
  return () => el.removeEventListener('wheel', handler);
}, [deps]);
```

## 디버그 로그 시스템

`NODE_ENV === 'development'`일 때만 활성화되는 컬러 콘솔 로그로 프리패치 라이프사이클을 추적한다.

### 로그 태그

| 태그 | 색상 | 출력 시점 |
|------|------|-----------|
| `초기` | 🔵 파랑 | URL 직접 접속 / 새로고침 (SSG HTML hydration) |
| `프리패치` | 🟣 보라 | `router.prefetch()` 호출 직전 |
| `캐시` | 회색 | 프리패치 완료 후, 현재 캐시된 리소스 목록 |
| `전환` | 🟢/🟠 | `navigateTab()` 호출 시, 캐시 히트(녹색) / 미스(주황) |
| `수신` | 🔷 청록 | RSC 페이로드 네트워크 수신 완료, 전송 크기 표시 |
| `렌더` | 🟢/🟠 | pathname 변경 감지 시, 요청→렌더 소요 시간 |

### 출력 예시

```
[Nav:초기]     / 직접 로드 (SSG HTML에서 hydration)
[Nav:프리패치] /resume/ 서버 요청 (↓ resume)
[Nav:캐시]     프리패치된 리소스 목록: [/resume/]
[Nav:수신]     /resume/ ← 5.3KB (압축 해제: 11.9KB)
[Nav:전환]     → resume (/resume/) | 프리패치 ✅ 캐시됨
[Nav:렌더]     /resume/ 렌더 완료 (86.7ms) | 프리패치된 리소스 사용
[Nav:프리패치] /introduction/ 서버 요청 (↓ introduction)
[Nav:캐시]     프리패치된 리소스 목록: [/resume/, /, /introduction/]
```

### 네트워크 크기 추적

`PerformanceObserver`로 Next.js RSC 요청(`_rsc` 쿼리 파라미터)을 감지하여 전송 크기를 측정한다.

- `transferSize`: 실제 네트워크 전송 크기 (gzip 압축 후)
- `decodedBodySize`: 압축 해제 후 원본 크기
- 두 값이 다를 때만 "(압축 해제: NKB)" 표시

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/hooks/useTabNavigation.ts` | 탭 전환, 프리패치, 휠/키보드 핸들러, 디버그 로그 |
| `src/components/layout/NotebookShell.tsx` | navigateTab을 TabStrip에 전달, contentRef 스크롤 컨테이너 |
| `src/components/tabs/TabButton.tsx` | onTabClick prop으로 navigateTab 연동 |
