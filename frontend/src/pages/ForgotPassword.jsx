/**
 * 忘记密码 - 输入邮箱获取重置验证码
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/request';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (e) {
      setErr(e.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout sideTitle="已发送" sideDesc="请查收邮件">
        <div className="auth-card">
          <h1 className="auth-title">验证码已发送</h1>
          <p className="auth-subtitle">
            我们已向 <strong>{email}</strong> 发送了重置密码的验证码，请查收后在下方页面完成重置。
          </p>
          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={() => nav('/reset-password', { state: { email } })}
          >
            去重置密码
          </button>
          <p className="auth-footer">
            <Link to="/login" className="auth-link">返回登录</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout sideTitle="找回密码" sideDesc="输入邮箱获取验证码">
      <div className="auth-card">
        <h1 className="auth-title">忘记密码</h1>
        <p className="auth-subtitle">输入注册时使用的邮箱，我们将发送验证码</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="注册邮箱"
              required
            />
          </div>
          {err && <div className="auth-error">{err}</div>}
          <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
            {loading ? '发送中...' : '发送验证码'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login" className="auth-link">返回登录</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
