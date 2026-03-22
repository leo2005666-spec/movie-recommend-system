import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserIcon, HeartIcon, StarIcon, ChatCircleDotsIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';

export default function Profile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/users/me')
      .then((r) => {
        setProfile(r.data);
        setUsername(r.data?.username || '');
        setNickname(r.data?.nickname || '');
        setAvatar(r.data?.avatar || '');
      })
      .catch(() => setProfile(null));
    api.get('/users/me/stats').then((r) => setStats(r.data)).catch(() => setStats({ favorites: 0, ratings: 0, comments: 0 }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    const body = {
      username: username?.trim() || undefined,
      nickname: nickname || undefined,
    };
    if (avatar.trim()) body.avatar = avatar.trim();
    if (password) body.password = password;
    try {
      await api.put('/users/me', body);
      setMsg('更新成功');
      setPassword('');
      api.get('/users/me').then((r) => {
        setProfile(r.data);
        setUsername(r.data?.username || '');
        setAvatar(r.data?.avatar || '');
        updateUser({ username: r.data?.username, nickname: r.data?.nickname });
      });
    } catch (e) {
      setMsg(e.message || '更新失败');
    }
  };

  if (!profile) return <p className="empty-hint">加载中...</p>;

  const displayName = profile.nickname || profile.username;
  const initial = (displayName[0] || '?').toUpperCase();

  return (
    <div className="form-page profile-page">
      <h1 className="page-title">
        <UserIcon size={24} weight="regular" className="page-title__icon" />
        个人信息
      </h1>

      {/* 用户概览卡片 */}
      <div className="profile-overview card">
        <div className="profile-overview__avatar">
          {profile.avatar
            ? (
              <img
                src={profile.avatar}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.setAttribute('data-initial', initial);
                  e.target.parentNode.classList.add('profile-overview__avatar--text');
                }}
              />
            )
            : initial}
        </div>
        <div className="profile-overview__info">
          <div className="profile-overview__name">{displayName}</div>
          <span className="profile-overview__tag">用户</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="profile-stats">
        <Link to="/favorites" className="profile-stat card">
          <HeartIcon size={22} weight="regular" className="profile-stat__icon profile-stat__icon--pink" />
          <div className="profile-stat__label">我的收藏</div>
          <div className="profile-stat__value">{stats?.favorites ?? '—'}</div>
        </Link>
        <div className="profile-stat card">
          <StarIcon size={22} weight="regular" className="profile-stat__icon profile-stat__icon--amber" />
          <div className="profile-stat__label">我的评分</div>
          <div className="profile-stat__value">{stats?.ratings ?? '—'}</div>
        </div>
        <div className="profile-stat card">
          <ChatCircleDotsIcon size={22} weight="regular" className="profile-stat__icon profile-stat__icon--green" />
          <div className="profile-stat__label">我的影评</div>
          <div className="profile-stat__value">{stats?.comments ?? '—'}</div>
        </div>
      </div>

      {/* 个人资料表单 */}
      <form onSubmit={handleSubmit} className="card profile-form">
        <div className="profile-form__title">个人资料</div>
        <div className="form-group">
          <label>用户名（2-20字符）</label>
          <input
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            minLength={2}
            maxLength={20}
          />
        </div>
        <div className="form-group">
          <label>昵称</label>
          <input className="form-input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div className="form-group">
          <label>头像 URL（选填，粘贴图片链接）</label>
          <input
            className="form-input"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="form-group">
          <label>新密码（不修改留空）</label>
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少6位" />
        </div>
        {msg && <div className={msg.includes('失败') ? 'error-msg' : ''} style={{ marginBottom: '0.5rem' }}>{msg}</div>}
        <button type="submit" className="btn">
          <UserIcon size={16} weight="regular" style={{ marginRight: 6 }} />
          保存
        </button>
      </form>
    </div>
  );
}
