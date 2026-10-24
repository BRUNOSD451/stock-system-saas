import { useEffect, useRef, useState } from "react";
import { Bot, MessageSquare, Send, X } from "lucide-react";
import { apiController } from "../../../services/Api";
import "./chatModal.css";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// O histórico persistido é carregado ao abrir a conversa.
interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Quais produtos estão com estoque baixo?",
  "Qual é o valor total do meu estoque?",
  "Quais produtos tiveram mais saídas?",
  "Quais produtos estão parados no estoque?",
  "Quais foram as últimas movimentações?",
  "Quanto entrou e saiu do estoque este mês?",
];
export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const nextMessageId = useRef(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!isOpen || isSending) return;
    let cancelled = false;
    setIsLoadingHistory(true);
    setHistoryReady(false);
    setHistoryError("");
    async function loadHistory() {
      try {
        const response = await apiController.get<{ messages: Omit<ChatMessage, "id">[] }>("/chat/history");
        if (!Array.isArray(response?.messages) || response.messages.some(message =>
          !message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string")) {
          throw new Error("O histórico retornado é inválido.");
        }
        if (cancelled) return;
        setMessages(response.messages.slice(-20).map(message => ({ ...message, id: ++nextMessageId.current })));
        setHistoryReady(true);
      } catch (requestError) {
        if (!cancelled) setHistoryError(requestError instanceof Error ? requestError.message : "Não foi possível carregar a conversa.");
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, [isOpen, isSending, historyAttempt]);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!element.open) element.showModal();
    input.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    // Rola somente o histórico, sem deslocar o dialog ou a página.
    if (isOpen && history.current) {
      history.current.scrollTop = history.current.scrollHeight;
    }
  }, [messages, isOpen, isSending, error]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending.current || isLoadingHistory || !historyReady) return;
    sending.current = true;
    setIsSending(true);
    setError("");
    const messageId = ++nextMessageId.current;
    setMessages(previous => [...previous, { id: messageId, role: "user", content }]);
    setDraft("");
    input.current?.focus({ preventScroll: true });
    try {
      const response = await apiController.post<{ message?: unknown }>("/chat", { message: content });
      if (typeof response?.message !== "string" || !response.message.trim()) {
        throw new Error("A IA retornou uma resposta inválida. Tente novamente.");
      }
      const reply = response.message;
      const replyId = ++nextMessageId.current;
      setMessages(previous => [...previous, { id: replyId, role: "assistant" as const, content: reply }].slice(-20));
    } catch (requestError) {
      setMessages(previous => previous.filter(message => message.id !== messageId));
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar a mensagem.");
      setDraft(previous => previous || content);
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }

  return <dialog ref={dialog} className="ai-chat-modal" aria-labelledby="ai-chat-title" onCancel={onClose} onClick={event => {
    if (event.target === event.currentTarget) {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }
  }}>
    <div className="ai-chat-panel">
      <header className="ai-chat-header">
        <span className="ai-chat-avatar"><Bot size={24} aria-hidden="true" /></span>
        <div><h2 id="ai-chat-title">Assistente IA</h2><p>Pergunte sobre produtos, movimentações e reposição.</p></div>
        <button type="button" className="ai-chat-close" aria-label="Fechar chat" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>


      <div ref={history} className="ai-chat-history" role="log" aria-label="Histórico da conversa" aria-live="polite">
        {isLoadingHistory && <p className="ai-chat-state" role="status">Carregando conversa...</p>}
        {historyError && <p className="ai-chat-state is-error" role="alert">{historyError}</p>}
        {!isLoadingHistory && !historyReady && <button type="button" className="btn btn-secondary btn-sm ai-chat-retry" onClick={() => setHistoryAttempt(attempt => attempt + 1)}>Tentar carregar novamente</button>}
        {historyReady && messages.length === 0 && <div className="ai-chat-welcome">
          <span className="ai-chat-welcome-icon"><MessageSquare size={30} aria-hidden="true" /></span>
          <h3>Como posso ajudar?</h3>
          <p>Escreva sua pergunta ou escolha uma sugestão para começar.</p>
          <div className="ai-chat-suggestions">{suggestions.map(text => <button type="button" key={text} onClick={() => { setDraft(text); input.current?.focus(); }}>{text}</button>)}</div>
        </div>}
        {messages.map(message => <div className={`ai-chat-message ai-chat-message-${message.role}`} key={message.id}>
          <span>{message.role === "user" ? "Você" : "Assistente IA"}</span>
          <p>{message.content}</p>
        </div>)}
        {isSending && <p className="ai-chat-typing" role="status">A IA está respondendo...</p>}
        {error && <p className="ai-chat-state is-error" role="alert">{error}</p>}
      </div>

      <form className="ai-chat-compose" onSubmit={event => { event.preventDefault(); sendMessage(); }}>
        <div className="ai-chat-input-row">
          <textarea ref={input} aria-label="Sua mensagem" placeholder="Digite sua mensagem..." value={draft} maxLength={4000} rows={2} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); }
          }} />
          <button type="submit" disabled={isSending || isLoadingHistory || !historyReady || !draft.trim()} aria-label="Enviar mensagem"><Send size={19} aria-hidden="true" /></button>
        </div>
        <p>Enter envia. Shift + Enter quebra a linha.</p>
      </form>
    </div>
  </dialog>;
}
