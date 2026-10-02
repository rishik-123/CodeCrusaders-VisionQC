import { useState, useRef, useEffect } from 'react';
import Card from '../common/Card';
import { chatSamples, suggestedQuestions } from '../../data/mockData';

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Hello! I\'m your VisionQC AI Copilot. Ask me anything about your quality inspections, trends, or model performance.',
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesRef = useRef();

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const sendMessage = (text) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    // Find matching answer or use default
    const match = chatSamples.find(
      (s) => s.question.toLowerCase() === text.toLowerCase()
    );

    setTimeout(() => {
      setTyping(false);
      if (match) {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: match.answer, metrics: match.metrics },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: `Based on the current data, I can see that overall quality is trending well with a 12.1% rejection rate. The most common failure area is the "Top Edge" region. Would you like me to analyze a specific aspect further?`,
          },
        ]);
      }
    }, 1200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Card title="AI Copilot">
      <div className="chat-panel">
        <div className="chat-messages" ref={messagesRef}>
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`chat-bubble ${msg.role}`}>{msg.text}</div>
              {msg.metrics && (
                <div
                  style={{
                    background: 'var(--page-bg)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginTop: 8,
                    maxWidth: '75%',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                    Referenced Metrics
                  </div>
                  {msg.metrics.map((m, j) => (
                    <div
                      key={j}
                      className="d-flex justify-between"
                      style={{ fontSize: 12, padding: '4px 0', borderBottom: j < msg.metrics.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <span style={{ color: 'var(--text)' }}>{m.label}</span>
                      <strong style={{ color: 'var(--heading)' }}>{m.value}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="chat-bubble bot" style={{ opacity: 0.6 }}>
              <i className="fas fa-circle-notch fa-spin"></i> Thinking...
            </div>
          )}
        </div>

        <div className="suggested-questions">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              className="suggested-chip"
              onClick={() => sendMessage(q)}
              disabled={typing}
            >
              {q}
            </button>
          ))}
        </div>

        <form className="chat-input-area" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ask about quality, trends, or model performance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={typing}
          />
          <button type="submit" disabled={typing || !input.trim()}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </Card>
  );
}
