'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// URL ?view= 파라미터로 /certificates/ 파일을 모달로 표시하는 글로벌 컴포넌트
// 어떤 탭에서든 동작하며, 파일이 페이지에 링크되어 있지 않아도 열 수 있음
const ViewParamModal = () => {
  const [viewFile, setViewFile] = useState<string | null>(null);

  const close = useCallback(() => {
    setViewFile(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.replaceState(null, '', url.toString());
  }, []);

  // 페이지 로드 시 ?view= 파라미터 확인
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('view');
    if (param) {
      setViewFile(param);
    }
  }, []);

  // popstate로 URL 변경 감지 (앞으로가기 등)
  useEffect(() => {
    const onPopState = () => {
      const param = new URLSearchParams(window.location.search).get('view');
      setViewFile(param);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ESC 키
  useEffect(() => {
    if (!viewFile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewFile, close]);

  if (!viewFile) return null;

  const src = `/certificates/${viewFile}`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--modal-bg)' }}
      onClick={close}
    >
      {/\.pdf$/i.test(viewFile) ? (
        <iframe
          src={src}
          title={viewFile}
          className="h-[90vh] w-[90vw] max-w-4xl rounded-lg"
          style={{ boxShadow: 'var(--modal-shadow)', backgroundColor: '#fff' }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={src}
          alt={viewFile}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          style={{ boxShadow: 'var(--modal-shadow)' }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>,
    document.body,
  );
};

export default ViewParamModal;
