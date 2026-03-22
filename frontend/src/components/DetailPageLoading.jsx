/**
 * 影视详情首屏加载：胶卷 + 旋转图标
 * fixed 全屏（顶栏下）居中，任意视口尺寸下保持居中
 */
import { FilmStrip, CircleNotch, Sparkle } from '@phosphor-icons/react';

export default function DetailPageLoading() {
  return (
    <div
      className="detail-loading-fullscreen"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="detail-loading-card">
        <div className="detail-loading-icons" aria-hidden>
          <FilmStrip size={52} weight="duotone" className="detail-loading-film" />
          <CircleNotch size={40} weight="bold" className="detail-loading-spin" />
          <Sparkle size={22} weight="fill" className="detail-loading-sparkle" />
        </div>
        <p className="detail-loading-title">正在载入影片</p>
        <p className="detail-loading-sub">海报与演职员信息加载中…</p>
      </div>
    </div>
  );
}
