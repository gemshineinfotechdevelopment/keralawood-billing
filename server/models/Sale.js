import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    invoice: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerGstin: { type: String, default: '' },
    location: { type: String, default: '' },
    project: { type: String, default: '' },
    wood: { type: String, default: 'Teak Wood' },
    items: { type: String, required: true },
    itemDetails: { type: Array, default: [] },
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    paymentStatus: { type: String, default: 'Paid' }, // Default 'Paid'
    paymentMode: { type: String, default: 'UPI' },
    billedBy: { type: String, default: '' },
    salesPerson: { type: String, default: '' },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: { type: String, default: 'Paid' },
    date: { type: Date, default: Date.now },
    invoiceDate: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    notes: { type: String, default: '' },
    year: { type: String, default: '2026' },
    monthYear: { type: String, default: 'November 2026' },
    volume: { type: Number, default: 36 },
  },
  { timestamps: true }
);

export const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
