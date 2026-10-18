import nodemailer from 'nodemailer';

let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
    : null;
  return transporter;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wrap = (title, body) => `
<div style="font-family:Georgia,serif;background:#FAF7F2;padding:32px;color:#141414">
  <p style="letter-spacing:.32em;font-size:18px;margin:0 0 24px"><span style="color:#E11D48">◆</span> FASHIONIST</p>
  <h2 style="font-weight:600">${esc(title)}</h2>
  <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${body}</div>
  <p style="font-size:12px;color:#8A8178;margin-top:32px">Fashionist · Wear Your Story · Cash on Delivery across Pakistan</p>
</div>`;

export async function sendEmail({ to, subject, title, body }) {
  if (process.env.NODE_ENV === 'test') return;
  const t = getTransporter();
  if (!t) return console.log(`[email:dev] to=${to} subject="${subject}"`);
  try {
    await t.sendMail({ from: process.env.MAIL_FROM, to, subject, html: wrap(title || subject, body) });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

const on = (settings, key) => settings?.emailNotifications?.[key] !== false;

export const emails = {
  orderPlaced: (order, user, settings) =>
    on(settings, 'orderPlaced') &&
    sendEmail({ to: user.email, subject: `Order ${order.orderNumber} placed`, title: `Thank you, ${user.name}`, body: `<p>Your order <b>${order.orderNumber}</b> has been placed. Total <b>PKR ${order.total.toLocaleString()}</b>, payable on delivery.</p>` }),
  statusChanged: (order, user, settings) =>
    on(settings, 'statusChanged') &&
    sendEmail({ to: user.email, subject: `Order ${order.orderNumber} is ${order.status}`, body: `<p>Your order status is now <b>${order.status}</b>.${order.trackingNumber ? ` Courier: ${esc(order.courier)}, tracking: ${esc(order.trackingNumber)}.` : ''}</p>` }),
  resetPassword: (user, url) => sendEmail({ to: user.email, subject: 'Reset your Fashionist password', body: `<p><a href="${esc(url)}">Reset your password</a>. This link expires in 30 minutes.</p>` }),
  lowStock: (to, rows, settings) =>
    on(settings, 'lowStock') && rows.length && sendEmail({ to, subject: `Low stock: ${rows.length} variant(s)`, body: `<ul>${rows.map((r) => `<li>${esc(r.sku)} — ${r.stock} left</li>`).join('')}</ul>` }),
};
