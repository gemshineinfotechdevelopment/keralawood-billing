import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    supplier: { type: String, required: true },
    supplierPhone: { type: String, default: '' },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    item: { type: String, required: true },
    category: { type: String, default: 'Timber Logs' },
    quantity: { type: String, default: '' },
    amount: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: 'Bank Wire' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
