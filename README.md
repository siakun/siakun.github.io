# siakun.github.io

개인 포트폴리오 & 블로그 사이트.

## 기술 스택

- **Next.js** (Static Export) + **TypeScript**
- **Tailwind CSS**
- **ESLint** + **Prettier**
- **GitHub Actions** → **GitHub Pages** 자동 배포

## 프로젝트 구조 개요

이 프로젝트는 리포지토리에 HTML을 직접 올리는 방식이 **아닙니다.**
소스코드(`.tsx`)만 리포지토리에 존재하고, 빌드를 거쳐 HTML이 생성됩니다.

```
리포지토리 (소스코드)              빌드 결과물 (out/)
├── src/app/page.tsx              ├── index.html
├── src/app/layout.tsx    빌드    ├── 404.html
├── next.config.ts       ──→     ├── _next/
├── package.json                  │   └── static/ (JS, CSS)
└── ...                           └── favicon.ico
```

## 배포 방식

`main` 브랜치에 push하면 자동으로 배포됩니다.

```
main에 push
  ↓
GitHub Actions가 자동 실행 (.github/workflows/deploy.yml)
  ↓
GitHub이 제공하는 Ubuntu 가상머신에서:
  1. npm ci          (의존성 설치)
  2. npm run build   (빌드 → out/ 디렉터리 생성)
  ↓
out/ 내용물이 GitHub Pages 아티팩트로 업로드
  ↓
GitHub Pages CDN이 아티팩트를 서빙
  ↓
https://siakun.github.io 에 반영 완료
```

**핵심 포인트:**
- 리포지토리에는 소스코드만 있고, `out/`(빌드 결과)은 `.gitignore`에 의해 커밋되지 않음
- 빌드 결과물은 GitHub 내부 아티팩트 저장소에 별도로 저장됨
- 리포지토리 Settings → Pages → Source가 **"GitHub Actions"**으로 설정되어 있어야 함

## 로컬 실행 방법

### 개발 서버 (개발 중 사용)

```bash
npm run dev
```

`http://localhost:3000`에서 확인. 코드 수정 시 브라우저에 즉시 반영됨 (Hot Reload).

### 빌드 미리보기 (배포될 결과물 확인)

```bash
npm run build         # out/ 디렉터리에 정적 파일 생성
npx serve out         # out/ 디렉터리를 로컬 웹서버로 서빙
```

이렇게 하면 실제 `https://siakun.github.io`와 동일한 결과를 로컬에서 확인할 수 있음.

### 개발 서버 vs 빌드 미리보기 차이

| | `npm run dev` | `npm run build` + `npx serve out` |
|--|---------------|-----------------------------------|
| 용도 | 개발 중 실시간 확인 | 배포 전 최종 확인 |
| 속도 | 빠름 (즉시 반영) | 빌드 시간 필요 |
| 결과 | 개발 모드 (에러 상세 표시) | 프로덕션 모드 (실제 배포와 동일) |

## 기타 명령어

```bash
npm run lint          # ESLint 코드 검사
npm run format        # Prettier 코드 포매팅
```
