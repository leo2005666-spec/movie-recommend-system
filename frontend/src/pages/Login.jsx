/**
 * 登录页 - 分屏布局 + 社交登录入口
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignIn } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.user, res.data.token);
      nav('/');
    } catch (e) {
      setErr(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout sideTitle="欢迎回来" sideDesc="发现你喜欢的影视">
      <div className="auth-card">
        <h1 className="auth-title">登录</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              required
            />
          </div>
          <div className="auth-field">
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-check">
              <input type="checkbox" /> 记住我
            </label>
          </div>
          {err && <div className="auth-error">{err}</div>}
          <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
            <SignIn size={20} weight="bold" className="auth-btn__icon" />
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="auth-footer">
          还没有账号？<Link to="/register" className="auth-link">立即注册</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
