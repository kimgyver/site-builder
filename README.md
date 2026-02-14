This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## CMS Phase A notes

Current reality-check status is tracked in [docs/cms-phase-status.md](docs/cms-phase-status.md).

Phase A (complete) includes:

- Admin auth middleware for `/admin` routes
- RBAC with `publisher` and `editor` roles
- Draft preview via `?preview=<token>`
- Revision history tracking on metadata and sections updates
- Publisher-only revision restore (rollback)

Phase 2 (complete) includes:

- Slash command quick insert in rich editor (type `/`)
- Slash command keyboard navigation (`↑`/`↓`/`Enter`/`Esc`)
- Section duplicate action in page builder
- Clipboard image paste support in rich editor
- Drag-and-drop image insert support in rich editor

Set these environment variables for admin authentication:

- `ADMIN_PUBLISHER_PASSWORD`: publisher login password (can publish/delete).
- `ADMIN_EDITOR_PASSWORD`: editor login password (can edit, cannot publish/delete).
- `ADMIN_PASSWORD`: legacy publisher fallback password.
- `ADMIN_SESSION_KEY`: optional session cookie value override (recommended random string).

How to set them:

1. Copy [.env.example](.env.example) to [.env](.env).
2. Set your own secure values.
3. Restart the dev server.

Recommended way to generate `ADMIN_SESSION_KEY`:

- `openssl rand -base64 48`

After pulling schema changes, run:

- `npx prisma migrate dev --name phase-a-revisions`
- `npx prisma generate`

## 수동 테스트 절차 (Phase A / B 분리, 상세판)

아래 절차는 QA 실행용 상세 버전입니다. 각 테스트케이스는 **테스트 ID / 전제조건 / 수행 절차 / 기대 결과**로 구성됩니다.

### 0) 공통 준비

#### 환경

1. `.env` 설정 확인
   - `DATABASE_URL`
   - `ADMIN_PUBLISHER_PASSWORD`
   - `ADMIN_EDITOR_PASSWORD`
   - `ADMIN_SESSION_KEY`
2. 서버 실행: `npm run dev`
3. 브라우저 준비
   - 일반 창 1개
   - 시크릿 창 또는 다른 브라우저 1개(동시수정/stale 테스트용)

#### 공통 테스트 데이터

- 테스트 slug 예시: `qa-phase-a-b`
- 테스트 제목 예시: `QA Phase A/B Page`
- 리치텍스트 샘플 문구: `테스트 본문`

---

## Phase A 테스트 (인증/워크플로우 안정성)

### A-01 로그인/권한 분리

- 전제조건: 로그인되지 않은 상태
- 절차:
  1.  `/admin/login` 접속
  2.  `editor` 계정으로 로그인
  3.  페이지 상세에서 저장은 가능, publish/delete/restore 시도
  4.  로그아웃 후 `publisher` 계정 로그인
  5.  publish/delete/restore 재시도
- 기대 결과:
  - `editor`: 편집/저장은 가능, publish/delete/restore는 제한
  - `publisher`: publish/delete/restore 가능

### A-02 관리자 라우트 보호

- 전제조건: 로그아웃 상태
- 절차:
  1.  `/admin` 직접 접속
  2.  `/admin/pages/new` 직접 접속
- 기대 결과:
  - 로그인 페이지로 리다이렉트됨

### A-03 신규 페이지 생성 및 기본 저장

- 전제조건: `publisher` 로그인
- 절차:
  1.  `/admin/pages/new`에서 slug/title 입력 후 생성
  2.  상세 진입 후 제목/설명 수정
  3.  저장 실행
- 기대 결과:
  - 목록/상세에 정상 노출
  - 저장 후 데이터가 유지됨

### A-04 Draft Preview

- 전제조건: 미발행 또는 draft 변경이 있는 페이지
- 절차:
  1.  Admin 상세의 preview 링크(`?preview=<token>`) 실행
  2.  일반 공개 URL(`/[slug]`) 확인
- 기대 결과:
  - preview URL: draft 반영됨
  - 일반 URL: 발행 상태 규칙대로 노출

### A-05 Revision 생성/복원

- 전제조건: `publisher` 로그인, 테스트 페이지 존재
- 절차:
  1.  본문을 2~3회 수정 후 저장
  2.  리비전 목록에서 버전 증가 확인
  3.  과거 버전 restore 실행
