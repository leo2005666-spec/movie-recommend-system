import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';

export default function QADetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [answerContent, setAnswerContent] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api.get(`/qa/${id}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAnswer = async (e) => {
    e.preventDefault();
    if (!user || !answerContent.trim()) return;
    if (answerContent.trim().length < 5) return setErr('回答至少 5 个字');
    setErr('');
    setSubmitting(true);
    try {
      await api.post(`/qa/${id}/answer`, { content: answerContent.trim() });
      setAnswerContent('');
      load();
    } catch (e) {
      setErr(e.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="empty-hint">加载中...</p>;
  if (!data?.question) return <p>问题不存在</p>;

  const { question, answers } = data;

  return (
    <div>
      <Link to="/qa" style={{ marginBottom: '1rem', display: 'inline-block' }}>← 返回列表</Link>
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>{question.title}</h2>
        <p style={{ marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{question.content}</p>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {question.nickname || question.username} · {question.created_at}
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem' }}>回答 ({answers?.length || 0})</h3>
      {user && (
        <form onSubmit={handleAnswer} style={{ marginBottom: 'var(--space-md)' }}>
          <textarea className="form-input form-textarea" value={answerContent} onChange={(e) => setAnswerContent(e.target.value)} placeholder="写下你的回答..." rows={4} style={{ marginBottom: 'var(--space-sm)' }} required />
          {err && <div className="error-msg">{err}</div>}
          <button type="submit" className="btn" disabled={submitting}>{submitting ? '提交中...' : '提交回答'}</button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {(answers || []).map((a) => (
          <div key={a.id} className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--accent)' }}>
            <p style={{ whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{a.content}</p>
            <div className="empty-hint" style={{ fontSize: '0.9rem' }}>
              {a.nickname || a.username} · {a.created_at}
            </div>
          </div>
        ))}
      </div>
      {(!answers || answers.length === 0) && <p className="empty-hint">暂无回答</p>}
    </div>
  );
}
