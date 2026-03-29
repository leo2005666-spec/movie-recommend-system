/** 演员卡无照片时：首字与渐变底（与 UserAvatar 色系协调） */
const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(145deg, #f59e0b 0%, #fbbf24 100%)',
  'linear-gradient(145deg, #6366f1 0%, #8b5cf6 100%)',
  'linear-gradient(145deg, #0ea5e9 0%, #06b6d4 100%)',
  'linear-gradient(145deg, #10b981 0%, #059669 100%)',
  'linear-gradient(145deg, #ec4899 0%, #a855f7 100%)',
  'linear-gradient(145deg, #f97316 0%, #eab308 100%)',
  'linear-gradient(145deg, #14b8a6 0%, #3b82f6 100%)',
  'linear-gradient(145deg, #64748b 0%, #334155 100%)',
  'linear-gradient(145deg, #d946ef 0%, #7c3aed 100%)',
  'linear-gradient(145deg, #22c55e 0%, #84cc16 100%)',
  'linear-gradient(145deg, #3b82f6 0%, #6366f1 100%)',
  'linear-gradient(145deg, #78716c 0%, #1c1917 100%)',
];

export function castNameInitial(name) {
  const s = (name || '').trim();
  if (!s) return '?';
  const ch = [...s][0];
  return ch && /\S/.test(ch) ? ch : '?';
}

export function castPlaceholderGradient(seed) {
  const n = Number(seed);
  const i = Number.isFinite(n) && n > 0 ? Math.abs(n) % PLACEHOLDER_GRADIENTS.length : 0;
  return PLACEHOLDER_GRADIENTS[i];
}
