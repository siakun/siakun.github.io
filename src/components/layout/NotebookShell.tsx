'use client';

import { useRef } from 'react';
import { ALL_TABS } from '@/lib/tabs';
import { TabStrip } from '@/components/tabs/TabButton';
import useTabNavigation from '@/hooks/useTabNavigation';
import ProfileSidebar from '@/components/layout/ProfileSidebar';
import ProfileMobile from '@/components/layout/ProfileMobile';
import HashRedirect from '@/components/common/HashRedirect';
import ScrollDownHint from '@/components/common/ScrollDownHint';
import ViewParamModal from '@/components/common/ViewParamModal';

interface NotebookShellProps {
  children: React.ReactNode;
}

const NotebookShell = ({ children }: NotebookShellProps) => {
  const {
    currentTabId,
    hint,
    contentRef,
    handleOuterWheel,
    navigateTab,
  } = useTabNavigation(ALL_TABS);

  const activeTabDef = ALL_TABS.find((t) => t.id === currentTabId) ?? ALL_TABS[0];
  const hintShown = useRef(false);
  const showScrollHint = currentTabId === 'home' && !hintShown.current;
  if (currentTabId !== 'home' && !hintShown.current) hintShown.current = true;

  return (
    <div className="flex h-screen items-stretch justify-center">
      <HashRedirect />
      <ViewParamModal />
      {/* 노트북 전체 컨테이너 */}
      <div
        onWheel={handleOuterWheel}
        className="shadow-transition relative flex w-full overflow-hidden xl:max-w-[1100px] xl:my-6 xl:rounded-md"
        style={{ boxShadow: 'var(--shadow-notebook)' }}
      >

        {/* === 왼쪽 사이드바 (프로필) === */}
        <ProfileSidebar />

        {/* === 바인더 스파인 === */}
        <div
          className="relative hidden w-5 shrink-0 md:block"
          style={{
            background: 'linear-gradient(to right, var(--spine), var(--spine-light))',
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="shadow-transition absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full"
              style={{
                top: `${18 + i * 16}%`,
                backgroundColor: 'var(--desk)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--spine)',
                boxShadow: 'var(--shadow-binder-pin)',
              }}
            />
          ))}
        </div>

        {/* === 메인 콘텐츠 영역 === */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* 모바일: 프로필 헤더 */}
          <ProfileMobile />

          {/* 모바일: 탭 스트립 */}
          <div className="min-w-0 md:hidden">
            <TabStrip activeTab={currentTabId} accentColor={activeTabDef.color} variant="mobile" onTabClick={navigateTab} />
          </div>

          {/* 종이 콘텐츠 */}
          <div
            className="relative flex-1 overflow-hidden py-4 md:py-6"
            style={{ backgroundColor: 'var(--paper)' }}
          >
            <div
              ref={contentRef}
              className="notebook-content h-full overflow-y-auto py-8 pl-8 pr-4 mr-3 md:py-10 md:pl-10 md:pr-6 md:mr-4"
            >
              <div key={currentTabId} className="animate-content-in">
                {children}
              </div>
            </div>

            {/* 스크롤 끝 힌트 */}
            {hint && (
              <div
                className={`pointer-events-none absolute left-0 right-0 flex justify-center animate-fade-in ${hint.direction === 'down' ? 'bottom-3' : 'top-3'}`}
              >
                <span
                  className="rounded-full px-4 py-1 text-xs"
                  style={{
                    backgroundColor: 'var(--hint-bg)',
                    color: 'var(--hint-text)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--hint-border)',
                  }}
                >
                  {hint.direction === 'down'
                    ? `스크롤하여 이동 → ${hint.tab.label || (hint.tab.icon === 'about' ? 'About' : '홈')}`
                    : `${hint.tab.label || (hint.tab.icon === 'home' ? '홈' : 'About')} ← 스크롤하여 이동`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 첫 방문 스크롤/스와이프 힌트 — 노트북 컨테이너 기준 */}
        {showScrollHint && (
          <ScrollDownHint scrollRef={contentRef} />
        )}

        {/* 데스크탑: 탭 스트립 */}
        <div className="hidden md:flex">
          <TabStrip activeTab={currentTabId} accentColor={activeTabDef.color} variant="desktop" onTabClick={navigateTab} />
        </div>
      </div>
    </div>
  );
};

export default NotebookShell;
