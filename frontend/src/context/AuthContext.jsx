import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/request';

const AuthContext = createContext(null);

function normAvatarStyle(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function userPayloadEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.username === b.username &&
    (a.email || '') === (b.email || '') &&
    (a.avatar || '') === (b.avatar || '') &&
    normAvatarStyle(a.avatar_style) === normAvatarStyle(b.avatar_style) &&
    a.role === b.role
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  /** 用服务端资料覆盖本地 user，修复「再次登录后头像丢失」等缓存过期问题 */
  const syncUserFromServer = (prev) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    api
      .get('/users/me')
      .then((res) => {
        if (cancelled || !res?.data) return;
        const me = res.data;
        const next = {
          id: me.id,
          username: me.username,
          email: me.email ?? null,
          avatar: me.avatar != null && me.avatar !== '' ? String(me.avatar).trim() : null,
          avatar_style: me.avatar_style != null && me.avatar_style !== '' ? Number(me.avatar_style) : null,
          role: me.role,
        };
        if (userPayloadEqual(prev, next)) return;
        localStorage.setItem('user', JSON.stringify(next));
        setUser(next);
      })
      .catch(() => {
        /* 未登录或 token 失效由 request 内 401 处理 */
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) return undefined;
    return syncUserFromServer(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 挂载时与服务端对齐一次
  }, []);

  const login = (userData, token) => {
    const { nickname: _omitNick, ...rest } = userData || {};
    const normalized = {
      ...rest,
      avatar:
        userData?.avatar != null && String(userData.avatar).trim() !== ''
          ? String(userData.avatar).trim()
          : null,
      avatar_style:
        userData?.avatar_style != null && userData.avatar_style !== ''
          ? Number(userData.avatar_style)
          : null,
    };
    localStorage.setItem('user', JSON.stringify(normalized));
    localStorage.setItem('token', token);
    setUser(normalized);
    // 登录后立即拉一次完整资料，与数据库头像等字段对齐
    syncUserFromServer(normalized);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (patch) => {
    if (!user) return;
    const next = { ...user, ...patch };
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
