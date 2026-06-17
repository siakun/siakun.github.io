'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { CATEGORY_LABEL, type Project } from '@/data/projects';

interface ProjectModalProps {
  project: Project;
  // 탭 팔레트 색(var(--tab-palette-N) 토큰 문자열). 배지 배경에 사용한다
  accentColor: string;
  onClose: () => void;
}

const ProjectModal = ({ project, accentColor, onClose }: ProjectModalProps) => {
  // 모달이 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 모달에 표시할 이미지: images 우선, 없으면 thumbnail
  const images =
    project.images && project.images.length > 0
      ? project.images
      : project.thumbnail
        ? [project.thumbnail]
        : [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--modal-bg)' }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--paper)', boxShadow: 'var(--modal-shadow)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm"
          style={{ backgroundColor: 'var(--modal-bg)', color: '#fff' }}
        >
          ✕
        </button>

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto">
          {images.map((src, i) => (
            <img key={src + i} src={src} alt={`${project.title} ${i + 1}`} className="w-full" />
          ))}

          <div className="p-6">
            <div className="flex items-center justify-between">
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider"
                style={{ backgroundColor: accentColor, color: '#fff' }}
              >
                {CATEGORY_LABEL[project.category]}
              </span>
              <time className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {project.date}
              </time>
            </div>

            <h2 className="mt-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {project.title}
            </h2>

            {project.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md px-2 py-0.5 text-xs"
                    style={{ backgroundColor: 'var(--kraft)', color: 'var(--text-muted)' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {project.description && (
              <p
                className="mt-5 whitespace-pre-line text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {project.description}
              </p>
            )}

            {project.link && (
              <a
                href={project.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-lg px-5 py-2 text-sm font-medium"
                style={{
                  backgroundColor: 'var(--sidebar-btn-bg)',
                  color: 'var(--sidebar-btn-text)',
                }}
              >
                {project.link.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ProjectModal;
