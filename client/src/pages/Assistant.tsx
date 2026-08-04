import { useState, useRef, useEffect } from 'react';
import { assistantApi } from '../api/client';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  figures?: Record<string, string>;
  chips?: string[];
  timestamp: Date;
}

const INITIAL_CHIPS = [
  'Aaj ka total sale kitna hua?',
  'Net profit kitna hai this month?',
  'Abhi cash mein kitna balance hai?',
  'Kiraya (Rent) kitna gaya is mahine?',
  'Loan repayment kitna gaya is mahine?',
  'Pichhle hafte ka withdrawal kitna tha?',
];

function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Namaste! Main aapka Shop Finance Assistant hoon. Aap apne business ke profit, sales, kharchon aur balance ke baare mein koi bhi sawaal pooch sakte hain.',
      chips: INITIAL_CHIPS,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const query = questionText || input.trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      const response = await assistantApi.ask(query);
      const data = response.data;

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.answer,
        figures: data.figures,
        chips: data.exampleChips || INITIAL_CHIPS,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Kshama karein, request process nahi ho saki. Kripya dobara try karein.',
        chips: INITIAL_CHIPS,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 5rem)' }}>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🤖</span> AI Financial Assistant
          </h1>
          <p className="page-subtitle">Instant financial answers powered strictly by audit-proven shop database ledgers</p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="card" style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0,
        boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border)',
      }}>
        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--color-bg)' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                width: '100%',
              }}
            >
              {/* Sender label */}
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-neutral-muted)', marginBottom: '0.25rem', padding: '0 0.25rem' }}>
                {msg.sender === 'user' ? 'You' : 'Finance AI'}
              </span>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: '88%',
                  padding: '1rem 1.25rem',
                  borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.sender === 'user'
                    ? 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)'
                    : 'var(--color-surface)',
                  color: msg.sender === 'user' ? '#FFFFFF' : 'var(--color-neutral-text)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.5,
                  boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(15, 118 110, 0.25)' : 'var(--color-shadow-sm)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {msg.text}

                {/* Compact Financial Metric Cards */}
                {msg.figures && Object.keys(msg.figures).length > 0 && (
                  <div style={{
                    marginTop: '0.875rem',
                    padding: '0.75rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-muted)', marginBottom: '0.5rem' }}>
                      Verified Source Ledger Data
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                      {Object.entries(msg.figures).map(([k, v]) => (
                        <div key={k} style={{
                          background: 'var(--color-surface)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                        }}>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--color-neutral-muted)', fontWeight: 500 }}>{k}</div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-neutral-text)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tappable Suggestion Chips */}
              {msg.chips && msg.sender === 'assistant' && (
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.75rem', maxWidth: '85%' }}>
                  {msg.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      className="chip"
                      onClick={() => handleSend(chip)}
                      disabled={loading}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8125rem',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      💡 {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.75rem 1.25rem', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-neutral-muted)' }}>
              <span className="spinner" style={{ width: 16, height: 16 }} /> Querying shop ledger...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '0.75rem' }}
          >
            <input
              type="text"
              className="input"
              style={{ borderRadius: '24px', paddingLeft: '1.25rem' }}
              placeholder="Ask a question (e.g., 'Aaj ka total sale kitna hua?')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ borderRadius: '24px', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
              disabled={!input.trim() || loading}
            >
              Ask AI 🚀
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Assistant;
