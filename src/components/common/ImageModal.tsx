'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ImageModalProps {
  src: string;
  alt?: string;
  children: ReactNode;
}

const ImageModal = ({ src, alt, children }: ImageModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

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
        onClick={() => setIsOpen(true)}
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
