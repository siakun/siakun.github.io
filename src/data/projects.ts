// 포트폴리오 프로젝트 데이터.
// 카드 그리드(ProjectCard)와 상세 모달(ProjectModal)이 이 배열 하나를 소비한다.
// 항목 추가는 이 파일에 객체를 넣는 것으로 끝나며, 컴포넌트 수정은 필요 없다.

export type ProjectCategory = 'project' | 'photo';

// 카테고리 -> 카드/모달 배지에 표시할 라벨
export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  project: 'PROJECT',
  photo: 'PHOTO',
};

export interface ProjectLink {
  // 버튼에 표시할 라벨 (예: 'GitHub', 'Twitter')
  label: string;
  // 이동할 외부 URL
  url: string;
}

export interface Project {
  // 고유 식별자. 상세 모달의 URL 파라미터(?project=)로 쓰인다. kebab-case 권장
  id: string;
  // 카드와 모달에 표시할 제목
  title: string;
  // 카테고리. 카드 배지 라벨로 표시되며, 나중에 필터를 붙일 때 기준이 된다
  category: ProjectCategory;
  // 'YYYY-MM-DD' 형식 날짜. 카드 우상단에 표시된다
  date: string;
  // 태그 목록. '#' 없이 단어만 넣는다 (렌더링 시 '#'이 붙는다)
  tags: string[];
  // 카드 썸네일 경로. public/ 기준 절대경로 (예: '/projects/foo.png'). 비우거나 로드 실패 시 플레이스홀더가 표시된다
  thumbnail?: string;
  // 상세 모달에서 보여줄 이미지들. 비우면 thumbnail을 사용한다
  images?: string[];
  // 상세 모달 본문 설명. 줄바꿈은 그대로 표시된다
  description?: string;
  // 상세 모달 하단의 외부 링크 버튼 (선택)
  link?: ProjectLink;
}

// 아래는 구조 시연용 예시 데이터다. 실제 프로젝트로 교체한다.
// 썸네일 경로(/projects/*)에 해당하는 파일이 없으면 그라데이션 플레이스홀더가 표시되므로,
// 이미지를 준비하기 전에도 그리드 레이아웃을 그대로 확인할 수 있다.
export const projects: Project[] = [
  {
    id: 'example-alpha',
    title: '예시 프로젝트 Alpha',
    category: 'project',
    date: '2026-06-01',
    tags: ['TypeScript', 'Next.js'],
    thumbnail: '/projects/alpha.png',
    description:
      '여기에 프로젝트 설명을 적는다.\n줄바꿈은 그대로 반영되므로 문단을 나눌 수 있다.',
    link: { label: 'GitHub', url: 'https://github.com/siakun' },
  },
  {
    id: 'example-bravo',
    title: '예시 프로젝트 Bravo',
    category: 'project',
    date: '2026-05-12',
    tags: ['Unity', 'Shader'],
    thumbnail: '/projects/bravo.png',
    description: '두 번째 예시 항목이다. 태그와 날짜, 설명을 자유롭게 채운다.',
  },
  {
    id: 'example-charlie',
    title: '예시 프로젝트 Charlie',
    category: 'project',
    date: '2026-04-03',
    tags: ['Web'],
    thumbnail: '/projects/charlie.png',
  },
  {
    id: 'example-delta',
    title: '예시 사진 Delta',
    category: 'photo',
    date: '2026-03-20',
    tags: ['Photo'],
    thumbnail: '/projects/delta.png',
    description: 'photo 카테고리 예시다. 배지가 PHOTO로 표시된다.',
  },
];
