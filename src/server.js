// 실시간 커서·채팅 공유용 WebSocket 서버 (Next 앱과 별도 프로세스로 실행)
const { randomUUID } = require("crypto");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.WS_PORT) || 3001;
const COLOR_COUNT = 10; // src/pages/cursor.tsx 의 COLOR_PALETTE 길이와 맞출 것
const MAX_TEXT_LENGTH = 200;

/** @type {Map<WebSocket, { id: string, colorId: number, x: number | null, y: number | null, text: string, showMsg: boolean }>} */
const peers = new Map();
let nextColorId = 0;

const wss = new WebSocketServer({ port: PORT, maxPayload: 4 * 1024 });

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(sender, data) {
  for (const ws of peers.keys()) {
    if (ws !== sender) send(ws, data);
  }
}

wss.on("connection", (ws) => {
  // ID·색은 서버가 연결마다 발급 (클라이언트가 보낸 값을 믿지 않음)
  const peer = {
    id: randomUUID(),
    colorId: nextColorId++ % COLOR_COUNT,
    x: null,
    y: null,
    text: "",
    showMsg: false,
  };

  // 새 접속자에게 기존 접속자들의 현재 상태 전달
  send(ws, { type: "init", peers: [...peers.values()] });
  peers.set(ws, peer);
  console.log(`접속: ${peer.id} (현재 ${peers.size}명)`);

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return; // 잘못된 메시지는 무시
    }
    if (!data || typeof data !== "object") return;

    if (data.type === "cursor") {
      if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
      peer.x = data.x;
      peer.y = data.y;
    } else if (data.type === "chat") {
      if (typeof data.text !== "string" || typeof data.showMsg !== "boolean") {
        return;
      }
      peer.text = data.text.slice(0, MAX_TEXT_LENGTH);
      peer.showMsg = data.showMsg;
    } else {
      return;
    }

    broadcast(ws, { type: "peer", peer });
  });

  ws.on("close", () => {
    peers.delete(ws);
    broadcast(ws, { type: "leave", id: peer.id });
    console.log(`종료: ${peer.id} (현재 ${peers.size}명)`);
  });

  ws.on("error", (error) => {
    console.error(`소켓 오류 (${peer.id}):`, error.message);
  });
});

wss.on("listening", () => {
  console.log(`WebSocket 서버 실행 중: ws://localhost:${PORT}`);
});

wss.on("error", (error) => {
  console.error("WebSocket 서버 오류:", error.message);
  process.exit(1);
});
