'use client';

import { useState, useEffect, useCallback } from 'react';

import { projects, type Project } from '@/data/projects';
import ProjectCard from '@/components/sections/portfolio/ProjectCard';
import ProjectModal from '@/components/sections/portfolio/ProjectModal';

interface PortfolioContentProps {
  // 탭 팔레트 색(var(--tab-palette-N) 토큰). 카드/모달 배지 배경에 전달된다
  accentColor: string;
}

const PortfolioContent = ({ accentColor }: PortfolioContentProps) => {
  const [selected, setSelected] = useState<Project | null>(null);

  // 카드 클릭: 모달 열기 + ?project= 히스토리 push (모바일 뒤로가기로 닫기 위함)
  const open = useCallback((project: Project) => {
    setSelected(project);
    const url = new URL(window.location.href);
    url.searchParams.set('project', project.id);
    window.history.pushState(null, '', url.toString());
  }, []);

  // 닫기: open에서 push한 히스토리를 되돌리면 popstate가 상태를 동기화한다
  const close = useCallback(() => {
    window.history.back();
  }, []);

  // 뒤로가기/앞으로가기로 ?project= 파라미터와 모달 상태를 동기화
  useEffect(() => {
    const sync = () => {
      const id = new URLSearchParams(window.location.search).get('project');
      setSelected(id ? (projects.find((p) => p.id === id) ?? null) : null);
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return (
    <div className="w-full pb-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            accentColor={accentColor}
            onSelect={open}
          />
        ))}
      </div>

      {selected && (
        <ProjectModal project={selected} accentColor={accentColor} onClose={close} />
      )}
    </div>
  );
};

export default PortfolioContent;
