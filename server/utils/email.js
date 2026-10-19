// Email delivery with three interchangeable providers, chosen by EMAIL_PROVIDER:
//   console (default, logs only) · smtp (Nodemailer) · resend (Resend HTTP API, no SDK needed)
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;
const smtp = () =>
  (transporter ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));

const FROM = () => process.env.MAIL_FROM || 'Fashionist <no-reply@fashionist.store>';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wrap = (title, body) => `<!doctype html><html><body style="margin:0;background:#FAF7F2">
<div style="max-width:560px;margin:0 auto;font-family:Georgia,serif;padding:32px;color:#141414">
  <p style="letter-spacing:.32em;font-size:18px;margin:0 0 24px"><span style="color:#E11D48">&#9670;</span> FASHIONIST</p>
  <h2 style="font-weight:600;font-size:26px;margin:0 0 16px">${esc(title)}</h2>
  <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${body}</div>
  <p style="font-size:12px;color:#8A8178;margin-top:32px;border-top:1px solid #E4DCD0;padding-top:16px">Fashionist · Wear Your Story · Cash on Delivery across Pakistan</p>
</div></body></html>`;

/** Sends an email. Never throws — a failed email must not fail the request. Returns true on success. */
export async function sendEmail({ to, subject, title, body }) {
  if (env.nodeEnv === 'test') return true;
  const html = wrap(title || subject, body);
  try {
    if (env.emailProvider === 'resend') {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM(), to: [to], subject, html }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    } else if (env.emailProvider === 'smtp') {
      await smtp().sendMail({ from: FROM(), to, subject, html });
    } else {
      console.log(`[email:console] to=${to} subject="${subject}"`);
    }
    return true;
  } catch (err) {
    console.error('Email failed:', err.message);
    return false;
  }
}

const on = (settings, key) => settings?.emailNotifications?.[key] !== false;

export const emails = {
  otp: (user, code) =>
    sendEmail({
      to: user.email,
      subject: `${code} is your Fashionist verification code`,
      title: 'Verify your email',
      body: `<p>Salaam ${esc(user.name)},</p><p>Your verification code is:</p><p style="font-size:32px;letter-spacing:.3em;font-weight:bold;margin:16px 0">${code}</p><p>It expires in ${env.otpTtlMinutes} minutes. If you did not create a Fashionist account, ignore this email.</p>`,
    }),
  welcome: (user) => sendEmail({ to: user.email, subject: 'Welcome to Fashionist', title: `Welcome, ${user.name}`, body: '<p>Your account is ready. Discover the new collection — Cash on Delivery across Pakistan.</p>' }),
  orderPlaced: (order, user, settings) =>
    on(settings, 'orderPlaced') &&
    sendEmail({ to: user.email, subject: `Order ${order.orderNumber} placed`, title: `Thank you, ${user.name}`, body: `<p>Your order <b>${order.orderNumber}</b> has been placed. Total <b>PKR ${order.total.toLocaleString()}</b>, payable on delivery.</p>` }),
  statusChanged: (order, user, settings) =>
    on(settings, 'statusChanged') &&
    user?.email &&
    sendEmail({ to: user.email, subject: `Order ${order.orderNumber} is ${order.status}`, body: `<p>Your order status is now <b>${order.status}</b>.${order.trackingNumber ? ` Courier: ${esc(order.courier)}, tracking: ${esc(order.trackingNumber)}.` : ''}</p>` }),
  resetPassword: (user, url) => sendEmail({ to: user.email, subject: 'Reset your Fashionist password', body: `<p><a href="${esc(url)}">Reset your password</a>. This link expires in 30 minutes.</p>` }),
  lowStock: (to, rows, settings) =>
    on(settings, 'lowStock') && rows.length && sendEmail({ to, subject: `Low stock: ${rows.length} variant(s)`, body: `<ul>${rows.map((r) => `<li>${esc(r.sku)} — ${r.stock} left</li>`).join('')}</ul>` }),
};
