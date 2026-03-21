import { useState, useEffect } from 'react';

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  let s;
  const l = (max + min) / 2;
  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** TMDB 浅色条参考：默认灰青 */
const DEFAULT_ACCENT = { r: 174, g: 200, b: 202 };

/**
 * 从海报图 URL 采样主色，生成浅色、偏灰的背景色调（每部电影不同）
 * 封面走同源 /api 代理时可被 canvas 读取；跨域外链可能失败并回退默认色
 */
export function usePosterAccent(imageUrl) {
  const [accent, setAccent] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    if (!imageUrl) {
      setAccent(DEFAULT_ACCENT);
      return;
    }
    setAccent(DEFAULT_ACCENT);
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const w = 72;
        const h = 72;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setAccent(DEFAULT_ACCENT);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const R = data[i];
          const G = data[i + 1];
          const B = data[i + 2];
          const A = data[i + 3];
          if (A < 100) continue;
          const lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
          if (lum < 0.05 || lum > 0.96) continue;
          r += R;
          g += G;
          b += B;
          n += 1;
        }
        if (n < 24) {
          r = g = b = n = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 80) continue;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n += 1;
          }
        }
        if (n === 0) {
          setAccent(DEFAULT_ACCENT);
          return;
        }
        r /= n;
        g /= n;
        b /= n;
        const [hue, sat, lig] = rgbToHsl(r, g, b);
        // 浅色、略降饱和：接近参考图 1 的粉彩条
        const l2 = Math.min(0.84, Math.max(0.66, 0.52 + lig * 0.38));
        const s2 = Math.min(0.44, Math.max(0.09, sat * 0.52));
        const [R2, G2, B2] = hslToRgb(hue, s2, l2);
        if (!cancelled) setAccent({ r: R2, g: G2, b: B2 });
      } catch {
        if (!cancelled) setAccent(DEFAULT_ACCENT);
      }
    };
    img.onerror = () => {
      if (!cancelled) setAccent(DEFAULT_ACCENT);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return accent;
}
