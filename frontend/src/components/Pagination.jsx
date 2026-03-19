/**
 * 分页组件 · 支持上一页/下一页 + 输入跳转
 */
import { useState } from 'react';

export default function Pagination({ page, totalPages, onPageChange }) {
  const [jumpInput, setJumpInput] = useState('');

  const handleJump = () => {
    const p = parseInt(jumpInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpInput('');
    }
  };

  return (
    <div className="pagination">
      <button className="btn btn-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        上一页
      </button>
      <span className="pagination__info">{page} / {totalPages}</span>
      <div className="pagination__jump">
        <input
          type="number"
          className="pagination__input"
          placeholder="页码"
          min={1}
          max={totalPages}
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
        />
        <button type="button" className="btn btn-outline pagination__btn-jump" onClick={handleJump}>
          跳转
        </button>
      </div>
      <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        下一页
      </button>
    </div>
  );
}
