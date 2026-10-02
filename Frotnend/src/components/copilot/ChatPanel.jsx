import { useCallback, useEffect, useRef, useState } from 'react';
import { copilotApi, productApi } from '../../services/api';
import './ChatPanel.css';

const PROMPTS = [
  'Analyze my latest inspection results.',
  'Summarize current product quality.',
  'Explain anomaly detection.',
  'Identify products with high rejection rates.',
  'How can I improve my inspection process?',
  'Explain the reference dataset status.',
];

const UNAVAILABLE = 'AI Inspector is currently unavailable. Please ensure Ollama is running and llama3.1:8b is installed.';

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ status: 'checking', available: false, model: 'llama3.1:8b' });
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    try { setStatus(await copilotApi.status()); }
    catch { setStatus({ status: 'unavailable', available: false, model: 'llama3.1:8b' }); }
  }, []);

  const refreshConversations = useCallback(async () => {
    try { setConversations((await copilotApi.conversations()).conversations || []); }
    catch { /* The chat itself reports request errors; keep the panel usable. */ }
  }, []);

  useEffect(() => {
    let active = true;
    const loadStatus = () => copilotApi.status().then((value) => { if (active) setStatus(value); })
      .catch(() => { if (active) setStatus({ status: 'unavailable', available: false, model: 'llama3.1:8b' }); });
    loadStatus();
    const statusInterval = window.setInterval(loadStatus, 30000);
    productApi.getProducts().then((value) => { if (active) setProducts(value.products || []); }).catch(() => {});
    copilotApi.conversations().then((value) => { if (active) setConversations(value.conversations || []); }).catch(() => {});
    return () => { active = false; window.clearInterval(statusInterval); };
  }, []);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, busy]);

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    setError('');
  };

  const loadConversation = async (id) => {
    if (busy) return;
    setError('');
    try {
      const result = await copilotApi.conversation(id);
      setConversationId(result.conversation.id);
      setProductId(result.conversation.product_id == null ? '' : String(result.conversation.product_id));
      setMessages(result.messages.map((item) => ({ role: item.role, content: item.content, id: item.id })));
    } catch (requestError) { setError(requestError.message); }
  };

  const sendMessage = async (value = input) => {
    const content = value.trim();
    if (!content || busy) return;
    setInput('');
    setError('');
    setMessages((current) => [...current, { role: 'user', content }, { role: 'assistant', content: '', pending: true }]);
    setBusy(true);
    try {
      const response = await copilotApi.chat({
        message: content,
        ...(conversationId ? { conversationId } : {}),
        productId: productId ? Number(productId) : null,
      });
      setConversationId(response.conversationId);
      setMessages((current) => current.map((item) => item.pending
        ? { role: 'assistant', content: response.message.content, id: Date.now() }
        : item));
      refreshConversations().catch(() => {});
      await refreshStatus();
    } catch (requestError) {
      setMessages((current) => current.filter((item) => !item.pending));
      const message = requestError.status === 503 || requestError.status === 502
        ? (requestError.message || UNAVAILABLE) : requestError.message;
      setError(message);
      await refreshStatus();
    } finally { setBusy(false); }
  };

  const handleSubmit = (event) => { event.preventDefault(); sendMessage(); };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const deleteConversation = async () => {
    if (!conversationId || busy) return;
    try {
      await copilotApi.deleteConversation(conversationId);
      startNewChat();
      await refreshConversations();
    } catch (requestError) { setError(requestError.message); }
  };

  const copyMessage = async (item) => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch { setError('Unable to copy this response from the browser.'); }
  };

  const statusLabel = busy ? 'Thinking' : status.available ? 'Connected' : status.status === 'checking' ? 'Checking' : 'Disconnected';
  const selectedProduct = products.find((item) => String(item.id) === productId);

  return (
    <section className="copilot-shell" aria-label="VisionQC AI Inspector">
      <aside className="copilot-history">
        <button className="copilot-new-chat" type="button" onClick={startNewChat} disabled={busy}>
          <i className="fas fa-plus" aria-hidden="true" /> New chat
        </button>
        <div className="copilot-history-heading">Recent conversations</div>
        <div className="copilot-history-list">
          {conversations.map((item) => (
            <button key={item.id} type="button" className={`copilot-history-item ${item.id === conversationId ? 'active' : ''}`} onClick={() => loadConversation(item.id)}>
              <span>{item.title || 'New conversation'}</span>
              {item.product_name && <small>{item.product_name}</small>}
            </button>
          ))}
          {!conversations.length && <p className="copilot-history-empty">Your saved chats will appear here.</p>}
        </div>
      </aside>

      <div className="copilot-main">
        <header className="copilot-header">
          <div className="copilot-avatar"><i className="fas fa-microchip" aria-hidden="true" /></div>
          <div className="copilot-heading-copy">
            <h2>VisionQC AI Inspector</h2>
            <p>Your intelligent manufacturing quality control assistant.</p>
            {selectedProduct && <span className="copilot-selected-product">Context: {selectedProduct.product_name}</span>}
          </div>
          <div className={`copilot-status ${status.available ? 'online' : 'offline'}`}>
            <span className="copilot-status-dot" /> {statusLabel}
            <small>Model: {status.model || 'llama3.1:8b'}</small>
          </div>
        </header>

        <div className="copilot-toolbar">
          <label htmlFor="copilot-product">Product context</label>
          <select id="copilot-product" value={productId} disabled={busy} onChange={(event) => setProductId(event.target.value)}>
            <option value="">All my products</option>
            {products.map((product) => <option value={product.id} key={product.id}>{product.product_name} · {product.product_id}</option>)}
          </select>
          {conversationId && <button type="button" className="copilot-delete" onClick={deleteConversation} disabled={busy} title="Delete this conversation"><i className="fas fa-trash" aria-hidden="true" /> Delete chat</button>}
        </div>

        <div className="copilot-messages" ref={messagesRef} aria-live="polite">
          {!messages.length ? (
            <div className="copilot-welcome">
              <div className="copilot-welcome-icon"><i className="fas fa-industry" aria-hidden="true" /></div>
              <h3>How can I help with quality today?</h3>
              <p>I can explain your products and reference datasets. Inspection result records are not currently stored in this application.</p>
              <div className="copilot-suggestions">
                {PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={busy}>{prompt}</button>)}
              </div>
            </div>
          ) : messages.map((item, index) => (
            <article key={item.id || `${item.role}-${index}`} className={`copilot-message ${item.role}`}>
              <div className="copilot-message-label">{item.role === 'user' ? 'You' : 'AI Inspector'}</div>
              <div className="copilot-message-text">{item.pending ? <span className="copilot-thinking"><i className="fas fa-circle-notch fa-spin" aria-hidden="true" /> Thinking…</span> : item.content}</div>
              {item.role === 'assistant' && item.content && <button className="copilot-copy" type="button" onClick={() => copyMessage(item)}>{copiedId === item.id ? 'Copied' : 'Copy response'}</button>}
            </article>
          ))}
        </div>

        {error && <div role="alert" className="copilot-error">{error}</div>}
        {!status.available && status.status !== 'checking' && <div className="copilot-unavailable-note">{UNAVAILABLE}</div>}
        <form className="copilot-composer" onSubmit={handleSubmit}>
          <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about products, reference datasets, or quality control…" rows={2} disabled={busy} aria-label="Message the AI Inspector" />
          <div className="copilot-composer-footer"><span>Enter to send · Shift + Enter for a new line</span><button type="submit" disabled={busy || !input.trim()}><i className="fas fa-paper-plane" aria-hidden="true" /> Send</button></div>
        </form>
      </div>
    </section>
  );
}
