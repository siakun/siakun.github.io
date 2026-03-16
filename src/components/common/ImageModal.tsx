'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ImageModalProps {
  src: string;
  alt?: string;
  children: ReactNode;
}

// /certificates/[2025-08] Google AI Essentials.pdf → [2025-08] Google AI Essentials.pdf
const getFilename = (src: string) => {
  const parts = src.split('/');
  return decodeURIComponent(parts[parts.length - 1]);
};

const ImageModal = ({ src, alt, children }: ImageModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const openMethodRef = useRef<'click' | null>(null);

  const filename = getFilename(src);

  const close = useCallback(() => {
    setIsOpen(false);
    const method = openMethodRef.current;
    openMethodRef.current = null;

    if (method === 'click') {
      window.history.back();
    }
  }, []);

  const open = useCallback(() => {
    openMethodRef.current = 'click';
    setIsOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set('view', filename);
    window.history.pushState(null, '', url.toString());
  }, [filename]);

  // 브라우저 뒤로가기/앞으로가기
  useEffect(() => {
    if (!isOpen) return;
    const onPopState = () => {
      const viewParam = new URLSearchParams(window.location.search).get('view');
      if (viewParam !== filename) {
        openMethodRef.current = null;
        setIsOpen(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isOpen, filename]);

  // ESC 키
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="cursor-pointer underline underline-offset-2 transition-opacity hover:opacity-75"
        style={{ color: 'inherit', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
      >
        {children}
      </button>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--modal-bg)' }}
            onClick={close}
          >
            {/\.pdf$/i.test(src) ? (
              <iframe
                src={src}
                title={alt || ''}
                className="h-[90vh] w-[90vw] max-w-4xl rounded-lg"
                style={{ boxShadow: 'var(--modal-shadow)', backgroundColor: '#fff' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={src}
                alt={alt || ''}
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
                style={{ boxShadow: 'var(--modal-shadow)' }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default ImageModal;
