# CMS 기능 벤치마크 및 Site Builder 도입 우선순위

최종 업데이트: 2026-03-02

## 문서 목적

주요 CMS(WordPress, Strapi, Directus, Sanity, Contentful 공개 정보)를 비교해,
현재 Site Builder에 **실사용 가치를 빠르게 올릴 기능**을 선별하고 실행 우선순위를 정리한다.

---

## 1) 평가 기준 (실사용 중심)

기능 도입 우선순위는 아래 4개 기준으로 평가한다.

1. 사용자 가치 (편집자 생산성/실수 감소)
2. 제품 적합성 (현재 구조와의 호환성)
3. 구현 난이도 (DB/UX/권한/테스트 복잡도)
4. 운영 리스크 (오작동 시 영향도)

### 점수 해석

- `높음`: 바로 도입 후보
- `중간`: 선행조건 확인 후 도입
- `낮음`: 장기 후보 또는 제외

---

## 2) 벤치마크 요약 (타 CMS 강점)

### WordPress

- 강점: General/Reading/Discussion 등 설정 체계가 명확
- 강점: Revisions 비교/복원, autosave 정책이 안정적
- 시사점: “편집 안전성”과 “설정 명확성”이 기본 사용자 신뢰를 만듦

### Strapi

- 강점: Review Workflow(다단계 검수, 역할별 stage 권한)
- 강점: Admin/Plugin/API 구성의 분리도가 높음
- 시사점: 팀 협업 환경에서 승인 흐름과 권한 모델이 품질을 좌우

### Directus

- 강점: Flows(이벤트 트리거 기반 자동화), 실행 로그 가시성
- 강점: 운영 자동화와 감사 가능한 기록 구조
- 시사점: 반복 운영 작업은 수동 UX보다 자동화/로그 체계가 효율적

### Sanity

- 강점: Content Releases(여러 문서를 묶어 예약/동시 배포)
- 강점: 배포 단위를 “문서 하나”가 아닌 “릴리스 묶음”으로 관리
- 시사점: 캠페인/이벤트성 배포에서 실수율과 롤백 비용을 크게 줄임

### Contentful (수집 제한)

- 공개 문서 수집이 추적 리다이렉트로 제한되어 상세 추출은 제한됨
- 일반적으로 알려진 핵심 축: 환경 분리, 권한 정책, 스케줄/워크플로우

---

## 3) 현재 Site Builder 상태 매핑

이미 구현됨:

- 페이지/섹션 편집, 메뉴/글로벌 섹션 관리
- RBAC(`admin/publisher/editor/reviewer`) 기본 분리
- 리비전 저장/복원, preview
- 기본 Settings 메뉴(사이트명/기본 SEO/indexing)

갭(실사용 관점):

- 리비전 비교(diff) UI 부재
- 예약 발행(스케줄) 부재
- 검수 워크플로우(stage/assignee) 부재
- 설정 변경 이력(Audit) 부재
- 운영 자동화(트리거/웹훅) 부재

---

## 4) 도입 후보 선별 (권장)

아래는 현재 코드베이스와 사용자 가치 기준으로 선별한 “도입 우선” 기능이다.

### P0 (즉시 착수 권장)

#### 1. 리비전 비교(Diff View)

- 벤치마크 근거: WordPress revisions compare
- 사용자 가치: 복원 전/후 판단 정확도 상승, 실수 복원 비용 감소
- 구현 난이도: 중간
- 제안 범위:
  - 페이지 메타/섹션 JSON의 `before vs after` diff 표시
  - 복원 전 확인 단계에서 요약 diff 제공

#### 2. 설정 변경 이력(Audit for Settings)

- 벤치마크 근거: Directus logs, 엔터프라이즈 CMS 감사 추적 관행
- 사용자 가치: 운영/보안/장애 원인 파악 속도 개선
- 구현 난이도: 낮음~중간
- 제안 범위:
  - `SiteSettingRevision` 또는 `AuditLog` 테이블
  - 변경 주체(role), 변경 필드, 시각 기록

#### 3. 예약 발행 단일 스케줄 (Single page schedule)

