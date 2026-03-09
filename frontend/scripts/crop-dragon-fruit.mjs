/**
 * 裁剪火龙果图片 - 只保留左半部分（单个火龙果）
 * 运行: node scripts/crop-dragon-fruit.mjs
 */
import { Jimp } from 'jimp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, '../public/dragon-fruit.png');

async function crop() {
  const img = await Jimp.read(inputPath);
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const leftWidth = Math.floor(w / 2);

  img.crop({ x: 0, y: 0, w: leftWidth, h }).write(inputPath);
  console.log('裁剪完成：已保留左侧单个火龙果');
}

crop().catch((e) => {
  console.error('裁剪失败:', e);
  process.exit(1);
});
