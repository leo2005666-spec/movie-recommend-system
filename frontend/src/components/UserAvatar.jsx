import { useState, useMemo, useEffect } from 'react';
import { getAvatarUrl } from '../api/request';

/** 与 user.id 解耦的 12 套渐变，未上传头像时按 avatar_style 区分 */
const PALETTES = [
  { bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', fg: '#fff' },
  { bg: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)', fg: '#fff' },
  { bg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', fg: '#fff' },
  { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fg: '#fff' },
  { bg: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)', fg: '#fff' },
  { bg: 'linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)', fg: '#fff' },
  { bg: 'linear-gradient(135deg, #64748b 0%, #334155 100%)', fg: '#f1f5f9' },
  { bg: 'linear-gradient(135deg, #d946ef 0%, #7c3aed 100%)', fg: '#fff' },
  { bg: 'linear-gradient(135deg, #f97316 0%, #eab308 100%)', fg: '#1c1917' },
  { bg: 'linear-gradient(135deg, #22c55e 0%, #84cc16 100%)', fg: '#14532d' },
  { bg: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', fg: '#fff' },
  { bg: 'linear-gradient(135deg, #78716c 0%, #1c1917 100%)', fg: '#fafaf9' },
];

function styleIndex(userId, avatarStyle) {
  const n = Number(avatarStyle);
  if (Number.isFinite(n) && n >= 0) return n % PALETTES.length;
  const id = Number(userId);
  if (Number.isFinite(id) && id > 0) return id % PALETTES.length;
  return 0;
}

/**
 * @param {object} props
 * @param {string} [props.username] 无头像时用于首字展示
 * @param {string|null} [props.avatar] 相对路径如 /uploads/avatars/...
 * @param {number|null|undefined} [props.avatarStyle] 后端 users.avatar_style
 * @param {number|string} [props.userId] 兜底算色
 * @param {number} [props.size]
 * @param {string} [props.className]
 * @param {string} [props.imgClassName]
 */
export default function UserAvatar({
  username,
  avatar,
  avatarStyle,
  userId,
  size = 40,
  className = '',
  imgClassName = '',
}) {
  const [imgBroken, setImgBroken] = useState(false);
  useEffect(() => {
    setImgBroken(false);
  }, [avatar]);
  const src = avatar && String(avatar).trim() && !imgBroken ? getAvatarUrl(avatar) : '';
  const letter = useMemo(() => {
    const s = (username || '?').trim();
    return s ? s[0].toUpperCase() : '?';
  }, [username]);
  const idx = styleIndex(userId, avatarStyle);
  const p = PALETTES[idx];
  const dim = typeof size === 'number' ? `${size}px` : size;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={`user-avatar user-avatar--img ${imgClassName} ${className}`.trim()}
        referrerPolicy="no-referrer"
        onError={() => setImgBroken(true)}
      />
    );
  }

  return (
    <span
      className={`user-avatar user-avatar--fallback ${className}`.trim()}
      style={{
        width: dim,
        height: dim,
        background: p.bg,
        color: p.fg,
        fontSize: `max(12px, ${Number(size) * 0.38}px)`,
      }}
      aria-hidden
    >
      {letter}
    </span>
  );
}
