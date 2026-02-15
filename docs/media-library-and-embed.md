# Media Library & Embed Section Usage

## 이미지, 유튜브, 구글맵스 링크 처리 방식

### 1. 미디어 라이브러리

- 이미지 파일은 썸네일 미리보기로 표시됩니다.
- 유튜브/구글맵스 링크는 "YouTube", "Google Maps" 등 텍스트로 구분되어 표시됩니다.
- 이미지가 아닌 링크는 썸네일 대신 아이콘/텍스트로 안전하게 표시됩니다.

### 2. 섹션 저장 및 렌더링

- 이미지 섹션에 이미지 URL을 입력하면 뷰 화면에서 `<img>` 태그로 렌더링됩니다.
- 이미지 섹션에 유튜브/구글맵스 embed 링크를 입력하면 자동으로 iframe(embed)으로 렌더링됩니다.
  - 유튜브: `youtube.com`, `youtu.be` 링크 → iframe
  - 구글맵스: `https://www.google.com/maps/embed?pb=...` 또는 pb/q 파라미터가 있는 경우 → iframe
- 일반 지도 URL이나 embed용이 아닌 링크는 렌더링되지 않습니다.

### 3. embed 섹션

- 직접 embed 섹션을 추가하면 유튜브/구글맵스 링크를 입력하여 iframe으로 렌더링할 수 있습니다.
- provider 선택(YouTube/Google Maps) 및 URL 입력 방식 지원

### 4. 자동 분기 로직

- 이미지 섹션에서 유튜브/구글맵스 embed URL이 들어오면 자동으로 iframe으로 렌더링됩니다.
- 일반 이미지 링크는 `<img>`로 렌더링됩니다.

### 5. UX 개선 사항

- 깨진 이미지 미리보기 방지: 이미지가 아닌 링크는 썸네일 대신 텍스트/아이콘으로 표시
- 뷰 화면에서 embed 링크는 항상 iframe으로 렌더링

---

## 개발 참고

- `src/components/SectionBuilder.tsx`: 미디어 라이브러리 미리보기, 섹션 입력 UI
- `src/app/[slug]/page.tsx`: 섹션별 렌더링 로직, 자동 embed 분기

---

## 예시

- 이미지: `https://imgnews.pstatic.net/image/076/2024/01/01/202401010000000000.jpg`
- 유튜브: `https://www.youtube.com/watch?v=tybOi4hJzFQ`
- 구글맵스 embed: `https://www.google.com/maps/embed?pb=...`

---

## 문의/개선 요청

- 추가 UX 개선, 자동 분류, 지원 패턴 등은 개발팀에 문의 바랍니다.
