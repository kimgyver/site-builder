# CMS Settings 벤치마크 및 Site Builder 적용안

최종 업데이트: 2026-03-02

## 목적

설정 메뉴 부재 상태를 해소하기 위해, 주요 CMS의 공통 설정 축을 비교하고 현재 앱에서 즉시 분리 가능한 항목을 정의한다.

## 비교 대상 (요약)

### WordPress (General / Reading)

- 사이트 이름/태그라인
- 관리자 이메일
- 사이트 URL
- 언어/시간대
- 정적 홈/포스트 페이지, 검색엔진 인덱싱 제어

### Strapi (Admin / Config 중심)

- Admin 패널/브랜딩 관련 설정
- 플러그인 및 API 설정
- RBAC/권한/토큰/환경별 설정
- 업로드/미디어/GraphQL 등 기능별 구성

### Headless CMS 공통 패턴 (Directus/Contentful 포함)

- 프로젝트(공간) 단위의 전역 설정
- 로케일 및 콘텐츠 기본값
- SEO 기본값
- 접근 권한/역할 정책
- 운영성(환경 분리, API 정책, 인덱싱/공개 정책)

## Site Builder에 바로 뽑아낸 설정

이번 스프린트에서 우선 적용한 최소 설정 집합:

1. `siteName` (사이트 이름)
2. `siteTagline` (사이트 설명)
3. `contactEmail` (운영 연락 이메일)
4. `siteUrl` (정규 사이트 URL)
5. `defaultSeoTitle` (기본 SEO title)
6. `defaultSeoDescription` (기본 SEO description)
7. `disableIndexing` (전체 인덱싱 금지)
8. `adminBrandLabel` (관리자 상단 브랜드 문구)

## 적용 위치

- 관리자: `/admin/settings`
- 데이터: `SiteSetting` (싱글턴 레코드, key=`default`)
- 런타임 반영:
  - 루트 메타데이터 (`src/app/layout.tsx`)
  - 홈 화면 문구 (`src/app/page.tsx`)
  - robots 정책 (`src/app/robots.ts`)
  - 관리자 상단 브랜드 (`src/app/admin/layout.tsx`)

## 후속 후보 (이번 범위 제외)

- 기본 locale를 DB 설정으로 승격 (`DEFAULT_LOCALE` 동적화)
- Sitemap 기준 URL을 전역 설정으로 완전 통합
- 소셜 OG 이미지/트위터 카드 기본값
- 회원가입/공개범위/콘텐츠 만료 정책
- Settings 변경 이력(Audit) 및 롤백