- 기대 결과:
  - 리비전이 순차적으로 누적
  - restore 후 해당 시점 내용으로 되돌아감
  - restore 자체도 새 리비전으로 기록됨

### A-06 Stale 충돌 방지

- 전제조건: 동일 페이지를 창 A/B에 동시 오픈
- 절차:
  1.  창 A에서 내용 수정 후 저장
  2.  창 B에서 이전 상태로 저장 시도
- 기대 결과:
  - 창 B 저장이 stale 감지로 차단되거나 경고됨

### A-07 발행 반영 확인

- 전제조건: draft 변경 존재, `publisher` 로그인
- 절차:
  1.  publish 실행
  2.  public URL 확인
- 기대 결과:
  - 최신 편집 내용이 public에 반영됨
  - 발행 시각/이력 관련 정보가 정상 기록됨

---

## Phase B (Phase 2) 테스트 (편집 UX 확장)

### B-01 섹션 빌더 조작

- 전제조건: Admin 페이지 상세 진입
- 절차:
  1.  `hero/text/richText/image/faq` 섹션 각각 1개 이상 추가
  2.  임의 섹션 `Duplicate`
  3.  `↑/↓` 이동, `Hide/Show`, `Delete` 수행
  4.  저장 후 새로고침
- 기대 결과:
  - 복제는 원본 바로 아래 생성
  - 순서/노출/삭제 상태가 저장 후 유지

### B-02 Slash 메뉴 표시 및 검색

- 전제조건: richText 섹션 활성
- 절차:
  1.  에디터에서 `/` 입력
  2.  `h2`, `table`, `image` 등 검색어 입력
- 기대 결과:
  - slash 메뉴가 표시됨
  - 검색어에 따라 결과가 필터링됨

### B-03 Slash 키보드 내비게이션

- 전제조건: slash 메뉴 열린 상태
- 절차:
  1.  `↑/↓`로 항목 이동
  2.  `Enter`로 항목 실행
  3.  `Esc`로 메뉴 닫기
- 기대 결과:
  - 활성 항목 하이라이트 이동
  - 선택 시 해당 블록 삽입
  - Esc로 즉시 닫힘

### B-04 이미지 URL 삽입

- 전제조건: richText 커서 위치 지정
- 절차:
  1.  `Image` 버튼 클릭
  2.  URL/alt 입력
  3.  저장 후 새로고침
- 기대 결과:
  - 이미지 삽입됨
  - 새로고침 후 유지됨

### B-05 클립보드 붙여넣기 이미지

- 전제조건: 운영체제 클립보드에 이미지 존재(스크린샷 복사 등)
- 절차:
  1.  에디터에 커서 두고 paste
  2.  저장 후 새로고침
- 기대 결과:
  - 이미지가 즉시 삽입됨
  - 저장/재로드 후에도 유지됨

### B-06 이미지 드래그앤드롭

- 전제조건: 로컬 이미지 파일 준비
- 절차:
  1.  파일을 에디터로 드롭
  2.  저장 후 새로고침
- 기대 결과:
  - 드롭 즉시 이미지 삽입
  - 저장/재로드 후 유지

### B-07 이미지 리사이즈/정렬

- 전제조건: 에디터 내 이미지 1개 이상
- 절차:
  1.  너비 슬라이더 조절
  2.  좌/중/우 정렬 버튼 클릭
  3.  저장 후 새로고침
- 기대 결과:
  - 너비/정렬이 적용되고 재접속 후 유지

### B-08 테이블 편집 회귀

- 전제조건: 테이블 삽입된 상태
- 절차:
  1.  셀 정렬/배경/보더 변경
  2.  행/열 추가·삭제
  3.  merge/split 수행
  4.  저장 후 public 페이지 확인
- 기대 결과:
  - 편집 동작 모두 정상
  - public 렌더에서도 구조/스타일 유지

---

## 완료 판정 기준

- **Phase A Pass 조건**
  - A-01 ~ A-07 전부 통과
- **Phase B Pass 조건**
  - B-01 ~ B-08 전부 통과

## 장애 기록 템플릿 (권장)

- 테스트 ID:
- 실행 환경(브라우저/OS):
- 재현 절차:
- 기대 결과:
- 실제 결과:
- 스크린샷/영상:
- 콘솔/네트워크 로그:
- 심각도(High/Medium/Low):
