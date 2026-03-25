/**
 * 登录页 - 分屏布局
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignIn, User, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    } catch (e2) {
      setErr(e2.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout sideTitle="欢迎回来" sideDesc="发现你喜欢的影视" showLogo={false}>
      <div className="auth-card">
        <h1 className="auth-title--hero">登录</h1>
        <p className="auth-kicker">使用用户名或邮箱登录，继续浏览与个性化推荐</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="sr-only" htmlFor="login-username">
              用户名
            </label>
            <div className="auth-input-shell">
              <User className="auth-input-shell__icon" size={20} weight="duotone" aria-hidden />
              <input
                id="login-username"
                className="auth-input auth-input--shell"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名 / 邮箱"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div className="auth-field">
            <label className="sr-only" htmlFor="login-password">
              密码
            </label>
            <div className="auth-input-shell">
              <Lock className="auth-input-shell__icon" size={20} weight="duotone" aria-hidden />
              <input
                id="login-password"
                className="auth-input auth-input--shell"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-input-shell__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="auth-field auth-field--remember">
            <label className="auth-check">
              <input type="checkbox" name="remember" />
              记住我
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
