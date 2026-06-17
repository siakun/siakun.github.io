'use client';

import { useState } from 'react';

import { CATEGORY_LABEL, type Project } from '@/data/projects';

interface ProjectCardProps {
  project: Project;
  // 탭 팔레트 색(var(--tab-palette-N) 토큰 문자열). 배지 배경에 사용하며 테마 전환도 따라간다
  accentColor: string;
  onSelect: (project: Project) => void;
}

const ProjectCard = ({ project, accentColor, onSelect }: ProjectCardProps) => {
  // 썸네일 로드 실패 시 그라데이션 플레이스홀더로 대체 (깨진 이미지 아이콘 방지)
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(project.thumbnail) && !imgError;

  return (
    <button
      type="button"
      onClick={() => onSelect(project)}
      className="border-warm shadow-transition group flex cursor-pointer flex-col rounded-2xl p-3 text-left transition-transform duration-200 hover:-translate-y-1"
      style={{ backgroundColor: 'var(--kraft-light)', boxShadow: 'var(--shadow-tab)' }}
    >
      {/* 썸네일 */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl">
        {showImage ? (
          <img
            src={project.thumbnail}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--kraft), var(--kraft-dark))',
              color: 'var(--text-muted)',
            }}
          >
            <span className="px-4 text-center text-sm font-medium">{project.title}</span>
          </div>
        )}
      </div>

      {/* 배지 + 날짜 */}
      <div className="mt-4 flex items-center justify-between">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider"
          style={{ backgroundColor: accentColor, color: '#fff' }}
        >
          {CATEGORY_LABEL[project.category]}
        </span>
        <time className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {project.date}
        </time>
      </div>

      {/* 제목 */}
      <h3 className="mt-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {project.title}
      </h3>

      {/* 태그 */}
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
    </button>
  );
};

export default ProjectCard;
