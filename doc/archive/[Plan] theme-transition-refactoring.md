# 테마 전환 트랜지션 리팩토링

## 최종 상태 (리팩토링 완료)

### 아키텍처

`@property`로 CSS 변수 자체를 `<color>` 타입으로 등록하고, `:root`에서 변수 레벨 트랜지션을 선언한다. 개별 요소에 `transition: color` 등을 설정할 필요가 없다.

```
CSS 변수 변경 → 변수 자체가 보간 → 모든 참조 요소에 자동 반영
```

### 변경된 파일 (3개)

| 파일 | 변경 내용 |
|------|----------|
| `globals.css` | `@property` 등록 (48개 색상 변수), `:root`에 변수 트랜지션 선언, `*` 전역 트랜지션 제거, `.tab-btn`은 레이아웃 트랜지션만 유지, `color-scheme: normal !important` 제거 |
| `layout.tsx` | `ThemeProvider`에 `enableColorScheme={false}` prop 추가 |
| `NotebookShell.tsx` | 바인더 스파인 `linear-gradient(to right, var(--spine), var(--spine-light))` 복원 |

### 구조

```css
/* 1. @property 등록 — CSS 변수를 보간 가능한 <color> 타입으로 선언 */
@property --paper { syntax: '<color>'; inherits: true; initial-value: #fdfcfa; }
@property --kraft { syntax: '<color>'; inherits: true; initial-value: #e8dece; }
/* ... 총 48개 ... */

/* 2. :root에서 변수 레벨 트랜지션 선언 */
:root {
  --theme-td: 0.2s;
  transition:
    --paper var(--theme-td) ease,
    --kraft var(--theme-td) ease,
    /* ... 모든 @property 변수 ... */;
}

/* 3. .tab-btn은 레이아웃 트랜지션만 (색상은 @property가 처리) */
.tab-btn {
  transition: width 150ms ease, height 150ms ease, ...;
}
```

### 이전 방식 vs 현재 방식

| | 이전 (`*` 전역) | 현재 (`@property`) |
|---|---|---|
| **관리 포인트** | `*` 규칙 + 충돌 요소마다 override | `@property` 등록 + `:root` transition 1개 |
| **충돌 위험** | 높음 — `transition` shorthand 충돌 | 없음 — 요소별 transition 불필요 |
| **상속 배수** | `color`가 상속 속성이라 부모→자식 중첩 | 없음 — 변수 레벨에서 보간 |
| **gradient 트랜지션** | 불가 (solid color로 대체) | 가능 (변수가 보간되므로) |
| **color-scheme** | CSS `!important`로 강제 override | `enableColorScheme={false}` 공식 API |
| **브라우저 지원** | 모든 브라우저 | Chrome 85+, Firefox 128+, Safari 15.4+ |

### 해결된 이슈들

1. **프로필 아바타 border 번쩍임** — `*` 선택자 누락 → `@property`로 변수 레벨 트랜지션
2. **본문 배경색 번쩍임** — 선택자 누락 → 동일
3. **사이드바 버튼 번쩍임** — `<a>` 태그 누락 → 동일
4. **바인더 스파인 gradient 소실** — `linear-gradient` 트랜지션 불가 → `@property`로 gradient 복원
5. **탭 버튼 transition 중복** — `*`와 `.tab-btn` 이중 선언 → `.tab-btn`은 레이아웃만
6. **텍스트 color 상속 배수** — `color`가 상속 속성이라 중첩 → 변수 레벨 보간으로 해결
7. **`color-scheme` 이중 전환** — CSS `!important` → `enableColorScheme={false}` 공식 API

### 새 CSS 변수 추가 시 체크리스트

테마 간 값이 다른 색상 변수를 추가할 때:
1. `globals.css` 상단에 `@property --new-var { syntax: '<color>'; inherits: true; initial-value: <라이트모드 값>; }` 추가
2. `:root`의 `transition` 목록에 `--new-var var(--theme-td) ease` 추가
3. `:root`와 `[data-theme="dark"]`에 변수 값 선언
