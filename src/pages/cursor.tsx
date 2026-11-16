import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type Peer = {
  id: string;
  colorId: number;
  x: number | null;
  y: number | null;
  text: string;
  showMsg: boolean;
};

type ServerMessage =
  | { type: "init"; peers: Peer[] }
  | { type: "peer"; peer: Peer }
  | { type: "leave"; id: string };

// src/server.js 의 COLOR_COUNT 와 길이를 맞출 것
const COLOR_PALETTE = [
  "#FF5733",
  "#6cd870",
  "#6b9aff",
  "#c077ff",
  "#89d8d4",
  "#FFC300",
  "#ff6c4b",
  "#e38ea6",
  "#c2c2c2",
  "#bfdb8b",
];

const FADE_MS = 700; // 말풍선 페이드 시간
const INPUT_IDLE_MS = 5000; // 입력이 없으면 입력창을 닫는 시간

function getWebSocketUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:3001`;
}

export default function Cursor() {
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [myCursorPosition, setMyCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [showInput, setShowInput] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef("");

  const send = useCallback((data: object) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  // WebSocket 연결
  useEffect(() => {
    const ws = new WebSocket(getWebSocketUrl());
    socketRef.current = ws;

    ws.onmessage = (event) => {
      let data: ServerMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "init") {
        setPeers(Object.fromEntries(data.peers.map((peer) => [peer.id, peer])));
      } else if (data.type === "peer") {
        setPeers((prev) => ({ ...prev, [data.peer.id]: data.peer }));
      } else if (data.type === "leave") {
        setPeers((prev) => {
          const next = { ...prev };
          delete next[data.id];
          return next;
        });
      }
    };

    ws.onerror = () => {
      console.error("WebSocket 연결 오류: 서버(src/server.js)가 실행 중인지 확인하세요.");
    };

    return () => {
      ws.onmessage = null;
      ws.onerror = null;
      // 연결 중에 바로 닫으면 브라우저가 오류를 남기므로, 연결된 뒤 닫는다
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      } else {
        ws.close();
      }
      if (socketRef.current === ws) socketRef.current = null;
    };
  }, []);

  // 커서 위치 전송 (프레임당 최대 1회)
  useEffect(() => {
    let frame = 0;
    let latest = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      latest = { x: e.clientX, y: e.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setMyCursorPosition(latest);
        send({ type: "cursor", ...latest });
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frame);
    };
  }, [send]);

  // "/" 키를 누르면 입력창 열기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.target === inputRef.current) return;
      e.preventDefault();
      setShowInput(true);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 입력창이 열리면 포커스 (커서 위치가 생겨 입력창이 그려진 뒤에도 적용)
  const hasCursor = myCursorPosition !== null;
  useEffect(() => {
    if (showInput && hasCursor) inputRef.current?.focus();
  }, [showInput, hasCursor]);

  // 입력창 열림/닫힘을 알리고, 닫히면 페이드아웃 후 내용 비우기
  useEffect(() => {
    send({ type: "chat", text: messageRef.current, showMsg: showInput });
    if (showInput) return;

    const timer = setTimeout(() => {
      messageRef.current = "";
      setMessage("");
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [showInput, send]);

  // 마지막 입력 후 일정 시간이 지나면 입력창 닫기
  useEffect(() => {
    if (!showInput) return;
    const timer = setTimeout(() => setShowInput(false), INPUT_IDLE_MS);
    return () => clearTimeout(timer);
  }, [showInput, message]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    messageRef.current = text;
    setMessage(text);
    send({ type: "chat", text, showMsg: true });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {myCursorPosition && (
        <div
          className="absolute h-auto min-h-10 w-auto min-w-32 rounded-md border-none bg-blue-500 p-2"
          style={{
            top: myCursorPosition.y + 10,
            left: myCursorPosition.x + 15,
            transition: `opacity ${FADE_MS}ms`,
            opacity: showInput ? 1 : 0,
            pointerEvents: showInput ? "auto" : "none",
          }}
        >
          <input
            ref={inputRef}
            value={message}
            onChange={handleMessageChange}
            onBlur={(e) => {
              if (!e.currentTarget.value) setShowInput(false);
            }}
            disabled={!showInput}
            className="border-none bg-inherit text-white outline-none"
            placeholder="Say something"
          />
        </div>
      )}

      {Object.values(peers).map((peer) =>
        peer.x === null || peer.y === null ? null : (
          <div key={peer.id} className="pointer-events-none select-none">
            <Image
              src="/cursor-icon.png"
              alt="cursor"
              width={25}
              height={25}
              className="absolute"
              style={{ top: peer.y - 10, left: peer.x - 10 }}
            />
            <div
              className="absolute ml-2 mt-2 h-auto min-h-10 w-auto min-w-32 rounded-md border-none p-2 text-black"
              style={{
                top: peer.y,
                left: peer.x,
                transition: `opacity ${FADE_MS}ms`,
                opacity: peer.showMsg ? 1 : 0,
                backgroundColor: COLOR_PALETTE[peer.colorId] ?? "white",
              }}
            >
              {peer.text}
            </div>
          </div>
        )
      )}
    </div>
  );
}
