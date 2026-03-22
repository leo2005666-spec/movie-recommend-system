import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserIcon, HeartIcon, StarIcon, ChatCircleDotsIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { api, getAvatarUrl } from '../api/request';

export default function Profile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  /** 本地上传头像中 */
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  /** 头像图加载失败时回退为首字母 */
  const [avatarLoadErr, setAvatarLoadErr] = useState(false);

  useEffect(() => {
    api.get('/users/me')
      .then((r) => {
        setProfile(r.data);
        setUsername(r.data?.username || '');
        setNickname(r.data?.nickname || '');
        setAvatar(r.data?.avatar || '');
        setAvatarLoadErr(false);
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
      avatar: avatar?.trim() ? avatar.trim() : '',
    };
    if (password) body.password = password;
    try {
      await api.put('/users/me', body);
      setMsg('更新成功');
      setPassword('');
      api.get('/users/me').then((r) => {
        setProfile(r.data);
        setUsername(r.data?.username || '');
        setAvatar(r.data?.avatar || '');
        setAvatarLoadErr(false);
        updateUser({
          username: r.data?.username,
          nickname: r.data?.nickname,
          avatar: r.data?.avatar || null,
        });
      });
    } catch (e) {
      setMsg(e.message || '更新失败');
    }
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg('');
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const r = await api.postForm('/users/me/avatar', fd);
      const u = r.data;
      setProfile(u);
      setAvatar(u?.avatar || '');
      setAvatarLoadErr(false);
      updateUser({
        username: u?.username,
        nickname: u?.nickname,
        avatar: u?.avatar || null,
      });
      setMsg('头像上传成功');
    } catch (err) {
      setMsg(err.message || '上传失败');
    } finally {
      setUploadingAvatar(false);
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
          {profile.avatar && !avatarLoadErr ? (
            <img
              src={getAvatarUrl(profile.avatar)}
              alt=""
              className="profile-overview__avatar-img"
              onError={() => setAvatarLoadErr(true)}
            />
          ) : (
            initial
          )}
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
          <label>头像</label>
          <div className="profile-avatar-upload">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="profile-avatar-upload__input"
              id="profile-avatar-file"
              disabled={uploadingAvatar}
              onChange={handleAvatarFile}
            />
            <label htmlFor="profile-avatar-file" className="btn btn-outline profile-avatar-upload__btn">
              {uploadingAvatar ? '上传中…' : '从本地上传图片'}
            </label>
            <span className="profile-avatar-upload__tip">支持 jpg / png / gif / webp，单张不超过 2MB</span>
          </div>
        </div>
        <div className="form-group">
          <label>或填写头像链接（http/https，留空则显示首字母）</label>
          <input
            className="form-input"
            type="url"
            inputMode="url"
            value={avatar}
            onChange={(e) => {
              setAvatar(e.target.value);
              setAvatarLoadErr(false);
            }}
            placeholder="https://example.com/avatar.jpg"
            maxLength={2048}
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