- 벤치마크 근거: Sanity releases(간소화 버전), Contentful scheduled actions 관행
- 사용자 가치: 야간/캠페인 배포 자동화
- 구현 난이도: 중간
- 제안 범위:
  - 페이지별 `publishAt` 저장
  - 서버 배치(또는 cron)로 예약 시점 publish 실행

### P1 (다음 단계)

#### 4. 검수 워크플로우(Stage + Assignee)

- 벤치마크 근거: Strapi review workflow
- 사용자 가치: 다인 협업에서 승인 누락/권한 혼선 감소
- 구현 난이도: 중간~높음
- 제안 범위:
  - `draft -> in_review -> approved -> published` 상태
  - 단계별 role 제한, 담당자(assignee) 지정

#### 5. 릴리스 묶음 배포(Lightweight Release)

- 벤치마크 근거: Sanity Content Releases
- 사용자 가치: 여러 페이지 동시 반영, 캠페인 운영 안정성 상승
- 구현 난이도: 높음
- 제안 범위:
  - 여러 페이지를 릴리스에 묶고 일괄 publish
  - 릴리스 단위 기록/실패 처리

### P2 (장기)

#### 6. 운영 자동화 플로우(Webhook/Trigger)

- 벤치마크 근거: Directus Flows
- 사용자 가치: 반복 업무 자동화(슬랙 알림, 외부 캐시 purge)
- 구현 난이도: 높음
- 제안 범위:
  - publish/restore/delete 이벤트 웹훅
  - 실패 재시도와 실행 로그

#### 7. 환경 승격(Preview/Stage/Prod)

- 벤치마크 근거: Headless CMS environment 전략
- 사용자 가치: 운영 사고 감소, 배포 검증 품질 향상
- 구현 난이도: 높음

---

## 5) 도입 우선순위 스코어 카드

| 후보 기능         | 사용자 가치 | 구현 난이도 | 운영 리스크 | 우선순위 |
| ----------------- | ----------- | ----------- | ----------- | -------- |
| 리비전 비교(Diff) | 높음        | 중간        | 낮음        | P0       |
| 설정 변경 Audit   | 높음        | 낮음~중간   | 낮음        | P0       |
| 단일 예약 발행    | 높음        | 중간        | 중간        | P0       |
| 검수 워크플로우   | 높음        | 중간~높음   | 중간        | P1       |
| 릴리스 묶음 배포  | 중간~높음   | 높음        | 중간~높음   | P1       |
| 자동화 플로우     | 중간        | 높음        | 중간        | P2       |
| 환경 승격         | 중간        | 높음        | 낮음~중간   | P2       |

---

## 6) 이번 스프린트 반영된 항목 (완료)

Settings 기반 최소 기능은 이미 반영됨:

1. `siteName`
2. `siteTagline`
3. `contactEmail`
4. `siteUrl`
5. `defaultSeoTitle`
6. `defaultSeoDescription`
7. `disableIndexing`
8. `adminBrandLabel`

적용 위치:

- 관리자: `/admin/settings`
- 데이터: `SiteSetting` 싱글턴
- 런타임: root metadata / home / robots / admin header

---

## 7) 다음 실행안 (실행 가능한 형태)

### Sprint N+1 제안

1. 리비전 diff UI
2. Settings audit log
3. 단일 예약 발행

### 각 항목 완료 기준(Definition of Done)

- 기능 단위 수동 테스트 체크리스트 추가
- 권한 정책(`editor/reviewer`) 위반 시 차단 검증
- 실패 시 사용자 메시지 + 로그 추적 가능
- 기존 publish/restore 흐름 회귀 없음

---

## 8) 비고

- 본 문서는 “실제 사용자 가치 + 현재 구조 적합성” 기준으로 선별했으며,
  기능 수가 아니라 운영 안정성과 협업 효율에 우선순위를 둔다.
- Contentful 관련 상세 페이지는 수집 경로 제한으로 정밀 인용이 제한되어,
  공개적으로 널리 알려진 워크플로우 축 중심으로만 반영했다.
