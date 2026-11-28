import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // Plain text (no bcrypt needed for this internal ERP)
    role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
    branch: {
      type: String,
      enum: ['sivakasi', 'karur', 'all'], // 'all' = super_admin sees both
      default: 'sivakasi',
    },
    branchLabel: { type: String, default: 'Sivakasi' },
    name: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
