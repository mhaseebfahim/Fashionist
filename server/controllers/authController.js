import crypto from 'node:crypto';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { emails } from '../utils/email.js';
import { env, isAllowedEmail } from '../config/env.js';

const send = (res, user, status = 200) => res.status(status).json({ token: signToken(user), user });
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const domainMsg = () => `Please use an email ending in ${env.allowedEmailDomains.map((d) => `@${d}`).join(' or ')}`;

/** Public auth configuration so the client can show/hide OTP and Google UI. */
export const config = (_req, res) => res.json({ emailVerification: env.emailVerification, googleEnabled: !!env.googleClientId, googleClientId: env.googleClientId || null, allowedEmailDomains: env.allowedEmailDomains });

/** Creates a fresh 6-digit OTP, stores only its hash, and emails it. */
async function issueOtp(user) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  user.otpHash = sha(`${user._id}:${code}`);
  user.otpExpires = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000);
  user.otpAttempts = 0;
  user.otpSentAt = new Date();
  await user.save();
  await emails.otp(user, code);
  return code;
}

// Register can ONLY create customers — role is never read from the body.
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!isAllowedEmail(email)) throw new AppError(domainMsg(), 422, [{ field: 'email', message: domainMsg() }]);
  const existing = await User.findOne({ email }).select('+otpSentAt');
  if (existing && (existing.isEmailVerified || !env.emailVerification)) throw new AppError('Email already registered', 409);

  // An unverified account may re-register (e.g. typo in name) — it is overwritten, not duplicated.
  const user = existing || new User({ email, role: 'customer' });
  Object.assign(user, { name, phone, role: 'customer', isEmailVerified: !env.emailVerification });
  await user.setPassword(password);
  await user.save();

  if (env.emailVerification) {
    await issueOtp(user);
    return res.status(201).json({ verificationRequired: true, email: user.email, message: `We sent a 6-digit code to ${user.email}` });
  }
  emails.welcome(user);
  send(res, user, 201);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+otpHash +otpExpires +otpAttempts');
  if (!user || user.isEmailVerified) throw new AppError('Nothing to verify for this email', 400);
  if (!user.otpHash || user.otpExpires < new Date()) throw new AppError('Code expired — request a new one', 400, undefined, 'OTP_EXPIRED');
  if (user.otpAttempts >= env.otpMaxAttempts) throw new AppError('Too many wrong codes — request a new one', 429, undefined, 'OTP_LOCKED');
  if (sha(`${user._id}:${req.body.otp}`) !== user.otpHash) {
    user.otpAttempts += 1;
    await user.save();
    throw new AppError(`Incorrect code (${env.otpMaxAttempts - user.otpAttempts} attempts left)`, 400, undefined, 'OTP_INVALID');
  }
  user.isEmailVerified = true;
  user.otpHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  await user.save();
  emails.welcome(user);
  send(res, user);
});

export const resendOtp = asyncHandler(async (req, res) => {
  const generic = { message: 'If the account needs verification, a new code has been sent' };
  if (!env.emailVerification) return res.json(generic);
  const user = await User.findOne({ email: req.body.email }).select('+otpSentAt');
  if (!user || user.isEmailVerified) return res.json(generic);
  const wait = env.otpResendSeconds - Math.floor((Date.now() - new Date(user.otpSentAt || 0).getTime()) / 1000);
  if (wait > 0) throw new AppError(`Please wait ${wait}s before requesting another code`, 429, undefined, 'OTP_COOLDOWN');
  await issueOtp(user);
  res.json(generic);
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash +otpSentAt');
  if (!user || !(await user.checkPassword(req.body.password))) throw new AppError('Invalid email or password', 401);
  if (user.isBlocked) throw new AppError('Your account has been blocked', 403);
  if (env.emailVerification && !user.isEmailVerified && user.role !== 'admin') {
    if (Date.now() - new Date(user.otpSentAt || 0).getTime() > env.otpResendSeconds * 1000) await issueOtp(user);
    throw new AppError('Please verify your email — we sent you a code', 403, undefined, 'EMAIL_NOT_VERIFIED');
  }
  user.lastLoginAt = new Date();
  await user.save();
  send(res, user);
});

/** Google Sign-In: verifies the ID token with Google, then finds or creates the customer. */
export const google = asyncHandler(async (req, res) => {
  if (!env.googleClientId) throw new AppError('Google sign-in is not enabled', 400);
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(req.body.credential)}`);
  const info = r.ok ? await r.json() : null;
  if (!info || info.aud !== env.googleClientId || !['accounts.google.com', 'https://accounts.google.com'].includes(info.iss) || info.email_verified !== 'true' && info.email_verified !== true)
    throw new AppError('Google sign-in failed — please try again', 401);
  const email = String(info.email).toLowerCase();
  if (!isAllowedEmail(email)) throw new AppError(domainMsg(), 422);
  let user = await User.findOne({ $or: [{ googleId: info.sub }, { email }] });
  if (user?.isBlocked) throw new AppError('Your account has been blocked', 403);
  if (!user) user = new User({ name: info.name || email.split('@')[0], email, role: 'customer' });
  Object.assign(user, { googleId: info.sub, isEmailVerified: true, avatar: info.picture, lastLoginAt: new Date() });
  await user.save();
  send(res, user, user.isNew ? 201 : 200);
});

export const me = (req, res) => res.json({ user: req.user });

export const updateMe = asyncHandler(async (req, res) => {
  for (const k of ['name', 'phone', 'language']) if (req.body[k] !== undefined) req.user[k] = req.body[k];
  await req.user.save();
  res.json({ user: req.user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = sha(token);
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    emails.resetPassword(user, `${env.clientUrls[0]}/reset-password/${token}`);
  }
  // Same answer either way so emails cannot be enumerated.
  res.json({ message: 'If that email exists, a reset link has been sent' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ resetTokenHash: sha(req.params.token), resetTokenExpires: { $gt: new Date() } });
  if (!user) throw new AppError('Reset link is invalid or has expired', 400);
  await user.setPassword(req.body.password);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.isEmailVerified = true; // they proved ownership of the inbox
  await user.save();
  send(res, user);
});

/* ---- address book ---- */
const normaliseDefault = (user, preferId) => {
  if (!user.addresses.length) return;
  const target = preferId && user.addresses.id(preferId) ? preferId : user.addresses.find((a) => a.isDefault)?._id || user.addresses[0]._id;
  user.addresses.forEach((a) => (a.isDefault = String(a._id) === String(target)));
};
const pick = ({ label, name, phone, city, area, street, isDefault }) => ({ label, name, phone, city, area, street, isDefault: !!isDefault });

export const listAddresses = (req, res) => res.json({ addresses: req.user.addresses });

export const addAddress = asyncHandler(async (req, res) => {
  if (req.user.addresses.length >= 10) throw new AppError('You can save up to 10 addresses', 400);
  req.user.addresses.push(pick(req.body));
  normaliseDefault(req.user, req.body.isDefault ? req.user.addresses.at(-1)._id : null);
  await req.user.save();
  res.status(201).json({ addresses: req.user.addresses });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const a = req.user.addresses.id(req.params.id);
  if (!a) throw new AppError('Address not found', 404);
  a.set(pick({ ...a.toObject(), ...req.body }));
  normaliseDefault(req.user, req.body.isDefault ? a._id : null);
  await req.user.save();
  res.json({ addresses: req.user.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const a = req.user.addresses.id(req.params.id);
  if (!a) throw new AppError('Address not found', 404);
  a.deleteOne();
  normaliseDefault(req.user);
  await req.user.save();
  res.json({ addresses: req.user.addresses });
});
