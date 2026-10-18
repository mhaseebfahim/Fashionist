// Central, typed view of environment configuration. Import this instead of reading process.env ad hoc.
const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));
const list = (v, d) => String(v || d).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },
  get clientUrls() {
    return list(process.env.CLIENT_URL, 'http://localhost:5173');
  },
  /** OTP email verification on sign-up. Keep false until an email provider (Resend/SMTP) is configured. */
  get emailVerification() {
    return bool(process.env.EMAIL_VERIFICATION_ENABLED, false);
  },
  /** Only these email domains may register (strict match on the part after @). */
  get allowedEmailDomains() {
    return list(process.env.ALLOWED_EMAIL_DOMAINS, 'gmail.com,outlook.com');
  },
  /** console | smtp | resend */
  get emailProvider() {
    const p = (process.env.EMAIL_PROVIDER || '').toLowerCase();
    if (p) return p;
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.SMTP_HOST) return 'smtp';
    return 'console';
  },
  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID || '';
  },
  otpTtlMinutes: 10,
  otpMaxAttempts: 5,
  otpResendSeconds: 60,
};

/** Strict email rule: one allowed domain, sane local part (letters, digits, . _ + -), no leading/trailing/double dots. */
export function isAllowedEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  const m = e.match(/^([a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?)@([a-z0-9.-]+)$/);
  if (!m || m[1].includes('..')) return false;
  return env.allowedEmailDomains.includes(m[2]);
}
