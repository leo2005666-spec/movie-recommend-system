import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

/**
 * 直播风格 · 玻璃态聊天覆盖层
 * 半透明毛玻璃消息气泡浮动在内容上方，自动滚动 + 渐变消失，模拟直播弹幕聊天效果
 *
 * Props:
 *  - visible: boolean        — 是否显示
 *  - onToggle: () => void    — 切换显示/隐藏
 *  - messages: []            — 消息列表 { id, user_id, username, avatar, avatar_style, content, created_at }
 *  - onSend: (content) => Promise  — 发送消息回调
 *  - title: string           — 面板标题（默认 "实时讨论"）
 *  - position: 'right'|'left' — 面板位置（默认 right）
 */
export default function ChatOverlay({
  visible,
  onToggle,
  messages = [],
  onSend,
  title = '实时讨论',
  position = 'right',
}) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const prevLenRef = useRef(0);

  /** 新消息到达自动滚底 */
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView?.({ behavior, block: 'end' });
  }, []);

  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      scrollToBottom('smooth');
    }
    prevLenRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  /** 面板初次展开时也滚到底 */
  useEffect(() => {
    if (visible) {
      // 等 CSS transition 结束再滚
      const t = setTimeout(() => scrollToBottom('auto'), 200);
      return () => clearTimeout(t);
    }
  }, [visible, scrollToBottom]);

  const handleSend = async (e) => {
    e.preventDefault();
    const c = input.trim();
    if (!c || !user || !onSend) return;
    setSending(true);
    setErr('');
    try {
      await onSend(c);
      setInput('');
      scrollToBottom('smooth');
    } catch (e2) {
      setErr(e2.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  if (!visible) return null;

  /** 格式化时间 */
  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const posClass = position === 'left' ? 'chat-overlay--left' : 'chat-overlay--right';

  return (
    <div className={`chat-overlay ${posClass}`} aria-label={title} role="complementary">
      {/* 顶部渐变遮罩 */}
      <div className="chat-overlay__mask chat-overlay__mask--top" aria-hidden />

      {/* 头部 */}
      <div className="chat-overlay__head">
        <div className="chat-overlay__head-left">
          {/* 直播指示器 · 跳动小圆点 */}
          <span className="chat-overlay__live-dot" aria-hidden />
          <span className="chat-overlay__title">{title}</span>
          {messages.length > 0 && (
            <span className="chat-overlay__count">{messages.length}</span>
          )}
        </div>
        <button
          type="button"
          className="chat-overlay__close"
          onClick={onToggle}
          aria-label="关闭聊天"
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {/* 消息列表 */}
      <div className="chat-overlay__list" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-overlay__empty">
            <div className="chat-overlay__empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>暂无消息，来发第一条吧</p>
          </div>
        )}
        {messages.map((m) => {
          const isOwn = user && Number(m.user_id) === Number(user.id);
          return (
            <div
              key={m.id}
              className={`chat-overlay__msg ${isOwn ? 'chat-overlay__msg--own' : ''}`}
            >
              {!isOwn && (
                <div className="chat-overlay__msg-av">
                  <UserAvatar
                    userId={m.user_id}
                    username={m.username}
                    avatar={m.avatar}
                    avatarStyle={m.avatar_style}
                    size={28}
                  />
                </div>
              )}
              <div className="chat-overlay__msg-body">
                {!isOwn && (
                  <span className="chat-overlay__msg-name">{m.username}</span>
                )}
                <div className="chat-overlay__msg-bubble">
                  <span className="chat-overlay__msg-text">{m.content}</span>
                </div>
                <span className="chat-overlay__msg-time">{fmtTime(m.created_at)}</span>
              </div>
              {isOwn && (
                <div className="chat-overlay__msg-av">
                  <UserAvatar
                    userId={m.user_id}
                    username={m.username}
                    avatar={m.avatar}
                    avatarStyle={m.avatar_style}
                    size={28}
                  />
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 底部渐变遮罩 */}
      <div className="chat-overlay__mask chat-overlay__mask--bottom" aria-hidden />

      {/* 输入区 */}
      {user ? (
        <form className="chat-overlay__input-row" onSubmit={handleSend}>
          <input
            type="text"
            className="chat-overlay__input"
            placeholder="说点什么…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            autoComplete="off"
          />
          <button
            type="submit"
            className="chat-overlay__send"
            disabled={!input.trim() || sending}
            aria-label="发送"
          >
            {sending ? (
              <span className="chat-overlay__send-spinner" aria-hidden />
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </form>
      ) : (
        <div className="chat-overlay__login-hint">
          <a href="/login">登录</a>后参与讨论
        </div>
      )}
      {err && <div className="chat-overlay__err">{err}</div>}
    </div>
  );
}
