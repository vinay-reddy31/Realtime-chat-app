"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { initSocket, getSocket } from "../lib/socket";

type Msg = {
  id: string;
  from: string;      // always normalized to a plain string
  to: string;        // always normalized to a plain string
  text: string;
  createdAt: string; // ISO string
  roomId?: string;
};

export default function ChatWindow({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string>("");
  const [peerId, setPeerId] = useState<string>("");
  const [myId, setMyId] = useState<string | null>(null);

  const messagesRef = useRef<HTMLDivElement | null>(null);

  /** Robustly normalize anything that might represent a Mongo ID into a plain string */
  function normalizeId(id: any): string {
    if (!id) return "";
    if (typeof id === "string") return id.trim();

    // Mongoose ObjectId instance
    if (typeof id === "object") {
      // Extended JSON { $oid: '...' }
      if ("$oid" in id && typeof (id as any).$oid === "string") {
        return String((id as any).$oid).trim();
      }
      // Populated doc { _id, name, ... } or nested {_id: ObjectId}
      if ("_id" in id) {
        return normalizeId((id as any)._id);
      }
      // Raw ObjectId with toHexString()
      if (typeof (id as any).toHexString === "function") {
        return (id as any).toHexString();
      }
      // Fallback to string
      if (typeof (id as any).toString === "function") {
        return (id as any).toString().trim();
      }
    }
    return String(id).trim();
  }

  const myIdNorm = useMemo(() => (myId ? normalizeId(myId) : ""), [myId]);

  // Effect 1: Load myId from localStorage once.
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("Please login first");
      setLoading(false);
      return;
    }
    setMyId(userId.trim());
  }, []);

  // Effect 2: Fetch peer + messages and set up socket after myId is available.
  useEffect(() => {
    if (!myIdNorm) return;

    const ids = roomId.split("_").map((s) => s.trim());
    const extractedPeerId = ids.find((id) => id !== myIdNorm);
    if (!extractedPeerId) {
      setError("Invalid room ID");
      setLoading(false);
      return;
    }
    setPeerId(extractedPeerId);

    // Fetch peer info
    fetch(`/api/users/${extractedPeerId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject("Failed to fetch peer")))
      .then((user) => setPeerName(user?.name || "Unknown User"))
      .catch(() => setPeerName("Unknown User"));

    // Fetch messages
    fetch(`/api/conversations/${roomId}/messages`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: any[]) => {
        const normalized: Msg[] = data.map((m) => ({
          id: normalizeId(m._id),
          from: normalizeId(m.from), // works for string/ObjectId/populated object
          to: normalizeId(m.to),
          text: m.text,
          createdAt: new Date(m.createdAt).toISOString(),
          roomId: m.roomId,
        }));
        setMessages(normalized);
        setLoading(false);
      })
      .catch((err) => {
        setError(typeof err === "string" ? err : "Failed to load messages");
        setLoading(false);
      });

    // Socket init
    const token = localStorage.getItem("token") || undefined;
    const socket = initSocket(token);
    socket.emit("join_room", { roomId });

    const onMsg = (m: Msg) => {
      const normalizedMsg: Msg = {
        ...m,
        from: normalizeId(m.from),
        to: normalizeId(m.to),
        createdAt: new Date(m.createdAt).toISOString(),
      };

      // Accept either exact room match or a defensive pair match
      if (
        normalizedMsg.roomId === roomId ||
        ([normalizedMsg.from, normalizedMsg.to].includes(myIdNorm) &&
          [normalizedMsg.from, normalizedMsg.to].includes(extractedPeerId))
      ) {
        setMessages((prev) => [...prev, normalizedMsg]);
      }
    };

    socket.on("private_message", onMsg);
    return () => {
      socket.off("private_message", onMsg);
    };
  }, [roomId, myIdNorm]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  function send() {
    if (!text.trim() || !myIdNorm || !peerId) return;
    const socket = getSocket();
    if (!socket) {
      setError("Chat connection lost. Please refresh.");
      return;
    }
    socket.emit("private_message", { toUserId: peerId, text });
    setText("");
  }

  if (loading) {
    return (
      <div className="border rounded p-4 bg-white h-96 flex items-center justify-center">
        Loading...
      </div>
    );
  }
  if (error) {
    return (
      <div className="border rounded p-4 bg-white h-96 flex flex-col items-center justify-center text-red-600">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!myIdNorm) return null;

  return (
    <div className="border rounded p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50"
          >
            ←
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-black">{peerName}</h2>
            <p className="text-sm text-gray-500">Chat</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="h-96 overflow-auto mb-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">No messages yet.</div>
        ) : (
          messages.map((m) => {
            const isOwn = m.from === myIdNorm; // already normalized
            return (
              <div
                key={m.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-lg max-w-xs ${
                    isOwn
                      ? "bg-blue-500 text-white self-end"
                      : "bg-gray-100 text-black self-start"
                  }`}
                >
                  <div className="text-sm break-words">{m.text}</div>
                  <div
                    className={`text-[10px] mt-2 ${
                      isOwn
                        ? "text-blue-200 text-right"
                        : "text-gray-400 text-left"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="flex-1 border p-2 rounded text-black"
          placeholder="Type something..."
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          Send
        </button>
      </div>
    </div>
  );
}
