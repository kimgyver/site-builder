# 예약 발행(Scheduled Publish) 운영 가이드

최종 업데이트: 2026-03-07

## 1) 기능 개요

예약 발행은 페이지를 `Draft` 상태로 유지한 채 발행 시각(`publishAt`)을 저장해두고,
주기 실행되는 서버 작업이 시간이 도달한 페이지를 자동으로 `Published`로 전환하는 기능이다.

현재 구현 범위:

- 페이지 단위 단일 스케줄(`publishAt`)
- 주기 체크 후 자동 발행
- 발행 시 `lastPublishedAt` 갱신
- 발행 성공 시 `publishAt` 자동 초기화

---

## 2) 동작 구조

### 관리자 저장

- 관리자 페이지(`/admin/pages/[id]`)의 `Scheduled publish (optional)` 입력값이 저장되면
  `Page.publishAt`에 반영된다.
- 저장 시 `Status`가 `PUBLISHED`이면 `publishAt`은 자동으로 `null`로 저장된다.

### 주기 실행(API)

- 엔드포인트: `/api/cron/publish`
- 실행 조건:
  - `status = DRAFT`
  - `publishAt <= now`
- 처리:
  - `status = PUBLISHED`
  - `publishAt = null`
  - `lastPublishedAt = now`

### 배포 스케줄

- Vercel cron 설정: [vercel.json](../vercel.json)
- 현재 주기: `*/5 * * * *` (5분마다 1회)

---

## 3) 필수 설정

## 3-1. DB 마이그레이션

예약 발행 필드가 포함된 마이그레이션이 DB에 적용되어 있어야 한다.

- 로컬 개발: `npx prisma migrate dev`
- 배포 환경: `npx prisma migrate deploy`

관련 마이그레이션:

- `20260307161000_add_page_publish_schedule`

## 3-2. 환경변수

- `CRON_SECRET`: 크론 API 보호용 토큰

설정 위치:

- 로컬: `.env`
- 배포: Vercel Project Settings → Environment Variables

보안 권장:

- `.env.example`에는 실제 비밀값을 넣지 않는다.
- 유출된 값은 즉시 rotate(새 값으로 교체)한다.

## 3-3. Vercel cron

[vercel.json](../vercel.json)에 아래 항목이 있어야 한다.

- `crons[].path = "/api/cron/publish"`
- `crons[].schedule = "*/5 * * * *"`

---

## 4) 편집자 사용법

1. `/admin/pages/[id]` 진입
2. `Status`를 `Draft`로 설정
3. `Scheduled publish (optional)`에 발행 시각 입력
4. `Save changes`

주의:

- `Published` 상태로 저장하면 예약값은 자동 해제된다.
- 예약은 페이지별로 따로 저장된다.
- `CRON_SECRET`는 페이지에 입력하는 값이 아니며, 서버 환경변수로만 관리한다.

---

## 5) 로컬 테스트 방법

Vercel cron은 로컬에서 자동 실행되지 않는다. 아래 방식으로 테스트한다.

## 5-1. 1회 실행

- `npm run cron:publish:once`

## 5-2. 주기 실행

- `npm run cron:publish:watch`

추가 옵션:

- `CRON_BASE_URL` (기본: `http://localhost:3000`)
- `CRON_INTERVAL_MS` (기본: `60000`)

예시:

- `CRON_INTERVAL_MS=300000 npm run cron:publish:watch` (5분 간격)

---

## 6) 운영 점검 체크리스트

배포 전:

- [ ] `CRON_SECRET`가 Vercel Production에 설정되어 있음
- [ ] 최신 Prisma migration이 배포 DB에 적용됨
- [ ] [vercel.json](../vercel.json)의 cron path/schedule 확인

배포 후:

- [ ] 예약된 Draft 페이지를 1건 생성
- [ ] 예약 시간 경과 후 자동 `Published` 전환 확인
- [ ] `lastPublishedAt` 갱신 확인

---

## 7) 장애 대응/트러블슈팅

## 7-1. 401 UNAUTHORIZED

원인:

- `CRON_SECRET` 불일치 또는 Authorization 헤더 누락

확인:

- 환경변수 값과 요청 헤더 `Bearer <CRON_SECRET>` 일치 여부

## 7-2. 503 DB_UNAVAILABLE 또는 PostgreSQL connection closed

원인:

- DB 연결이 일시적으로 닫히거나 락 획득 지연

현재 동작:

- 크론 API는 재시도 가능한 DB 에러에서 1회 재시도 후 실패 시 503 반환

조치:

- 잠시 후 재호출
- DB 상태(Neon/PG 연결 제한, 일시 중단 여부) 점검

## 7-3. 예약했는데 발행 안 됨

점검 순서:

1. 페이지 상태가 `Draft`인지 확인
2. `publishAt`이 현재 시각보다 이전인지 확인
3. cron이 실제 호출되는지 Vercel logs 확인
4. `/api/cron/publish` 응답 코드/본문 확인

---

## 8) 시간대(Timezone) 주의

`datetime-local` 입력은 타임존 오프셋 없이 전달된다.
환경(브라우저/서버)의 타임존 차이가 있으면 기대 시각과 실제 발행 시각이 다르게 느껴질 수 있다.
운영 시에는 기준 타임존(예: UTC 또는 KST)을 팀 내에서 명확히 정해두는 것을 권장한다.
