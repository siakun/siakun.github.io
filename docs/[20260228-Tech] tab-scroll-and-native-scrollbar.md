# 탭 스트립 스크롤 & 네이티브 스크롤바 이슈

## 배경

모바일(가로)과 데스크탑(세로) 탭 스트립은 탭 수가 많아지거나 뷰포트가 작아지면 콘텐츠가 넘칠 수 있다. 이때 VSCode처럼 스크롤로 숨겨진 탭에 접근하되, 네이티브 스크롤바는 숨기고 페이드 그라데이션으로 힌트를 제공하는 방식을 채택했다.

## 구현

### TabScrollContainer

`src/components/tabs/TabButton.tsx`에 위치. 가로/세로 공용 스크롤 컨테이너.

```
TabScrollContainer
├── 외부 wrapper (relative, 크기 고정)
├── 내부 scroll div (overflow-auto, scrollbar 숨김)
├── 시작 페이드 (canScrollStart일 때 표시)
└── 끝 페이드 (canScrollEnd일 때 표시)
```

- `vertical` prop으로 축 전환 (모바일: 가로, 데스크탑: 세로)
- `ResizeObserver` + `scroll` 이벤트로 페이드 표시 여부 갱신
- 스크롤바 숨김: 인라인 `scrollbarWidth: 'none'` + CSS `.tab-strip-scroll::-webkit-scrollbar`

### 툴팁

`TabButton`에서 텍스트가 ellipsis로 잘리는지 감지하여 (`scrollWidth > clientWidth`), 잘릴 때만 `title` 속성을 추가해 hover 시 전체 텍스트를 표시한다.

## 네이티브 스크롤바 이슈

### 문제

CSS에서 `scrollbar-width: none`을 클래스로 선언했으나, 데스크탑 세로 탭 스트립에서 네이티브 스크롤바가 그대로 표시됨.

### 원인

Tailwind CSS v4는 `@import 'tailwindcss'`로 로드되며, 내부적으로 `@layer`를 사용한다. `globals.css`에 작성한 커스텀 CSS가 Tailwind의 유틸리티 레이어(`overflow-y-auto` 등)보다 **낮은 우선순위**를 가질 수 있다. 특히 `overflow-y-auto`가 적용된 요소에서 `scrollbar-width: none`이 CSS 캐스케이드 규칙에 의해 무시되는 현상이 발생했다.

```
/* globals.css - Tailwind 레이어 외부 */
.tab-strip-scroll {
  scrollbar-width: none;  /* ← Tailwind 유틸리티보다 우선순위가 낮아 무시됨 */
}
```

실제 `getComputedStyle()` 확인 결과:
```
scrollbarWidth: "auto"  // none이 아닌 auto → 적용 안 됨
```

### 해결

**이중 전략**으로 해결:

1. **인라인 스타일** (Firefox 등 표준 브라우저):
   ```tsx
   <div style={{ scrollbarWidth: 'none' }}>
   ```
   인라인 스타일은 어떤 CSS 레이어보다 우선순위가 높으므로 확실하게 적용된다.

2. **CSS `!important`** (Chrome/Safari webkit 계열):
   ```css
   .tab-strip-scroll::-webkit-scrollbar {
     display: none !important;
     width: 0 !important;
     height: 0 !important;
   }
   ```
   `::-webkit-scrollbar`는 인라인 스타일로 제어할 수 없는 pseudo-element이므로 CSS에서 `!important`로 강제한다.

### 교훈

- Tailwind v4에서 커스텀 CSS 작성 시 **레이어 우선순위 충돌**을 주의해야 한다.
- 스크롤바 숨김처럼 반드시 적용되어야 하는 스타일은 **인라인 스타일 + CSS `!important` 이중 적용**이 안전하다.
- `getComputedStyle()`로 실제 적용 여부를 반드시 검증하자.

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/components/tabs/TabButton.tsx` | TabScrollContainer, TabButton 툴팁 |
| `src/app/globals.css` | `.tab-strip-scroll` 스크롤바 숨김 CSS |
