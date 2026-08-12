# 페이지 리소스 큐 관리 계획 (LRU Cache 기반)

## 1. 배경

블로그 확장 시 탭(페이지)이 수십 개로 늘어나면, 사용자가 순차 탐색할 때 방문한 모든 페이지의 JS 번들과 마크다운 콘텐츠가 브라우저 메모리에 누적된다. 브라우저는 한 번 로드한 JS 모듈을 새로고침 전까지 해제하지 않으므로, 페이지 수가 많아질수록 메모리 사용량이 선형적으로 증가한다.

## 2. 목표

- **최대 N개(기본값 10) 페이지의 콘텐츠만 메모리에 유지**
- N+1번째 페이지 로드 시 가장 오래된(또는 가장 오래 접근하지 않은) 페이지의 콘텐츠를 해제
- 해제된 페이지 재방문 시 다시 로드 (사용자에게 투명하게)
- 현재 SSG 아키텍처(방안 A, `router.push()` 기반)와 호환

## 3. 설계

### 3-A: JS 모듈 캐시 vs 콘텐츠 캐시

브라우저가 이미 로드한 JS 모듈(`import()`)은 **애플리케이션 레벨에서 해제할 수 없다** (ES Module spec 한계). 따라서 캐시 대상은 JS 번들 자체가 아니라 **렌더링된 콘텐츠(React 컴포넌트 트리 / 마크다운 문자열)**이다.

```
[접근 불가] JS 모듈 캐시: 브라우저 관할, 앱에서 제어 불가
[접근 가능] 렌더링 콘텐츠 캐시: React 상태로 관리 가능
```

### 3-B: 방안 비교

| | 방안 1: App Router 표준 유지 | 방안 2: 콘텐츠 캐시 레이어 추가 |
|---|---|---|
| **구조** | `router.push()` 그대로 사용, Next.js Router Cache에 의존 | `NotebookShell`에 콘텐츠 캐시 Context 추가, 직접 관리 |
| **캐시 제어** | Next.js 내부 캐시 정책에 의존 (제한적 제어) | LRU 큐로 직접 eviction 제어 |
| **메모리 절약** | Router Cache의 staletime 만료 시 자동 해제 (정확한 시점 불투명) | 명시적으로 N개 초과 시 해제 |
| **복잡도** | 낮음 | 중간 (Context + useRef 기반 큐) |
| **적합 시점** | 탭 20개 이하 | 탭 20개 이상, 콘텐츠가 무거운 경우 |

**권장:** 현재는 방안 1로 충분. 블로그 확장 시 방안 2를 도입.

### 3-C: 방안 2 상세 설계 (콘텐츠 캐시 레이어)

#### 핵심 구조

```typescript
interface CachedPage {
  tabId: string;
  content: React.ReactNode;  // 렌더링된 콘텐츠
  lastAccessed: number;       // 마지막 접근 타임스탬프
}

// LRU 큐 (최대 MAX_CACHED_PAGES개)
const pageCache = useRef<Map<string, CachedPage>>(new Map());
const MAX_CACHED_PAGES = 10;
```

#### 동작 흐름

```
사용자가 탭 T로 이동
  ├─ 캐시에 T 있음 → 캐시에서 꺼내 렌더링, lastAccessed 갱신
  └─ 캐시에 T 없음 → dynamic import로 콘텐츠 로드
       ├─ 캐시 크기 < MAX → 캐시에 추가
       └─ 캐시 크기 >= MAX → lastAccessed 가장 오래된 항목 제거 후 추가
```

#### 구현 위치

```
NotebookShell.tsx
  └─ PageCacheProvider (Context)
       ├─ pageCache: Map<string, CachedPage>
       ├─ getOrLoad(tabId): Promise<React.ReactNode>
       └─ evictOldest(): void

[tabId]/page.tsx
  └─ PageCacheProvider.getOrLoad(tabId) 호출
```

#### 주의사항

- **현재 탭은 절대 evict하지 않음** (사용 중인 콘텐츠 해제 방지)
- **인접 탭(이전/다음)도 evict 우선순위를 낮춤** (프리패치된 콘텐츠 보존)
- eviction은 콘텐츠(마크다운 문자열, React 엘리먼트)만 해제. 탭 메타데이터(tab-defs.ts)는 항상 유지.
- `router.push()` 기반 네비게이션은 그대로 유지. 캐시 레이어는 콘텐츠 로딩만 담당.

### 3-D: 현재 아키텍처에서의 준비 사항

방안 2 도입을 위해 현재 단계에서 미리 정리할 수 있는 것:

1. **탭 콘텐츠 로딩의 단일 진입점 확보**: 현재 각 `[tabId]/tabs/ResumeTab.tsx` 등이 직접 `import`하는 구조를 유지하되, 나중에 캐시 레이어를 끼울 수 있도록 `TabContentRenderer`를 통한 렌더링 패턴 유지.
2. **탭별 콘텐츠 파일 분리 완료**: `generated/tab-*.ts` 구조가 이미 준비되어 있으므로, dynamic import 전환 시 그대로 활용 가능.

## 4. 도입 시점 판단 기준

- 탭 수가 20개를 넘어가는 시점
- 또는 개별 콘텐츠가 무거워지는 시점 (이미지 많은 블로그 포스트 등)
- 브라우저 DevTools Memory 탭에서 탭 순회 시 메모리 사용량이 100MB를 초과하는 경우
