# Sprint 3 기능 및 매뉴얼 테스트 가이드

## 주요 변경 기능 요약

### 1. 글로벌 헤더/푸터 섹션 관리

- `/admin/globals`에서 헤더/푸터 글로벌 섹션 그룹 생성 및 편집 가능
- 그룹 생성 시 `name` 필수 입력
- 그룹 편집 시 섹션 draft 포맷: `+type::{json}` 활성화, `-type::{json}` 비활성화
- 저장 시 optimistic locking(`updatedAt` 체크) 적용, 충돌 시 경고 및 리로드 안내

### 2. 메뉴 관리

- `/admin/menus`에서 헤더/푸터 메뉴 생성 및 편집 가능
- 메뉴 아이템은 textarea에서 `label::href` 형식으로 입력
- 저장 시 기존 아이템 전체 삭제 후 재생성

### 3. 페이지/섹션 관리

- `/admin/pages/[id]`에서 페이지 정보 및 섹션 관리
- 섹션은 SectionBuilder에서 추가/변경/순서 조정 가능
- 섹션 변경 시 자동 저장(autosave) 및 optimistic locking 적용
- 최근 리비전 복원 기능(restore revision) 구현
- 섹션 저장 시 `SectionRevision` 이력 생성

### 4. 다국어/네비게이션

- `/[locale]/[slug]` 경로에서 다국어 페이지 렌더링
- locale이 없을 경우 fallback(default locale) 처리
- 헤더/푸터 메뉴 및 글로벌 섹션이 public 페이지에 렌더링됨

### 5. 내부 링크/참조

- 이미지 섹션 등에서 내부 페이지 참조 시 locale-aware 링크(`/{locale}/{slug}`) 제공

### 6. 권한/RBAC

- `admin`: 편집/발행/삭제/복원 가능
- `publisher`: 편집/발행/삭제/복원 가능
- `editor`: 편집 가능, 발행/삭제/복원 불가
- `reviewer`: 읽기 전용

### 7. SEO/크롤링

- locale 페이지 메타데이터(canonical/alternates/OG/Twitter) 생성
- `/robots.txt`, `/sitemap.xml` 제공
- 기본 slug 경로(`/[slug]`)는 기본 locale 경로로 리다이렉트

## 매뉴얼 테스트 체크리스트

### 글로벌 섹션

- [ ] `/admin/globals`에서 그룹 생성 시 name 입력 필수 확인
- [ ] 그룹 편집에서 draft 포맷(`+type::{json}`)으로 섹션 추가/수정/비활성화 테스트
- [ ] 저장 시 충돌 발생(동시 수정) 시 conflict 배너 및 리로드 동작 확인
- [ ] 헤더/푸터 글로벌 섹션이 public 페이지에 정상 렌더링되는지 확인

### 메뉴

- [ ] `/admin/menus`에서 메뉴 생성 및 이름 입력, 아이템 추가/수정/삭제 테스트
- [ ] 메뉴 아이템 textarea에서 `label::href` 포맷 입력 후 저장, public 페이지에서 메뉴 렌더링 확인

### 페이지/섹션

- [ ] `/admin/pages/[id]`에서 페이지 정보(타이틀, 슬러그, locale 등) 수정 및 저장 동작 확인
- [ ] SectionBuilder에서 섹션 추가/변경/순서 조정, autosave 및 수동 저장 동작 확인
- [ ] 동시 수정 시 optimistic locking(충돌 배너) 동작 확인
- [ ] 리비전 복원(restore revision) 버튼 클릭 시 정상 복원되는지 확인
- [ ] 저장 후 DB의 `SectionRevision` 버전 증가 확인

### RBAC

- [ ] `admin` 로그인: 메타/섹션 저장, publish, delete, restore 모두 가능
- [ ] `publisher` 로그인: 메타/섹션 저장, publish, delete, restore 모두 가능
- [ ] `editor` 로그인: 메타/섹션 저장 가능, publish/delete/restore 버튼 또는 동작 제한 확인
- [ ] `reviewer` 로그인: 메타/섹션 편집 입력/저장 비활성화(읽기 전용) 확인

### 다국어/네비게이션

- [ ] `/[locale]/[slug]` 경로에서 각 locale별 페이지 접근 및 fallback 동작 확인
- [ ] 헤더/푸터 메뉴 및 글로벌 섹션이 locale별로 정상 렌더링되는지 확인
- [ ] `/[slug]` 접근 시 기본 locale 경로로 리다이렉트되는지 확인

### 내부 링크/참조

- [ ] 이미지 섹션 등에서 내부 페이지 참조 시 locale-aware 링크(`/{locale}/{slug}`)가 생성되는지 확인

## 기타

- [ ] `npm run lint` 실행 시 에러 없이 통과되는지 확인
- [ ] `npm run build` 실행 시 빌드 성공하는지 확인
- [ ] `/robots.txt`와 `/sitemap.xml` 접근 시 정상 응답 확인
- [ ] 페이지 소스/메타에서 canonical/alternates/OG/Twitter 태그 확인

## 개발/운영 에러 체크리스트

- [ ] `npm run dev` 실행 시 "You cannot use different slug names for the same dynamic path" 에러가 발생하지 않는지 확인
  - **동적 경로 파일의 param 이름이 일치하는지 점검**
  - 예: `[slug]` vs `[locale]/[slug]` → param 이름이 다르면 에러 발생
- [ ] 경로 구조 변경 시, 기존 public/locale 경로와 default 경로가 정상적으로 동작하는지 확인

---

> 이 문서는 Sprint 3 기능 변경 및 매뉴얼 테스트 방법을 정리한 가이드입니다. 실제 배포 전 체크리스트를 따라 기능별로 수동 테스트를 진행하세요.
