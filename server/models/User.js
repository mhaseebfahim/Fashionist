import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home', maxlength: 30 },
  name: { type: String, required: true, maxlength: 80 },
  phone: { type: String, required: true, match: /^03\d{9}$/ },
  city: { type: String, required: true, maxlength: 60 },
  area: { type: String, maxlength: 120 },
  street: { type: String, required: true, maxlength: 200 },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, match: /^03\d{9}$/ },
    // Google-only accounts have no password.
    passwordHash: { type: String, select: false, required: [function () { return !this.googleId; }, 'Password is required'] },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    addresses: [addressSchema],
    isBlocked: { type: Boolean, default: false },
    language: { type: String, enum: ['en', 'ur'], default: 'en' },
    // Email verification (OTP). Accounts created while verification is switched off are marked verified.
    isEmailVerified: { type: Boolean, default: false },
    otpHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpSentAt: { type: Date, select: false },
    googleId: { type: String, index: { unique: true, sparse: true } },
    avatar: String,
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (pw) {
  this.passwordHash = await bcrypt.hash(pw, 12);
};
userSchema.methods.checkPassword = function (pw) {
  return this.passwordHash ? bcrypt.compare(pw, this.passwordHash) : Promise.resolve(false);
};
userSchema.set('toJSON', {
  transform: (_, r) => {
    for (const k of ['passwordHash', 'resetTokenHash', 'resetTokenExpires', 'otpHash', 'otpExpires', 'otpAttempts', 'otpSentAt', 'googleId', '__v']) delete r[k];
    return r;
  },
});

export default mongoose.model('User', userSchema);
