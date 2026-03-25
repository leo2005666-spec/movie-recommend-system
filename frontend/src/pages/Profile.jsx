import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserIcon,
  HeartIcon,
  StarIcon,
  ChatCircleDotsIcon,
  CameraIcon,
  PencilSimpleIcon,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/request';
import UserAvatar from '../components/UserAvatar';

/** 头像上传大小限制（与后端一致，用于提示） */
const AVATAR_MAX_MB = 10;

export default function Profile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const loadProfile = () =>
    api.get('/users/me').then((r) => {
      setProfile(r.data);
      setUsername(r.data?.username || '');
      setEmail(r.data?.email || '');
    });

  useEffect(() => {
    loadProfile().catch(() => setProfile(null));
    api.get('/users/me/stats').then((r) => setStats(r.data)).catch(() => setStats({ favorites: 0, ratings: 0, comments: 0 }));
  }, []);

  useEffect(() => {
    if (!msg || isEditing) return;
    const t = setTimeout(() => setMsg(''), 4500);
    return () => clearTimeout(t);
  }, [msg, isEditing]);

  const handleCancel = () => {
    if (!profile) return;
    setUsername(profile.username || '');
    setEmail(profile.email || '');
    setPassword('');
    setMsg('');
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setIsSaving(true);
    const body = {
      username: username?.trim() || undefined,
      email: email?.trim() ?? '',
    };
    if (password) body.password = password;
    try {
      await api.put('/users/me', body);
      setMsg('已保存');
      setPassword('');
      const r = await api.get('/users/me');
      setProfile(r.data);
      setUsername(r.data?.username || '');
      setEmail(r.data?.email || '');
      updateUser({
        username: r.data?.username,
        email: r.data?.email ?? null,
        avatar: r.data?.avatar || null,
        avatar_style: r.data?.avatar_style != null ? Number(r.data.avatar_style) : null,
        nickname: r.data?.nickname ?? undefined,
      });
      setIsEditing(false);
    } catch (err) {
      setMsg(err.message || '保存失败');
    } finally {
      setIsSaving(false);
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
      setProfile((prev) => ({ ...prev, ...u }));
      updateUser({
        username: u?.username,
        email: u?.email ?? null,
        avatar: u?.avatar || null,
        avatar_style: u?.avatar_style != null ? Number(u.avatar_style) : null,
        nickname: u?.nickname ?? undefined,
      });
      setMsg('头像已更新，可继续修改资料后点「保存」或直接关闭编辑');
    } catch (err) {
      setMsg(err.message || '上传失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!profile) return <p className="empty-hint">加载中...</p>;

  const roleLabel = profile.role === 'admin' ? '管理员' : '用户';
  const createdAt = profile.created_at
    ? new Date(profile.created_at).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  const avatarBlock = (
    <div className={`profile-hero__avatar-wrap ${isEditing ? 'profile-hero__avatar-wrap--editable' : ''}`}>
      <div className="profile-overview__avatar profile-hero__avatar">
        <UserAvatar
          userId={profile.id}
          username={profile.username}
          nickname={profile.nickname}
          avatar={profile.avatar}
          avatarStyle={profile.avatar_style}
          size={64}
          imgClassName="profile-overview__avatar-img"
          className="profile-hero__user-avatar"
        />
      </div>
      {isEditing && (
        <>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="profile-avatar-upload__input"
            id="profile-avatar-file"
            disabled={uploadingAvatar || isSaving}
            onChange={handleAvatarFile}
          />
          <label htmlFor="profile-avatar-file" className="profile-avatar-camera" title="更换头像">
            <CameraIcon size={18} weight="bold" aria-hidden />
            <span className="sr-only">更换头像</span>
          </label>
        </>
      )}
    </div>
  );

  return (
    <div className="form-page profile-page profile-page--wide">
      <header className="profile-page__header">
        <h1 className="page-title profile-page__title">
          <UserIcon size={24} weight="regular" className="page-title__icon" />
          个人信息
        </h1>
        <div className="profile-page__toolbar">
          {!isEditing ? (
            <button type="button" className="btn profile-page__edit-btn" onClick={() => { setMsg(''); setIsEditing(true); }}>
              <PencilSimpleIcon size={18} weight="bold" style={{ marginRight: 6 }} />
              编辑
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCancel}
                disabled={isSaving || uploadingAvatar}
              >
                取消
              </button>
              <button
                type="submit"
                form="profile-edit-form"
                className="btn"
                disabled={isSaving || uploadingAvatar}
              >
                {isSaving ? '保存中…' : '保存'}
              </button>
            </>
          )}
        </div>
      </header>
      {msg && !isEditing && (
        <div className={msg.includes('失败') || msg.includes('超过') ? 'error-msg profile-page__flash' : 'profile-page__flash profile-page__flash--ok'} role="status">
          {msg}
        </div>
      )}

      <section className="card profile-hero">
        <div className="profile-hero__row">
          <div className="profile-hero__avatar-col">
            {avatarBlock}
            <div className="profile-hero__email-below">
              {profile.email ? (
                <a href={`mailto:${profile.email}`} className="profile-hero__email-link">
                  {profile.email}
                </a>
              ) : (
                <span className="profile-hero__email-placeholder">未设置邮箱</span>
              )}
            </div>
          </div>
          <div className="profile-hero__meta">
            <div className="profile-hero__name">{profile.username}</div>
            {isEditing && (
              <p className="profile-hero__hint">
                点击头像右下角相机更换头像（jpg / png / gif / webp，≤{AVATAR_MAX_MB}MB）
                {uploadingAvatar ? ' · 上传中…' : ''}
                {uploadingAvatar ? '' : ' · 上传后可点「保存」同步邮箱与密码等'}
              </p>
            )}
            <div className="profile-hero__badges">
              <span className="profile-overview__tag">{roleLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="profile-stats">
        <Link to="/favorites" className="profile-stat card">
          <HeartIcon size={22} weight="regular" className="profile-stat__icon profile-stat__icon--pink" />
          <div className="profile-stat__label">我的收藏</div>
          <div className="profile-stat__value">{stats?.favorites ?? '—'}</div>
        </Link>
        <Link to="/profile/ratings" className="profile-stat card">
          <StarIcon size={22} weight="regular" className="profile-stat__icon profile-stat__icon--amber" />
          <div className="profile-stat__label">我的评分</div>
          <div className="profile-stat__value">{stats?.ratings ?? '—'}</div>
          <div className="profile-stat__hint">查看已评分的影片</div>
        </Link>
        <Link to="/profile/comments" className="profile-stat card">
          <ChatCircleDotsIcon size={22} weight="regular" className="profile-stat__icon profile-stat__icon--green" />
          <div className="profile-stat__label">我的影评</div>
          <div className="profile-stat__value">{stats?.comments ?? '—'}</div>
          <div className="profile-stat__hint">查看全部评论内容</div>
        </Link>
      </div>

      {!isEditing && (
        <div className="profile-info-grid">
          <div className="profile-field-card card">
            <div className="profile-field-card__label">用户名</div>
            <div className="profile-field-card__value">{profile.username}</div>
            <div className="profile-field-card__footer">登录名，修改后仍可用于登录</div>
          </div>
          <div className="profile-field-card card">
            <div className="profile-field-card__label">邮箱</div>
            <div className="profile-field-card__value">
              {profile.email || <span className="profile-field-card__muted">未设置</span>}
            </div>
            <div className="profile-field-card__footer">在编辑中填写或修改</div>
          </div>
          <div className="profile-field-card card">
            <div className="profile-field-card__label">角色</div>
            <div className="profile-field-card__value">
              <span className="profile-field-card__pill">{roleLabel}</span>
            </div>
          </div>
          <div className="profile-field-card card">
            <div className="profile-field-card__label">注册时间</div>
            <div className="profile-field-card__value">{createdAt}</div>
          </div>
        </div>
      )}

      {isEditing && (
        <form id="profile-edit-form" onSubmit={handleSubmit} className="profile-edit-panel card">
          {msg && (
            <div
              className={msg.includes('失败') || msg.includes('超过') ? 'error-msg profile-edit-panel__msg' : 'profile-edit-panel__msg profile-edit-panel__msg--ok'}
              role="status"
            >
              {msg}
            </div>
          )}
          <div className="profile-edit-grid">
            <div className="profile-field-card profile-field-card--input">
              <label className="profile-field-card__label" htmlFor="pf-username">
                用户名（2–20 字符）
              </label>
              <input
                id="pf-username"
                className="form-input profile-field-card__control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={2}
                maxLength={20}
                autoComplete="username"
              />
            </div>
            <div className="profile-field-card profile-field-card--input">
              <label className="profile-field-card__label" htmlFor="pf-email">
                邮箱
              </label>
              <input
                id="pf-email"
                className="form-input profile-field-card__control"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
            <div className="profile-field-card profile-field-card--input profile-field-card--span2">
              <label className="profile-field-card__label" htmlFor="pf-password">
                新密码（不修改请留空）
              </label>
              <input
                id="pf-password"
                className="form-input profile-field-card__control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
