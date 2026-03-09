/**
 * 注册页 - 分屏布局，用户名+密码即可注册
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/request';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
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
      const body = {
        username: username.trim(),
        password,
        nickname: nickname?.trim() || undefined,
      };
      await api.post('/auth/register', body);
      nav('/login');
    } catch (e) {
      setErr(e?.message || '注册失败，请检查网络或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      sideTitle="加入火龙果影院"
      sideDesc="个性推荐 · 收藏影评"
      showLogo={false}
    >
      <div className="auth-card">
        <h1 className="auth-title">注册</h1>
        <p className="auth-subtitle">填写以下信息完成注册</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名（2-20字符）*"
              required
              minLength={2}
              maxLength={20}
            />
          </div>
          <div className="auth-field">
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少6位）*"
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
              placeholder="确认密码 *"
              required
              minLength={6}
            />
          </div>
          <div className="auth-field">
            <input
              className="auth-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="昵称（选填）"
            />
          </div>
          {err && <div className="auth-error">{err}</div>}
          <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="auth-footer">
          已有账号？<Link to="/login" className="auth-link">立即登录</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
