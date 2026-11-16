# cursor-chat

여러 브라우저 창에서 서로의 마우스 커서를 실시간으로 보고, 커서 옆 말풍선으로 짧게 대화하는 예제입니다. (Next.js 14 Pages Router + `ws`)

## 실행

```bash
npm install
npm run dev
```

- 앱: http://localhost:3000 (자동으로 `/cursor`로 이동)
- WebSocket 서버: ws://localhost:3001 (`src/server.js`, `npm run dev`가 함께 실행)

## 사용법

- 창 위에서 마우스를 움직이면 다른 접속자 화면에 내 커서가 표시됩니다.
- `/` 키를 누르면 커서 옆에 입력창이 열리고, 입력하는 내용이 다른 접속자에게 실시간으로 보입니다.
- 5초간 입력이 없거나, 비어 있는 입력창에서 포커스가 빠지면 입력창이 닫힙니다.
- 접속자마다 서버가 말풍선 색을 정해 줍니다. 창을 닫으면 다른 화면에서 커서가 사라집니다.

## 설정 (선택)

| 환경 변수 | 기본값 | 설명 |
|---|---|---|
| `WS_PORT` | `3001` | WebSocket 서버 포트 |
| `NEXT_PUBLIC_WS_URL` | `ws://<현재 호스트>:3001` | 브라우저가 접속할 WebSocket 주소 |

## 파일 구조

- `src/server.js`: WebSocket 서버. 접속자 ID·색 발급, 커서·채팅 상태 중계, 퇴장 알림
- `src/pages/cursor.tsx`: 커서·말풍선 화면
