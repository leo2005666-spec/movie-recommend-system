/**
 * 低干扰动态背景
 * 纯 CSS：渐变慢速流动 + 细噪点 + 遮罩
 * prefers-reduced-motion 自动静态
 */
export default function BackgroundFX() {
  return (
    <div className="background-fx" aria-hidden="true">
      <div className="background-fx__gradient" />
      <div className="background-fx__noise" />
      <div className="background-fx__mask" />
    </div>
  );
}
