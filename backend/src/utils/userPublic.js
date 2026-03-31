/**
 * 头像 URL 加 v= 避免浏览器长期缓存旧图（换头像后仍显示旧图）
 */
function avatarVersionToken(row) {
  if (row.updated_at != null && String(row.updated_at).trim() !== '') {
    return String(row.updated_at).replace(/\s+/g, '');
  }
  if (row.id != null) return String(row.id);
  return '0';
}

/**
 * 返回给前端的用户对象：去掉敏感列；内联头像改为 API 路径（避免 JSON 巨大、且随库持久化）
 */
function stripUserForClient(row) {
  if (!row) return row;
  const out = { ...row };
  delete out.password;
  delete out.avatar_data;
  if (row.avatar_data != null && String(row.avatar_data).trim() !== '') {
    const v = encodeURIComponent(avatarVersionToken(row));
    out.avatar = `/api/users/${row.id}/avatar?v=${v}`;
  }
  return out;
}

/** 评论/联表查询行：含 user_id、username、avatar、avatar_data、avatar_style、user_updated_at */
function mapCommentUserAvatar(row) {
  if (!row) return row;
  const { avatar_data, user_updated_at, ...rest } = row;
  const uid = rest.user_id;
  let avatar = rest.avatar;
  if (avatar_data != null && String(avatar_data).trim() !== '' && uid != null) {
    const v = encodeURIComponent(
      user_updated_at != null && String(user_updated_at).trim() !== ''
        ? String(user_updated_at).replace(/\s+/g, '')
        : String(uid)
    );
    avatar = `/api/users/${uid}/avatar?v=${v}`;
  }
  return { ...rest, avatar };
}

module.exports = { stripUserForClient, mapCommentUserAvatar };
