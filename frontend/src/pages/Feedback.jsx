import { useState } from 'react';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';

export default function Feedback() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!content.trim() || content.trim().length < 5) {
      return setMsg('反馈内容至少 5 个字');
    }
    setSubmitting(true);
    try {
      await api.post('/feedbacks', { content: content.trim(), type });
      setMsg('感谢您的反馈！');
      setSubmitted(true);
      setContent('');
    } catch (e) {
      setMsg(e.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const types = [
    { value: 'general', label: '一般反馈' },
    { value: 'bug', label: '问题反馈' },
    { value: 'suggestion', label: '功能建议' },
    { value: 'recommend', label: '推荐效果' },
  ];

  return (
    <div className="form-page" style={{ maxWidth: 520 }}>
      <h1 className="page-title">
        <PaperPlaneTiltIcon size={24} weight="regular" className="page-title__icon" />
        意见反馈
      </h1>
      <p className="empty-hint" style={{ marginBottom: 'var(--space-lg)' }}>
        收集您对系统功能和推荐效果的评价，帮助我们改进
      </p>
      {submitted ? (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <p style={{ color: 'var(--accent)' }}>感谢您的反馈，我们会认真对待每一条意见！</p>
          <button onClick={() => setSubmitted(false)} className="btn btn-outline" style={{ marginTop: 'var(--space-md)' }}>继续反馈</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-xl)' }}>
          <div className="form-group">
            <label>反馈类型</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              {types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>反馈内容（5-1000字）</label>
            <textarea className="form-input form-textarea" value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="请详细描述您的意见或建议..." required minLength={5} maxLength={1000} />
          </div>
          {user && <p className="empty-hint" style={{ fontSize: '0.85rem' }}>将以 {user.nickname || user.username} 身份提交</p>}
          {!user && <p className="empty-hint" style={{ fontSize: '0.85rem' }}>可匿名提交，登录后提交可查看反馈进度</p>}
          {msg && <div className={msg.includes('感谢') ? '' : 'error-msg'} style={{ marginTop: 'var(--space-sm)' }}>{msg}</div>}
          <button type="submit" className="btn" style={{ marginTop: 'var(--space-md)' }} disabled={submitting}>{submitting ? '提交中...' : '提交反馈'}</button>
        </form>
      )}
    </div>
  );
}
