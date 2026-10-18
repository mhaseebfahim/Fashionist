import crypto from 'node:crypto';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { emails } from '../utils/email.js';

const send = (res, user, status = 200) => res.status(status).json({ token: signToken(user), user });

// Register can ONLY create customers — role is never read from the body.
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (await User.exists({ email })) throw new AppError('Email already registered', 409);
  const user = new User({ name, email, phone, role: 'customer' });
  await user.setPassword(password);
  await user.save();
  send(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  if (!user || !(await user.checkPassword(req.body.password))) throw new AppError('Invalid email or password', 401);
  if (user.isBlocked) throw new AppError('Your account has been blocked', 403);
  send(res, user);
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
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    emails.resetPassword(user, `${(process.env.CLIENT_URL || '').split(',')[0]}/reset-password/${token}`);
  }
  // Same answer either way so emails cannot be enumerated.
  res.json({ message: 'If that email exists, a reset link has been sent' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } });
  if (!user) throw new AppError('Reset link is invalid or has expired', 400);
  await user.setPassword(req.body.password);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  send(res, user);
});

/* ---- address book ---- */
const normaliseDefault = (user, preferId) => {
  if (!user.addresses.length) return;
  const target = user.addresses.id(preferId)?.isDefault ? preferId : user.addresses.find((a) => a.isDefault)?._id || user.addresses[0]._id;
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
