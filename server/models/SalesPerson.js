import mongoose from 'mongoose';

const salesPersonSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    role: { type: String, default: 'Sales Executive' },
    territory: { type: String, default: 'Sivakasi & Virudhunagar' },
    target: { type: Number, default: 500000 },
    achievedSales: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 3.0 },
    paymentMode: { type: String, default: 'Bank Wire' },
    ordersClosed: { type: Number, default: 0 },
    joiningDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    notes: { type: String, default: '' },
    branch: { type: String, enum: ['sivakasi', 'karur'], default: 'sivakasi', index: true },
  },
  { timestamps: true }
);

export const SalesPerson = mongoose.models.SalesPerson || mongoose.model('SalesPerson', salesPersonSchema);
