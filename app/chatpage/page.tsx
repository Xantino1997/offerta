"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import {
  Send,
  ImageIcon,
  Trash2,
  ArrowLeft,
  Search,
  CheckCheck,
  Check,
  X,
  MessageCircle,
  Loader2,
  SmilePlus,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

const API = "https://offertabackend.onrender.com/api";
const WS_URL = "https://offertabackend.onrender.com";

interface Participant {
  _id: string;
  name: string;
  logo?: string;
  avatar?: string;
}
interface ConvLastMsg {
  text?: string;
  image?: string;
  createdAt: string;
}
interface Conversation {
  _id: string;
  participants: Participant[];
  other: Participant;
  lastMessage?: ConvLastMsg | null;
  updatedAt: string;
  unreadCount: number;
}
interface Message {
  _id: string;
  conversation: string;
  sender: Participant;
  text?: string;
  image?: string;
  createdAt: string;
  readBy: string[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "ahora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  const d = new Date(iso);
  if (diff < 86_400_000)
    return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString("es", { weekday: "short" });
  return d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}
function timeFull(iso: string) {
  return new Date(iso).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function dateSep(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 86_400_000) return "Hoy";
  if (diff < 2 * 86_400_000) return "Ayer";
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function avatarUrl(p?: Partial<Participant> | null) {
  if (p?.logo) return p.logo;
  if (p?.avatar) return p.avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(p?.name || "?")}&background=f97316&color=fff&size=96&bold=true`;
}

function ConvSkeleton() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              flexShrink: 0,
              background:
                "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            {[`${50 + i * 7}%`, `${40 + i * 5}%`].map((w, j) => (
              <div
                key={j}
                style={{
                  height: j === 0 ? 13 : 11,
                  width: w,
                  borderRadius: 6,
                  background:
                    "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const searchParams = useSearchParams();
  const param = searchParams.get("param");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("marketplace_token")
      : null;
  const userId = (user as any)?._id || (user as any)?.id || "";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [convsLoading, setConvsLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const activeConv = conversations.find((c) => c._id === activeId) ?? null;
  const effectiveConv =
    activeConv ??
    (activeId
      ? ({
          _id: activeId,
          participants: [],
          other: {
            _id: "",
            name: "Cargando...",
            logo: undefined,
            avatar: undefined,
          },
          lastMessage: null,
          updatedAt: new Date().toISOString(),
          unreadCount: 0,
        } as Conversation)
      : null);

  useEffect(() => {
    if (!token) return;
    const socket = io(WS_URL, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("new_message", (msg: Message) => {
      const isActive = msg.conversation === activeIdRef.current;
      if (isActive) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id) ? prev : [...prev, msg],
        );
        fetch(`${API}/chat/conversations/${msg.conversation}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c._id !== msg.conversation
            ? c
            : {
                ...c,
                lastMessage: {
                  text: msg.text,
                  image: msg.image,
                  createdAt: msg.createdAt,
                },
                updatedAt: msg.createdAt,
                unreadCount: isActive
                  ? 0
                  : c.unreadCount + (msg.sender._id !== userId ? 1 : 0),
              },
        );
        return [...updated].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      });
    });

    socket.on(
      "messages_read",
      ({ conversationId }: { conversationId: string }) => {
        if (conversationId === activeIdRef.current)
          setMessages((prev) =>
            prev.map((m) => ({
              ...m,
              readBy: m.readBy.includes(userId)
                ? m.readBy
                : [...m.readBy, userId],
            })),
          );
      },
    );
    socket.on("typing", ({ conversationId }: { conversationId: string }) => {
      if (conversationId === activeIdRef.current) setTyping(true);
    });
    socket.on(
      "stop_typing",
      ({ conversationId }: { conversationId: string }) => {
        if (conversationId === activeIdRef.current) setTyping(false);
      },
    );
    socket.on(
      "message_deleted",
      ({
        messageId,
        conversationId,
      }: {
        messageId: string;
        conversationId: string;
      }) => {
        if (conversationId === activeIdRef.current)
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [token, userId]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setConvsLoading(true);
    try {
      const res = await fetch(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: Conversation[] = await res.json();
      setConversations(
        data.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      );
    } catch {
      /* silent */
    } finally {
      setConvsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!token || convsLoading) return;
    const convId = params.get("conversationId");
    const bId = params.get("businessId");
    if (convId) {
      const exists = conversations.find((c) => c._id === convId);
      if (exists) {
        openConversation(convId);
      } else {
        (async () => {
          await loadConversations();
          openConversation(convId);
        })();
      }
      return;
    }
    if (bId) {
      (async () => {
        try {
          const res = await fetch(`${API}/chat/start`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ participantId: bId }),
          });
          const data = await res.json();
          if (data._id) {
            await loadConversations();
            openConversation(data._id);
          }
        } catch {
          /* silent */
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, token, convsLoading]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    setTyping(false);
    setMessages([]);
    setMsgsLoading(true);
    setConversations((prev) =>
      prev.map((c) => (c._id === id ? { ...c, unreadCount: 0 } : c)),
    );
    try {
      const res = await fetch(`${API}/chat/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setMessages([]);
          return;
        }
        throw new Error();
      }
      const data: Message[] = await res.json();
      setMessages(data);
      setConversations((prev) => {
        if (!prev.some((c) => c._id === id)) loadConversations();
        return prev;
      });
      await fetch(`${API}/chat/conversations/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      socketRef.current?.emit("join_conv", { conversationId: id });
    } catch {
      /* silent */
    } finally {
      setMsgsLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: messages.length > 1 ? "smooth" : "instant",
    });
  }, [messages]);

  const handleSend = async () => {
    if ((!text.trim() && !imgFile) || !activeId || sending) return;
    setSending(true);
    socketRef.current?.emit("stop_typing", { conversationId: activeId });
    try {
      const fd = new FormData();
      fd.append("conversationId", activeId);
      if (text.trim()) fd.append("text", text.trim());
      if (imgFile) fd.append("image", imgFile);
      const res = await fetch(`${API}/chat/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error();
      setText("");
      setImgFile(null);
      setImgPreview(null);
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!activeId) return;
    socketRef.current?.emit("typing", { conversationId: activeId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { conversationId: activeId });
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar 5 MB");
      return;
    }
    setImgFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Borrar esta conversación? Solo la eliminás de tu vista."))
      return;
    try {
      await fetch(`${API}/chat/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
        setMobileView("list");
      }
    } catch {
      /* silent */
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await fetch(`${API}/chat/messages/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    } catch {
      /* silent */
    }
  };

  const filtered = conversations.filter((c) =>
    c.other?.name?.toLowerCase().includes(search.toLowerCase()),
  );
  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0,
  );

  if (!user)
    return (
      <MainLayout>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: 16,
          }}
        >
          <MessageCircle
            size={52}
            strokeWidth={1.2}
            style={{ color: "#d1d5db" }}
          />
          <p style={{ fontWeight: 600, fontSize: "1.1rem", color: "#374151" }}>
            Necesitás iniciar sesión para ver tus chats
          </p>
          <button
            onClick={() => router.push("/login")}
            style={{
              background: "linear-gradient(135deg,#f97316,#ea580c)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "11px 28px",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Iniciar sesión
          </button>
        </div>
      </MainLayout>
    );

  return (
    <MainLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        @keyframes shimmer    { 0%{background-position:200% center}100%{background-position:-200% center} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes popBadge   { 0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)} }
        @keyframes slideR     { from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)} }
        @keyframes slideL     { from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)} }
        @keyframes spin       { to{transform:rotate(360deg)} }
        @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)} }
        @keyframes blink      { 0%,100%{opacity:1}50%{opacity:0.3} }

        * { box-sizing:border-box; }

        .chat-root {
          font-family:'Plus Jakarta Sans',sans-serif;
          display:flex; height:calc(100dvh - 64px); max-width:1340px;
          margin:0 auto; background:#fff; overflow:hidden;
          border-radius:0 0 24px 24px; box-shadow:0 8px 60px rgba(0,0,0,0.1);
        }

        /* ══ SIDEBAR ══ */
        .cs { width:340px; min-width:340px; background:#fff; border-right:1px solid #f0ece8; display:flex; flex-direction:column; overflow:hidden; }
        .cs-header { padding:20px 18px 16px; background:#fff; border-bottom:1px solid #f5f0eb; }
        .cs-title  { font-size:1.15rem; font-weight:800; color:#1a1a1a; margin:0 0 14px; display:flex; align-items:center; gap:8px; }
        .cs-search { display:flex; align-items:center; gap:8px; background:#f8f5f2; border-radius:14px; padding:10px 14px; border:1.5px solid transparent; transition:all .2s; }
        .cs-search:focus-within { border-color:#f97316; background:#fff; box-shadow:0 0 0 3px rgba(249,115,22,.08); }
        .cs-search input { border:none; background:transparent; outline:none; font-size:0.85rem; color:#1a1a1a; width:100%; font-family:inherit; }
        .cs-search input::placeholder { color:#c4b8ae; }
        .cs-list { flex:1; overflow-y:auto; }
        .cs-list::-webkit-scrollbar { width:3px; }
        .cs-list::-webkit-scrollbar-thumb { background:#f0e8e0; border-radius:3px; }

        .ci { display:flex; align-items:center; gap:12px; padding:12px 18px; cursor:pointer; transition:background .15s; border-left:3px solid transparent; position:relative; }
        .ci:hover  { background:#fdf7f2; }
        .ci.active { background:#fff4eb; border-left-color:#f97316; }
        .ci-avatar { width:48px; height:48px; border-radius:50%; object-fit:cover; flex-shrink:0; box-shadow:0 2px 10px rgba(0,0,0,.12); border:2px solid #fff; }
        .ci-info   { flex:1; min-width:0; }
        .ci-name   { font-weight:700; font-size:0.875rem; color:#1a1a1a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ci-last   { font-size:0.75rem; color:#b0a49a; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ci-last.unread { color:#4a3728; font-weight:600; }
        .ci-meta   { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; min-width:42px; }
        .ci-time   { font-size:0.68rem; color:#c4b8ae; font-weight:500; white-space:nowrap; }
        .unread-badge { background:#f97316; color:#fff; font-size:0.65rem; font-weight:800; min-width:20px; height:20px; border-radius:10px; display:flex; align-items:center; justify-content:center; padding:0 5px; white-space:nowrap; flex-shrink:0; line-height:1; animation:popBadge .3s cubic-bezier(.34,1.56,.64,1); }
        .ci-del { opacity:0; background:none; border:none; color:#ef4444; cursor:pointer; padding:5px; border-radius:8px; transition:opacity .15s,background .15s; flex-shrink:0; line-height:0; }
        .ci:hover .ci-del { opacity:1; }
        .ci-del:hover { background:rgba(239,68,68,.1); }

        /* ══ CHAT ══ */
        .ca { flex:1; display:flex; flex-direction:column; overflow:hidden; position:relative; background-color:#f0ebe4; background-image:radial-gradient(circle at 15% 15%,rgba(249,115,22,.05) 0%,transparent 55%),radial-gradient(circle at 85% 85%,rgba(234,88,12,.04) 0%,transparent 55%); }

        .ca-header { background:#fff; border-bottom:1px solid #f0ece8; padding:12px 20px; display:flex; align-items:center; gap:12px; z-index:2; box-shadow:0 2px 16px rgba(0,0,0,.06); }
        .ca-header-name { font-size:0.98rem; font-weight:800; color:#1a1a1a; line-height:1.2; }
        .ca-header-sub  { font-size:0.71rem; color:#b0a49a; margin-top:2px; display:flex; align-items:center; gap:5px; }
        .typing-header-dots { display:inline-flex; align-items:center; gap:3px; }
        .typing-header-dot  { width:5px; height:5px; border-radius:50%; background:#f97316; animation:dot-bounce 1.1s ease-in-out infinite; }
        .typing-header-dot:nth-child(2) { animation-delay:.15s; }
        .typing-header-dot:nth-child(3) { animation-delay:.30s; }

        .ca-messages { flex:1; overflow-y:auto; padding:20px 24px 16px; display:flex; flex-direction:column; gap:4px; z-index:1; }
        .ca-messages::-webkit-scrollbar { width:4px; }
        .ca-messages::-webkit-scrollbar-thumb { background:#ccc4bb; border-radius:4px; }

        .date-sep { display:flex; align-items:center; gap:10px; margin:16px 0 8px; }
        .date-sep::before,.date-sep::after { content:''; flex:1; height:1px; background:rgba(0,0,0,.09); }
        .date-sep span { background:rgba(255,255,255,.9); backdrop-filter:blur(8px); color:#9e8e82; font-size:0.68rem; font-weight:700; padding:4px 14px; border-radius:20px; box-shadow:0 1px 5px rgba(0,0,0,.08); letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; }

        .brow { display:flex; align-items:flex-end; gap:8px; margin-bottom:5px; }
        .brow.mine   { justify-content:flex-end;  animation:slideR .16s ease; }
        .brow.theirs { justify-content:flex-start; animation:slideL .16s ease; }

        .b-avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; flex-shrink:0; margin-bottom:2px; box-shadow:0 1px 5px rgba(0,0,0,.14); }

        /* ══ BURBUJAS ══ */
        .bubble {
          /* Ancho: generoso para texto cómodo */
          max-width: min(65%, 500px);
          min-width: 90px;
          /* Se adapta al contenido pero respeta max-width */
          width: fit-content;
          padding: 12px 16px 9px;
          border-radius: 22px;
          font-size: 0.97rem;
          line-height: 1.65;
          word-break: break-word;
          overflow-wrap: anywhere;
          position: relative;
          /* CRÍTICO: contiene la imagen sin desborde */
          overflow: hidden;
        }

        /* MÍA — naranja vibrante */
        .bubble.mine {
          background: linear-gradient(150deg, #ff9340 0%, #f05a0e 100%);
          color: #fff;
          border-radius: 22px 22px 6px 22px;
          box-shadow:
            0 3px 12px rgba(240,90,14,.32),
            0 8px 28px rgba(249,115,22,.18),
            inset 0 1px 0 rgba(255,255,255,.16);
        }

        /* ENTRANTE — blanco limpio */
        .bubble.theirs {
          background: #ffffff;
          color: #1a1a1a;
          border-radius: 22px 22px 22px 6px;
          box-shadow:
            0 1px 4px rgba(0,0,0,.08),
            0 5px 20px rgba(0,0,0,.07);
        }

        /* ── Imagen dentro del globo ── */
        /* La imagen ocupa todo el ancho del bubble, incluyendo padding */
        .b-img-wrap {
          /* Negativo del padding para que la imagen llegue a los bordes */
          margin: -12px -16px 8px -16px;
          overflow: hidden;
          /* Hereda el border-radius superior del bubble */
          border-radius: 22px 22px 0 0;
          line-height: 0;
        }
        .b-img {
          display: block;
          width: 100%;
          max-height: 300px;
          object-fit: cover;
          cursor: zoom-in;
          transition: opacity .2s;
        }
        .b-img:hover { opacity: .92; }
        /* Si la imagen es el único contenido */
        .b-img-wrap.img-only {
          margin-bottom: 0;
          border-radius: inherit;
        }

        /* Meta hora+check */
        .b-meta { display:flex; align-items:center; justify-content:flex-end; gap:4px; margin-top:5px; font-size:0.67rem; font-weight:600; letter-spacing:.01em; }
        .bubble.mine   .b-meta { color:rgba(255,255,255,.7); }
        .bubble.theirs .b-meta { color:#c0b4aa; }

        /* Delete hover */
        .b-wrap { position:relative; display:flex; align-items:flex-end; }
        .b-del-btn { position:absolute; top:50%; transform:translateY(-50%); opacity:0; background:rgba(0,0,0,.42); backdrop-filter:blur(4px); border:none; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:opacity .15s,background .15s; z-index:3; }
        .b-del-btn.right { left:calc(100% + 7px); }
        .b-wrap:hover .b-del-btn { opacity:1; }
        .b-del-btn:hover { background:rgba(239,68,68,.8); }

        /* Typing */
        .typing-bubble { display:flex; align-items:center; gap:5px; padding:13px 20px; background:#fff; border-radius:20px 20px 20px 5px; box-shadow:0 3px 14px rgba(0,0,0,.09); width:fit-content; animation:slideL .18s ease,fadeUp .2s ease; }
        .t-dot { width:7px; height:7px; border-radius:50%; background:linear-gradient(135deg,#f97316,#ea580c); animation:dot-bounce 1.3s ease-in-out infinite; }
        .t-dot:nth-child(2) { animation-delay:.15s; }
        .t-dot:nth-child(3) { animation-delay:.30s; }

        /* Preview */
        .img-preview-bar { background:#fff; border-top:1px solid #f0ece8; padding:10px 18px; display:flex; align-items:center; gap:12px; z-index:2; box-shadow:0 -2px 10px rgba(0,0,0,.04); }
        .img-preview-bar img { height:52px; border-radius:10px; object-fit:cover; box-shadow:0 2px 8px rgba(0,0,0,.12); }

        /* Input */
        .ca-input { background:#fff; border-top:1px solid #f0ece8; padding:12px 16px; display:flex; align-items:flex-end; gap:10px; z-index:2; box-shadow:0 -2px 14px rgba(0,0,0,.05); }
        .input-ta { flex:1; background:#f5f1ee; border:1.5px solid transparent; border-radius:22px; padding:11px 18px; font-size:0.92rem; line-height:1.45; outline:none; resize:none; max-height:130px; font-family:inherit; color:#1a1a1a; transition:border-color .2s,background .2s,box-shadow .2s; }
        .input-ta:focus { border-color:#f97316; background:#fff; box-shadow:0 0 0 3px rgba(249,115,22,.1); }
        .input-ta::placeholder { color:#c4b8ae; }

        .icon-btn { width:44px; height:44px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:transform .15s,box-shadow .15s; line-height:0; }
        .icon-btn:active { transform:scale(.88); }
        .btn-send { background:linear-gradient(145deg,#ff8c38,#ea580c); color:#fff; box-shadow:0 4px 14px rgba(249,115,22,.45); }
        .btn-send:not(:disabled):hover { box-shadow:0 6px 22px rgba(249,115,22,.6); transform:translateY(-1px); }
        .btn-send:disabled { background:#e8e0d8; color:#c4b8ae; box-shadow:none; }
        .btn-attach { background:#f5f1ee; color:#9e8e82; }
        .btn-attach:hover { background:#fff4eb; color:#f97316; }

        /* Empty */
        .ca-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:2rem; text-align:center; z-index:1; }
        .ca-empty-icon { width:80px; height:80px; border-radius:50%; background:linear-gradient(145deg,#fff4eb,#ffe8d0); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 30px rgba(249,115,22,.15); }
        .ca-empty h3 { color:#3d2a1e; font-size:1.1rem; font-weight:800; margin:0; }
        .ca-empty p  { color:#b0a49a; font-size:0.875rem; margin:0; line-height:1.6; }

        /* Lightbox */
        .lightbox { position:fixed; inset:0; background:rgba(10,6,2,.93); backdrop-filter:blur(14px); display:flex; align-items:center; justify-content:center; z-index:9999; animation:fadeUp .18s ease; }
        .lightbox img { max-width:92vw; max-height:92vh; border-radius:16px; box-shadow:0 30px 80px rgba(0,0,0,.5); }

        /* Mobile */
        @media (max-width:680px) {
          .chat-root { border-radius:0; height:calc(100dvh - 56px); }
          .cs { width:100%; min-width:100%; position:absolute; inset:0; z-index:2; transform:translateX(0); transition:transform .3s ease; }
          .cs.hide { transform:translateX(-100%); pointer-events:none; }
          .ca { position:absolute; inset:0; z-index:1; }
          .btn-back-mobile { display:flex !important; }
        }
        .btn-back-mobile { display:none; }
      `}</style>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img
            src={lightbox}
            alt="imagen"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,.12)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,.2)",
              color: "#fff",
              borderRadius: 12,
              padding: "9px 18px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <X size={15} /> Cerrar
          </button>
        </div>
      )}

      <div className="chat-root">
        {/* ══ SIDEBAR ══ */}
        <div className={`cs${mobileView === "chat" ? " hide" : ""}`}>
          <div className="cs-header">
            <div>Parametro: {param}</div>
            <h2 className="cs-title">
              <MessageCircle size={20} style={{ color: "#f97316" }} />
              Mensajes
              {totalUnread > 0 && (
                <span
                  style={{
                    background: "#f97316",
                    color: "#fff",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 5px",
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                  }}
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </h2>
            <div className="cs-search">
              <Search size={14} style={{ color: "#bbb", flexShrink: 0 }} />
              <input
                placeholder="Buscar conversación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#bbb",
                    lineHeight: 0,
                    padding: 0,
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="cs-list">
            {convsLoading ? (
              <ConvSkeleton />
            ) : filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "#bbb",
                }}
              >
                <MessageCircle
                  size={40}
                  strokeWidth={1}
                  style={{ marginBottom: 12 }}
                />
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#888",
                  }}
                >
                  {search ? "Sin resultados" : "No tenés conversaciones aún"}
                </p>
                {!search && (
                  <p
                    style={{ fontSize: "0.8rem", color: "#bbb", marginTop: 4 }}
                  >
                    Contactá un negocio para comenzar
                  </p>
                )}
              </div>
            ) : (
              filtered.map((conv) => {
                const isActive = activeId === conv._id;
                const lastText =
                  conv.lastMessage?.image && !conv.lastMessage?.text
                    ? "📷 Imagen"
                    : conv.lastMessage?.text || "";
                return (
                  <div
                    key={conv._id}
                    className={`ci${isActive ? " active" : ""}`}
                    onClick={() => openConversation(conv._id)}
                  >
                    <img
                      src={avatarUrl(conv.other)}
                      alt={conv.other?.name || "Usuario"}
                      className="ci-avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other?.name || "?")}&background=f97316&color=fff&size=96`;
                      }}
                    />
                    <div className="ci-info">
                      <div className="ci-name">
                        {conv.other?.name || "Usuario"}
                      </div>
                      <div
                        className={`ci-last${conv.unreadCount > 0 ? " unread" : ""}`}
                      >
                        {lastText || (
                          <span
                            style={{
                              color: "#ccc",
                              fontStyle: "italic",
                              fontSize: "0.75rem",
                            }}
                          >
                            Sin mensajes
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ci-meta">
                      <span className="ci-time">
                        {conv.lastMessage
                          ? timeAgo(conv.lastMessage.createdAt)
                          : ""}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <button
                      className="ci-del"
                      onClick={(e) => deleteConversation(conv._id, e)}
                      title="Borrar conversación"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ══ CHAT AREA ══ */}
        <div className="ca">
          {!effectiveConv ? (
            <div className="ca-empty">
              <div className="ca-empty-icon">
                <MessageCircle
                  size={36}
                  style={{ color: "#f97316" }}
                  strokeWidth={1.5}
                />
              </div>
              <h3>Seleccioná una conversación</h3>
              <p>
                O contactá un negocio desde su página
                <br />
                para comenzar a chatear
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="ca-header">
                <button
                  className="icon-btn btn-back-mobile btn-attach"
                  style={{ width: 36, height: 36 }}
                  onClick={() => {
                    setMobileView("list");
                    setActiveId(null);
                  }}
                >
                  <ArrowLeft size={18} />
                </button>

                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={avatarUrl(effectiveConv!.other)}
                    alt={effectiveConv!.other?.name}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #ffe5cc",
                      boxShadow: "0 2px 8px rgba(0,0,0,.1)",
                      display: "block",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv!.other?.name || "?")}&background=f97316&color=fff&size=96`;
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: typing ? "#f97316" : "#22c55e",
                      border: "2px solid #fff",
                      transition: "background .4s",
                      animation: typing
                        ? "blink 1s ease-in-out infinite"
                        : "none",
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ca-header-name">
                    {effectiveConv!.other?.name}
                  </div>
                  <div className="ca-header-sub">
                    {typing ? (
                      <>
                        <span
                          style={{
                            color: "#f97316",
                            fontWeight: 700,
                            fontSize: "0.71rem",
                          }}
                        >
                          escribiendo
                        </span>
                        <span className="typing-header-dots">
                          <span className="typing-header-dot" />
                          <span className="typing-header-dot" />
                          <span className="typing-header-dot" />
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#22c55e",
                            display: "inline-block",
                            boxShadow: "0 0 0 2px rgba(34,197,94,.25)",
                          }}
                        />
                        <span>En línea</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              <div className="ca-messages">
                {msgsLoading ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "3rem",
                      color: "#bbb",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Loader2
                      size={28}
                      style={{ animation: "spin 0.8s linear infinite" }}
                    />
                    <span style={{ fontSize: "0.85rem" }}>
                      Cargando mensajes...
                    </span>
                  </div>
                ) : messages.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#bbb",
                      fontSize: "0.85rem",
                      padding: "3rem 1rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <SmilePlus size={36} strokeWidth={1} />
                    <span>
                      No hay mensajes aún.
                      <br />
                      ¡Mandá el primero!
                    </span>
                  </div>
                ) : (
                  (() => {
                    let lastDateLabel = "";
                    return messages.map((msg) => {
                      const mine = msg.sender._id === userId;
                      const dateLabel = dateSep(msg.createdAt);
                      const showDate = dateLabel !== lastDateLabel;
                      lastDateLabel = dateLabel;
                      const allRead = msg.readBy.length >= 2;
                      const imgOnly = !!msg.image && !msg.text;

                      return (
                        <div key={msg._id}>
                          {showDate && (
                            <div className="date-sep">
                              <span>{dateLabel}</span>
                            </div>
                          )}
                          <div className={`brow ${mine ? "mine" : "theirs"}`}>
                            {!mine && (
                              <img
                                src={avatarUrl(effectiveConv?.other)}
                                alt=""
                                className="b-avatar"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv?.other?.name || "?")}&background=f97316&color=fff&size=56`;
                                }}
                              />
                            )}
                            <div className="b-wrap">
                              {mine && (
                                <button
                                  className="b-del-btn right"
                                  onClick={() => deleteMessage(msg._id)}
                                  title="Borrar"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                              <div
                                className={`bubble ${mine ? "mine" : "theirs"}`}
                              >
                                {msg.image && (
                                  <div
                                    className={`b-img-wrap${imgOnly ? " img-only" : ""}`}
                                  >
                                    <img
                                      src={msg.image}
                                      alt="imagen"
                                      className="b-img"
                                      onClick={() => setLightbox(msg.image!)}
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                                {msg.text && (
                                  <span
                                    style={{
                                      display: "block",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {msg.text}
                                  </span>
                                )}
                                <div className="b-meta">
                                  <span>{timeFull(msg.createdAt)}</span>
                                  {mine &&
                                    (allRead ? (
                                      <CheckCheck size={12} />
                                    ) : (
                                      <Check size={12} />
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}

                {typing && (
                  <div
                    className="brow theirs"
                    style={{ alignItems: "flex-end", gap: 8 }}
                  >
                    <img
                      src={avatarUrl(effectiveConv?.other)}
                      alt=""
                      className="b-avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv?.other?.name || "?")}&background=f97316&color=fff&size=56`;
                      }}
                    />
                    <div className="typing-bubble">
                      <div className="t-dot" />
                      <div className="t-dot" />
                      <div className="t-dot" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Preview */}
              {imgPreview && (
                <div className="img-preview-bar">
                  <img src={imgPreview} alt="preview" />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#f97316",
                      }}
                    >
                      Imagen lista
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>
                      {imgFile?.name} ·{" "}
                      {((imgFile?.size || 0) / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setImgFile(null);
                      setImgPreview(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      lineHeight: 0,
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="ca-input">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <button
                  className="icon-btn btn-attach"
                  onClick={() => fileRef.current?.click()}
                  title="Adjuntar imagen"
                >
                  <ImageIcon size={18} />
                </button>
                <textarea
                  className="input-ta"
                  placeholder="Escribí un mensaje... (Enter para enviar)"
                  value={text}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 120) + "px";
                  }}
                />
                <button
                  className="icon-btn btn-send"
                  onClick={handleSend}
                  disabled={(!text.trim() && !imgFile) || sending}
                  title="Enviar"
                >
                  {sending ? (
                    <Loader2
                      size={17}
                      style={{ animation: "spin 0.8s linear infinite" }}
                    />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
