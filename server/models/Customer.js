import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    personName: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    location: { type: String, default: '' },
    gstin: { type: String, default: 'Unregistered / Personal' },
    type: { type: String, default: 'Residential' },
    tier: { type: String, default: 'Standard' },
    totalOrders: { type: Number, default: 0 },
    lifetimeValue: { type: String, default: '0' },
    outstandingBalance: { type: String, default: '0' },
    creditUsed: { type: String, default: '0' },
    creditTotal: { type: String, default: '2,00,000' },
    creditProgress: { type: Number, default: 0 },
    recentTx: { type: Array, default: [] },
  },
  { timestamps: true }
);

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
