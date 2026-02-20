"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import {
  Send, ImageIcon, Trash2, ArrowLeft, Search,
  CheckCheck, Check, X, MessageCircle, Loader2, SmilePlus,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import "../styles/chatpage.css";

const API    = "https://offertabackend.onrender.com/api";
const WS_URL = "https://offertabackend.onrender.com";

interface Participant { _id: string; name: string; logo?: string; avatar?: string; }
interface ConvLastMsg { text?: string; image?: string; createdAt: string; }
interface Conversation {
  _id: string; participants: Participant[]; other: Participant;
  lastMessage?: ConvLastMsg | null; updatedAt: string; unreadCount: number;
}
interface Message {
  _id: string; conversation: string; sender: Participant;
  text?: string; image?: string; createdAt: string; readBy: string[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "ahora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  const d = new Date(iso);
  if (diff < 86_400_000)     return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 86_400_000) return d.toLocaleDateString("es", { weekday: "short" });
  return d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}
function timeFull(iso: string) {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}
function dateSep(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 86_400_000)     return "Hoy";
  if (diff < 2 * 86_400_000) return "Ayer";
  return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" });
}
function avatarUrl(p?: Partial<Participant> | null) {
  if (p?.logo)   return p.logo;
  if (p?.avatar) return p.avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(p?.name || "?")}&background=f97316&color=fff&size=96&bold=true`;
}

function ConvSkeleton() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            {[`${50 + i * 7}%`, `${40 + i * 5}%`].map((w, j) => (
              <div key={j} style={{ height: j === 0 ? 13 : 11, width: w, borderRadius: 6,
                background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ChatPageInner() {
  const { user } = useAuth();
  const router   = useRouter();
  const params   = useSearchParams();

  const token  = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;
  const userId = (user as any)?._id || (user as any)?.id || "";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [text, setText]                   = useState("");
  const [imgFile, setImgFile]             = useState<File | null>(null);
  const [imgPreview, setImgPreview]       = useState<string | null>(null);
  const [convsLoading, setConvsLoading]   = useState(true);
  const [msgsLoading, setMsgsLoading]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [search, setSearch]               = useState("");
  const [typing, setTyping]               = useState(false);
  const [mobileView, setMobileView]       = useState<"list" | "chat">("list");
  const [lightbox, setLightbox]           = useState<string | null>(null);

  const socketRef   = useRef<Socket | null>(null);
  const bottomRef   = useRef<HTMLDivElement | null>(null);
  const fileRef     = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const activeConv    = conversations.find(c => c._id === activeId) ?? null;
  const effectiveConv = activeConv ?? (activeId ? ({
    _id: activeId, participants: [],
    other: { _id: "", name: "Cargando...", logo: undefined, avatar: undefined },
    lastMessage: null, updatedAt: new Date().toISOString(), unreadCount: 0,
  } as Conversation) : null);

  useEffect(() => {
    if (!token) return;
    const socket = io(WS_URL, { auth: { token }, reconnectionAttempts: 5, reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on("new_message", (msg: Message) => {
      const isActive = msg.conversation === activeIdRef.current;
      if (isActive) {
        setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
        fetch(`${API}/chat/conversations/${msg.conversation}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      }
      setConversations(prev => {
        const updated = prev.map(c => c._id !== msg.conversation ? c : {
          ...c,
          lastMessage: { text: msg.text, image: msg.image, createdAt: msg.createdAt },
          updatedAt: msg.createdAt,
          unreadCount: isActive ? 0 : c.unreadCount + (msg.sender._id !== userId ? 1 : 0),
        });
        return [...updated].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    });

    socket.on("messages_read", ({ conversationId }: { conversationId: string }) => {
      if (conversationId === activeIdRef.current)
        setMessages(prev => prev.map(m => ({ ...m, readBy: m.readBy.includes(userId) ? m.readBy : [...m.readBy, userId] })));
    });
    socket.on("typing",      ({ conversationId }: { conversationId: string }) => { if (conversationId === activeIdRef.current) setTyping(true); });
    socket.on("stop_typing", ({ conversationId }: { conversationId: string }) => { if (conversationId === activeIdRef.current) setTyping(false); });
    socket.on("message_deleted", ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (conversationId === activeIdRef.current) setMessages(prev => prev.filter(m => m._id !== messageId));
    });

    return () => { socket.disconnect(); };
  }, [token, userId]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setConvsLoading(true);
    try {
      const res  = await fetch(`${API}/chat/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data: Conversation[] = await res.json();
      setConversations(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch { /* silent */ }
    finally { setConvsLoading(false); }
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!token || convsLoading) return;
    const convId = params.get("conversationId");
    const bId    = params.get("businessId");
    if (convId) {
      const exists = conversations.find(c => c._id === convId);
      if (exists) { openConversation(convId); }
      else { (async () => { await loadConversations(); openConversation(convId); })(); }
      return;
    }
    if (bId) {
      (async () => {
        try {
          const res  = await fetch(`${API}/chat/start`, {
            method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ participantId: bId }),
          });
          const data = await res.json();
          if (data._id) { await loadConversations(); openConversation(data._id); }
        } catch { /* silent */ }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, token, convsLoading]);

  const openConversation = async (id: string) => {
    setActiveId(id); setMobileView("chat"); setTyping(false); setMessages([]); setMsgsLoading(true);
    setConversations(prev => prev.map(c => c._id === id ? { ...c, unreadCount: 0 } : c));
    try {
      const res = await fetch(`${API}/chat/conversations/${id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { if (res.status === 404) { setMessages([]); return; } throw new Error(); }
      const data: Message[] = await res.json();
      setMessages(data);
      setConversations(prev => { if (!prev.some(c => c._id === id)) loadConversations(); return prev; });
      await fetch(`${API}/chat/conversations/${id}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      socketRef.current?.emit("join_conv", { conversationId: id });
    } catch { /* silent */ }
    finally { setMsgsLoading(false); }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "instant" });
  }, [messages]);

  const handleSend = async () => {
    if ((!text.trim() && !imgFile) || !activeId || sending) return;
    setSending(true);
    socketRef.current?.emit("stop_typing", { conversationId: activeId });
    try {
      const fd = new FormData();
      fd.append("conversationId", activeId);
      if (text.trim()) fd.append("text", text.trim());
      if (imgFile)     fd.append("image", imgFile);
      const res = await fetch(`${API}/chat/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) throw new Error();
      setText(""); setImgFile(null); setImgPreview(null);
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!activeId) return;
    socketRef.current?.emit("typing", { conversationId: activeId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { socketRef.current?.emit("stop_typing", { conversationId: activeId }); }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("La imagen no puede superar 5 MB"); return; }
    setImgFile(f);
    const reader = new FileReader();
    reader.onload = ev => setImgPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Borrar esta conversación? Solo la eliminás de tu vista.")) return;
    try {
      await fetch(`${API}/chat/conversations/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setConversations(prev => prev.filter(c => c._id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); setMobileView("list"); }
    } catch { /* silent */ }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await fetch(`${API}/chat/messages/${msgId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => prev.filter(m => m._id !== msgId));
    } catch { /* silent */ }
  };

  const filtered    = conversations.filter(c => c.other?.name?.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!user) return (
    <MainLayout>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:16 }}>
        <MessageCircle size={52} strokeWidth={1.2} style={{ color:"#d1d5db" }} />
        <p style={{ fontWeight:600, fontSize:"1.1rem", color:"#374151" }}>Necesitás iniciar sesión para ver tus chats</p>
        <button onClick={() => router.push("/login")} style={{ background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", border:"none", borderRadius:12, padding:"11px 28px", fontWeight:700, fontSize:"0.95rem", cursor:"pointer" }}>
          Iniciar sesión
        </button>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="imagen" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} style={{ position:"absolute", top:20, right:20, background:"rgba(255,255,255,.12)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.2)", color:"#fff", borderRadius:12, padding:"9px 18px", cursor:"pointer", fontWeight:700, fontSize:"0.85rem", display:"flex", alignItems:"center", gap:6 }}>
            <X size={15} /> Cerrar
          </button>
        </div>
      )}

      <div className="chat-root">

        {/* ══ SIDEBAR ══ */}
        <div className={`cs${mobileView === "chat" ? " hide" : ""}`}>
          <div className="cs-header">
            <h2 className="cs-title">
              <MessageCircle size={20} style={{ color:"#f97316" }} />
              Mensajes
              {totalUnread > 0 && (
                <span style={{ background:"#f97316", color:"#fff", fontSize:"0.68rem", fontWeight:800, minWidth:20, height:20, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 5px", whiteSpace:"nowrap", lineHeight:1 }}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </h2>
            <div className="cs-search">
              <Search size={14} style={{ color:"#bbb", flexShrink:0 }} />
              <input placeholder="Buscar conversación..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#bbb", lineHeight:0, padding:0 }}><X size={13} /></button>}
            </div>
          </div>

          <div className="cs-list">
            {convsLoading ? <ConvSkeleton /> : filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"3rem 1rem", color:"#bbb" }}>
                <MessageCircle size={40} strokeWidth={1} style={{ marginBottom:12 }} />
                <p style={{ fontSize:"0.875rem", fontWeight:600, color:"#888" }}>{search ? "Sin resultados" : "No tenés conversaciones aún"}</p>
                {!search && <p style={{ fontSize:"0.8rem", color:"#bbb", marginTop:4 }}>Contactá un negocio para comenzar</p>}
              </div>
            ) : filtered.map(conv => {
              const isActive = activeId === conv._id;
              const lastText = conv.lastMessage?.image && !conv.lastMessage?.text ? "📷 Imagen" : conv.lastMessage?.text || "";
              return (
                <div key={conv._id} className={`ci${isActive ? " active" : ""}`} onClick={() => openConversation(conv._id)}>
                  <img src={avatarUrl(conv.other)} alt={conv.other?.name || "Usuario"} className="ci-avatar"
                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other?.name||"?")}&background=f97316&color=fff&size=96`; }} />
                  <div className="ci-info">
                    <div className="ci-name">{conv.other?.name || "Usuario"}</div>
                    <div className={`ci-last${conv.unreadCount > 0 ? " unread" : ""}`}>
                      {lastText || <span style={{ color:"#ccc", fontStyle:"italic", fontSize:"0.75rem" }}>Sin mensajes</span>}
                    </div>
                  </div>
                  <div className="ci-meta">
                    <span className="ci-time">{conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ""}</span>
                    {conv.unreadCount > 0 && <span className="unread-badge">{conv.unreadCount > 99 ? "99+" : conv.unreadCount}</span>}
                  </div>
                  <button className="ci-del" onClick={e => deleteConversation(conv._id, e)} title="Borrar conversación"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ CHAT AREA ══ */}
        <div className={`ca${mobileView === "chat" ? " active" : ""}`}>
          {!effectiveConv ? (
            <div className="ca-empty">
              <div className="ca-empty-icon"><MessageCircle size={36} style={{ color:"#f97316" }} strokeWidth={1.5} /></div>
              <h3>Seleccioná una conversación</h3>
              <p>O contactá un negocio desde su página<br />para comenzar a chatear</p>
            </div>
          ) : (
            <>
              <div className="ca-header">
                <button className="icon-btn btn-back-mobile btn-attach" style={{ width:36, height:36 }} onClick={() => { setMobileView("list"); setActiveId(null); }}>
                  <ArrowLeft size={18} />
                </button>

                <div style={{ position:"relative", flexShrink:0 }}>
                  <img src={avatarUrl(effectiveConv!.other)} alt={effectiveConv!.other?.name}
                    style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover", border:"2px solid #ffe5cc", boxShadow:"0 2px 8px rgba(0,0,0,.1)", display:"block" }}
                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv!.other?.name||"?")}&background=f97316&color=fff&size=96`; }} />
                  <span style={{ position:"absolute", bottom:1, right:1, width:12, height:12, borderRadius:"50%", background: typing ? "#f97316" : "#22c55e", border:"2px solid #fff", transition:"background .4s", animation: typing ? "blink 1s ease-in-out infinite" : "none" }} />
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div className="ca-header-name">{effectiveConv!.other?.name}</div>
                  <div className="ca-header-sub">
                    {typing ? (
                      <>
                        <span style={{ color:"#f97316", fontWeight:700, fontSize:"0.71rem" }}>escribiendo</span>
                        <span className="typing-header-dots">
                          <span className="typing-header-dot" />
                          <span className="typing-header-dot" />
                          <span className="typing-header-dot" />
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", display:"inline-block", boxShadow:"0 0 0 2px rgba(34,197,94,.25)" }} />
                        <span>En línea</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="ca-messages">
                {msgsLoading ? (
                  <div style={{ display:"flex", justifyContent:"center", padding:"3rem", color:"#bbb", flexDirection:"column", alignItems:"center", gap:10 }}>
                    <Loader2 size={28} style={{ animation:"spin 0.8s linear infinite" }} />
                    <span style={{ fontSize:"0.85rem" }}>Cargando mensajes...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign:"center", color:"#bbb", fontSize:"0.85rem", padding:"3rem 1rem", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                    <SmilePlus size={36} strokeWidth={1} />
                    <span>No hay mensajes aún.<br />¡Mandá el primero!</span>
                  </div>
                ) : (() => {
                  let lastDateLabel = "";
                  return messages.map(msg => {
                    const mine      = msg.sender._id === userId;
                    const dateLabel = dateSep(msg.createdAt);
                    const showDate  = dateLabel !== lastDateLabel;
                    lastDateLabel   = dateLabel;
                    const allRead   = msg.readBy.length >= 2;
                    const imgOnly   = !!msg.image && !msg.text;

                    return (
                      <div key={msg._id}>
                        {showDate && <div className="date-sep"><span>{dateLabel}</span></div>}
                        <div className={`brow ${mine ? "mine" : "theirs"}`}>
                          {!mine && (
                            <img src={avatarUrl(effectiveConv?.other)} alt="" className="b-avatar"
                              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv?.other?.name||"?")}&background=f97316&color=fff&size=56`; }} />
                          )}
                          <div className="b-wrap">
                            {mine && (
                              <button className="b-del-btn right" onClick={() => deleteMessage(msg._id)} title="Borrar">
                                <Trash2 size={10} />
                              </button>
                            )}
                            <div className={`bubble ${mine ? "mine" : "theirs"}`}>
                              {msg.image && (
                                <div className={`b-img-wrap${imgOnly ? " img-only" : ""}`}>
                                  <img
                                    src={msg.image}
                                    alt="imagen"
                                    className="b-img"
                                    onClick={() => setLightbox(msg.image!)}
                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                              )}
                              {msg.text && (
                                <span style={{ display:"block", whiteSpace:"pre-wrap", wordBreak:"break-word", overflowWrap:"anywhere" }}>
                                  {msg.text}
                                </span>
                              )}
                              <div className="b-meta">
                                <span>{timeFull(msg.createdAt)}</span>
                                {mine && (allRead ? <CheckCheck size={12} /> : <Check size={12} />)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                {typing && (
                  <div className="brow theirs" style={{ alignItems:"flex-end", gap:8 }}>
                    <img src={avatarUrl(effectiveConv?.other)} alt="" className="b-avatar"
                      onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv?.other?.name||"?")}&background=f97316&color=fff&size=56`; }} />
                    <div className="typing-bubble">
                      <div className="t-dot" /><div className="t-dot" /><div className="t-dot" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {imgPreview && (
                <div className="img-preview-bar">
                  <img src={imgPreview} alt="preview" />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:"0.82rem", color:"#f97316" }}>Imagen lista</div>
                    <div style={{ fontSize:"0.75rem", color:"#888" }}>{imgFile?.name} · {((imgFile?.size||0)/1024).toFixed(0)} KB</div>
                  </div>
                  <button onClick={() => { setImgFile(null); setImgPreview(null); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", lineHeight:0 }}>
                    <X size={18} />
                  </button>
                </div>
              )}

              <div className="ca-input">
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileChange} />
                <button className="icon-btn btn-attach" onClick={() => fileRef.current?.click()} title="Adjuntar imagen">
                  <ImageIcon size={18} />
                </button>
                <textarea
                  className="input-ta"
                  placeholder="Escribí un mensaje... (Enter para enviar)"
                  value={text}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  onInput={e => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 120) + "px";
                  }}
                />
                <button className="icon-btn btn-send" onClick={handleSend} disabled={(!text.trim() && !imgFile) || sending} title="Enviar">
                  {sending ? <Loader2 size={17} style={{ animation:"spin 0.8s linear infinite" }} /> : <Send size={17} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100dvh" }}>
        <Loader2 size={32} style={{ color:"#f97316" }} />
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}
