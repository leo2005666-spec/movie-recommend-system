/**
 * 注册页 - 分屏布局
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeSlash, UserCircle } from '@phosphor-icons/react';
import { api } from '../api/request';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
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
    } catch (e2) {
      setErr(e2?.message || '注册失败，请检查网络或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      sideTitle="开启你的片单"
      sideDesc="收藏、评分与个性化推荐，一站搞定"
      showLogo={false}
    >
      <div className="auth-card">
        <h1 className="auth-title--hero">注册</h1>
        <p className="auth-kicker">创建账号，收藏、评分与个性化推荐</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="sr-only" htmlFor="reg-username">
              用户名
            </label>
            <div className="auth-input-shell">
              <User className="auth-input-shell__icon" size={20} weight="duotone" aria-hidden />
              <input
                id="reg-username"
                className="auth-input auth-input--shell"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名（2～20 个字符）"
                required
                minLength={2}
                maxLength={20}
                autoComplete="username"
              />
            </div>
          </div>
          <div className="auth-field">
            <label className="sr-only" htmlFor="reg-password">
              密码
            </label>
            <div className="auth-input-shell">
              <Lock className="auth-input-shell__icon" size={20} weight="duotone" aria-hidden />
              <input
                id="reg-password"
                className="auth-input auth-input--shell"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码（至少 6 位）"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-input-shell__toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '隐藏密码' : '显示密码'}
              >
                {showPw ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label className="sr-only" htmlFor="reg-password2">
              确认密码
            </label>
            <div className="auth-input-shell">
              <Lock className="auth-input-shell__icon" size={20} weight="duotone" aria-hidden />
              <input
                id="reg-password2"
                className="auth-input auth-input--shell"
                type={showPw2 ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-input-shell__toggle"
                onClick={() => setShowPw2((v) => !v)}
                aria-label={showPw2 ? '隐藏确认密码' : '显示确认密码'}
              >
                {showPw2 ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label className="sr-only" htmlFor="reg-nickname">
              昵称
            </label>
            <div className="auth-input-shell">
              <UserCircle className="auth-input-shell__icon" size={20} weight="duotone" aria-hidden />
              <input
                id="reg-nickname"
                className="auth-input auth-input--shell"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="昵称（选填）"
                autoComplete="nickname"
              />
            </div>
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
