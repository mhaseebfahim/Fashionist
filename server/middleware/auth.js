import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/AppError.js';

// Only the user id goes in the token; the role is always read fresh from the database.
export const signToken = (user) => jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Please log in', 401);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new AppError('Session expired, please log in again', 401);
  }
  const user = await User.findById(payload.id);
  if (!user) throw new AppError('User no longer exists', 401);
  if (user.isBlocked) throw new AppError('Your account has been blocked', 403);
  req.user = user;
  next();
});

export const adminOnly = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(new AppError('Admin access only', 403));
  next();
};
