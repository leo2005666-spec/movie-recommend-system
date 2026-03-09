/**
 * 验证码服务：内存存储，5 分钟过期
 * 配置 SMTP 环境变量可发送真实邮件，否则输出到控制台
 */
const nodemailer = require('nodemailer');
const CODE_EXPIRE_MS = 5 * 60 * 1000; // 5 分钟
const store = new Map(); // email -> { code, expiresAt }

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setCode(email, code) {
  store.set(email.toLowerCase().trim(), {
    code,
    expiresAt: Date.now() + CODE_EXPIRE_MS,
  });
}

function verifyCode(email, input) {
  const key = email.toLowerCase().trim();
  const item = store.get(key);
  if (!item) return false;
  if (Date.now() > item.expiresAt) {
    store.delete(key);
    return false;
  }
  const ok = item.code === String(input).trim();
  if (ok) store.delete(key);
  return ok;
}

async function sendCodeToEmail(email, code) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: email,
        subject: '火龙果影院 - 验证码',
        text: `您的验证码是：${code}，5分钟内有效。如非本人操作请忽略。`,
      });
      return;
    } catch (e) {
      console.error('[验证码] 邮件发送失败:', e.message);
    }
  }
  // 开发模式：输出到控制台
  console.log(`[验证码] ${email} => ${code} （5分钟内有效，请查看后端控制台）`);
}

async function sendResetCodeToEmail(email, code) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: email,
        subject: '火龙果影院 - 重置密码验证码',
        text: `您的重置密码验证码是：${code}，5分钟内有效。如非本人操作请忽略。`,
      });
      return;
    } catch (e) {
      console.error('[验证码] 重置邮件发送失败:', e.message);
    }
  }
  console.log(`[重置验证码] ${email} => ${code} （5分钟内有效）`);
}

module.exports = {
  generateCode,
  setCode,
  verifyCode,
  sendCodeToEmail,
  sendResetCodeToEmail,
};
