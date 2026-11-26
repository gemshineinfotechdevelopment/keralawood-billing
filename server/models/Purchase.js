import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    supplier: { type: String, required: true },
    supplierAddress: { type: String, default: '' },
    supplierGstin: { type: String, default: '' },
    supplierPhone: { type: String, default: '' },
    companyName: { type: String, default: 'Kerala Wood Furniture' },
    companyAddress: { type: String, default: '' },
    companyGstin: { type: String, default: '' },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    vehicleNumber: { type: String, default: '' },
    item: { type: String, default: '' },
    category: { type: String, default: 'Timber Logs' },
    quantity: { type: String, default: '' },
    itemsList: { type: Array, default: [] },
    subtotal: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    taxType: { type: String, default: 'intra' },
    igstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMode: { type: String, default: 'Bank Wire' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
