/**
 * API 连接状态提示条
 * 当后端不可达时，在页面顶部显示醒目提示，帮助用户理解「没有反应」的原因
 */
import { useEffect, useState } from 'react';
import { checkApiHealth } from '../api/request';

export default function ApiStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'fail'

  useEffect(() => {
    checkApiHealth()
      .then((ok) => setStatus(ok ? 'ok' : 'fail'))
      .catch(() => setStatus('fail'));
  }, []);

  if (status !== 'fail') return null;

  return (
    <div className="api-status-banner" role="alert">
      <strong>无法连接后端服务</strong>
      <p>
        请检查网络或稍后重试。若首次访问或长时间未用，后端约需 30–50 秒唤醒。
        若持续失败，请确认 Vercel 已配置环境变量 <code>VITE_API_BASE</code> 并重新部署。
      </p>
    </div>
  );
}
