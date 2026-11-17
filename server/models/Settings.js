import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    depotName: { type: String, default: 'Kerala Wood Furniture - Sivakasi Depot' },
    contactPhone: { type: String, default: '+91 484 289 1204' },
    contactEmail: { type: String, default: 'depot@keralawood.in' },
    address: { type: String, default: 'Sivakasi Central Depot & Mill Yard, Sivakasi' },
    dealerLicense: { type: String, default: 'SFD/SVK/TMR/2023-884' },
    operatingHours: { type: String, default: 'Mon - Sat: 08:30 AM - 06:30 PM (Sun: Closed)' },
    gstin: { type: String, default: '32AABCP9821K1ZK' },
    hsnCode: { type: String, default: '9403' },
    taxRate: { type: String, default: '18% (Standard GST)' },
    cgstRate: { type: Number, default: 9 },
    sgstRate: { type: Number, default: 9 },
    bankName: { type: String, default: 'State Bank of India - Sivakasi Branch' },
    accountNumber: { type: String, default: '4092817290192' },
    ifscCode: { type: String, default: 'SBIN0008839' },
    upiId: { type: String, default: 'keralawood.depot@sbi' },
    minStockThreshold: { type: String, default: '5' },
    moistureTarget: { type: String, default: '10% - 12%' },
    emailAlerts: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    printFormat: { type: String, default: 'A4 Ledger' },
    paymentTerms: { type: String, default: 'Immediate / POS' },
    signatoryName: { type: String, default: 'Rajesh Sivan' },
    signatoryDesignation: { type: String, default: 'Depot Lead & Store Manager' },
    disclaimer: {
      type: String,
      default:
        'Natural variations in teak & rosewood grain are organic characteristics. Claims accepted within 7 days of yard delivery.',
    },
    systemTime: { type: String, default: '10:30 AM' },
    systemDate: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
