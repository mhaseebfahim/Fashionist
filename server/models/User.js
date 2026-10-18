import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  name: { type: String, required: true },
  phone: { type: String, required: true, match: /^03\d{9}$/ },
  city: { type: String, required: true },
  area: String,
  street: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, match: /^03\d{9}$/ },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    addresses: [addressSchema],
    isBlocked: { type: Boolean, default: false },
    language: { type: String, enum: ['en', 'ur'], default: 'en' },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (pw) {
  this.passwordHash = await bcrypt.hash(pw, 12);
};
userSchema.methods.checkPassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};
userSchema.set('toJSON', {
  transform: (_, r) => {
    delete r.passwordHash;
    delete r.resetTokenHash;
    delete r.resetTokenExpires;
    return r;
  },
});

export default mongoose.model('User', userSchema);
