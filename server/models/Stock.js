import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema(
  {
    productId: { type: String, default: '' },
    productSku: { type: String, default: '' },
    productName: { type: String, required: true },
    type: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    reason: { type: String, default: 'Bill Order Sale' },
    invoice: { type: String, default: '' },
    customer: { type: String, default: '' },
    notes: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Stock =
  mongoose.models.Stock || mongoose.model('Stock', stockSchema);
