/**
 * 重置密码 - 输入验证码 + 新密码
 */
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/request';
import AuthLayout from '../components/AuthLayout';

export default function ResetPassword() {
  const location = useLocation();
  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password !== confirmPassword) {
      setErr('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        password,
      });
      setSuccess(true);
    } catch (e) {
      setErr(e.message || '重置失败');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout sideTitle="重置成功" sideDesc="请使用新密码登录">
        <div className="auth-card">
          <h1 className="auth-title">密码已重置</h1>
          <p className="auth-subtitle">您已成功重置密码，请使用新密码登录</p>
          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={() => nav('/login')}
          >
            去登录
          </button>
          <p className="auth-footer">
            <Link to="/login" className="auth-link">返回登录</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout sideTitle="设置新密码" sideDesc="输入验证码和新密码">
      <div className="auth-card">
        <h1 className="auth-title">重置密码</h1>
        <p className="auth-subtitle">输入邮箱收到的验证码及新密码</p>

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
          <div className="auth-field">
            <input
              className="auth-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="验证码"
              required
              maxLength={6}
            />
          </div>
          <div className="auth-field">
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新密码（至少6位）"
              required
              minLength={6}
            />
          </div>
          <div className="auth-field">
            <input
              className="auth-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认新密码"
              required
              minLength={6}
            />
          </div>
          {err && <div className="auth-error">{err}</div>}
          <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
            {loading ? '提交中...' : '重置密码'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login" className="auth-link">返回登录</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
