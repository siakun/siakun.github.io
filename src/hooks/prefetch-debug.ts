/**
 * 프리패치 디버그 유틸리티.
 * development 환경에서만 콘솔에 프리패치/네비게이션 로그를 출력한다.
 * production 빌드에서는 모든 함수가 no-op이므로 번들 영향 최소.
 */

const DEBUG = process.env.NODE_ENV === 'development';

function log(tag: string, msg: string, color: string = '#888') {
  if (!DEBUG) return;
  console.log(
    `%c[Nav:${tag}]%c ${msg}`,
    `color:${color};font-weight:bold`,
    'color:inherit',
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

// path → request timestamp (navigateTab 시점 기록 → 렌더 완료 시점에서 소요 시간 계산)
const navigationRequests = new Map<string, number>();

export const prefetchDebug = {
  /** navigateTab 호출 시점에 전환 대상 경로와 캐시 히트 여부를 기록 */
  logNavigate(tabId: string, targetPath: string, wasPrefetched: boolean) {
    if (!DEBUG) return;
    navigationRequests.set(targetPath, performance.now());
    log(
      '전환',
      `→ ${tabId} (${targetPath}) | 프리패치 ${wasPrefetched ? '✅ 캐시됨' : '❌ 없음 (cold load)'}`,
      wasPrefetched ? '#4caf50' : '#ff9800',
    );
  },

  /** pathname 변경 후 렌더가 끝난 시점에 소요 시간 또는 직접 로드 여부를 출력 */
  logRender(pathname: string, wasPrefetched: boolean) {
    if (!DEBUG) return;
    const requestTime = navigationRequests.get(pathname);
    if (requestTime) {
      const elapsed = (performance.now() - requestTime).toFixed(1);
      log(
        '렌더',
        `${pathname} 렌더 완료 (${elapsed}ms) | ${wasPrefetched ? '프리패치된 리소스 사용' : '사전 로드 없이 렌더링'}`,
        wasPrefetched ? '#4caf50' : '#ff9800',
      );
      navigationRequests.delete(pathname);
    } else {
      log('초기', `${pathname} 직접 로드 (SSG HTML에서 hydration)`, '#2196f3');
    }
  },

  /** 인접 탭 프리패치 요청 시 */
  logPrefetch(path: string, tabId: string, direction: string) {
    if (!DEBUG) return;
    log('프리패치', `${path} 서버 요청 (${direction} ${tabId})`, '#9c27b0');
  },

  /** LRU 캐시에서 오래된 항목 제거 시 */
  logEvict(evicted: string, cacheSize: number, maxSize: number) {
    if (!DEBUG) return;
    log('제거', `${evicted} 캐시에서 제거됨 (LRU ${cacheSize}/${maxSize})`, '#e91e63');
  },

  /** 현재 캐시 상태 출력 */
  logCacheState(entries: string[], cacheSize: number, maxSize: number) {
    if (!DEBUG) return;
    log('캐시', `프리패치 캐시 (${cacheSize}/${maxSize}): [${entries.join(', ')}]`, '#607d8b');
  },
};

// RSC 페이로드 네트워크 크기 추적 (development에서 모듈 로드 시 1회 실행)
if (DEBUG && typeof window !== 'undefined') {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const res = entry as PerformanceResourceTiming;
      try {
        const url = new URL(res.name);
        if (!url.searchParams.has('_rsc')) continue;

        const path = url.pathname;
        const size = res.transferSize;
        const decoded = res.decodedBodySize;

        log(
          '수신',
          `${path} ← ${formatBytes(size)}${decoded !== size ? ` (압축 해제: ${formatBytes(decoded)})` : ''}`,
          '#00bcd4',
        );
      } catch { /* ignore non-URL entries */ }
    }
  });

  observer.observe({ type: 'resource', buffered: false });
}
