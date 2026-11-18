import mongoose from 'mongoose';

const dashboardSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main_dashboard', unique: true },
    title: { type: String, default: 'Kerala Wood Furniture - Central Depot Dashboard' },
    todaySales: { type: Number, default: 0 },
    todaySalesFormatted: { type: String, default: '₹0' },
    ordersToday: { type: Number, default: 0 },
    ordersTodayText: { type: String, default: '0 orders processed today' },
    totalStock: { type: Number, default: 0 },
    stockLocationNote: { type: String, default: 'Across Sivakasi master timber yards' },
    lowStockCount: { type: Number, default: 0 },
    lowStockAlerts: [
      {
        name: { type: String, default: '' },
        category: { type: String, default: '' },
        woodSpecies: { type: String, default: '' },
        stockQuantity: { type: Number, default: 0 },
        lowStockThreshold: { type: Number, default: 3 },
        count: { type: String, default: '' },
      },
    ],
    recentSales: [
      {
        invoice: { type: String, default: '' },
        customer: { type: String, default: '' },
        location: { type: String, default: '' },
        items: { type: String, default: '' },
        amount: { type: Number, default: 0 },
        amountFormatted: { type: String, default: '₹0' },
        status: { type: String, default: 'Dispatched' },
        paymentStatus: { type: String, default: 'Paid' },
        date: { type: Date, default: Date.now },
      },
    ],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Dashboard =
  mongoose.models.Dashboard || mongoose.model('Dashboard', dashboardSchema);
