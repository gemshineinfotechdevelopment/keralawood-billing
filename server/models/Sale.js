import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    invoice: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    location: { type: String, default: '' },
    items: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'Dispatched' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
