import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, default: '' },
    woodSpecies: { type: String, default: '' },
    description: { type: String, default: '' },
    collectionSeries: { type: String, default: '' },
    originZone: { type: String, default: '' },
    searchTags: { type: String, default: '' },
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      weight: { type: Number, default: 0 },
    },
    woodGrade: { type: String, default: '' },
    surfacePolish: { type: String, default: '' },
    joineryTechnique: { type: String, default: '' },
    warranty: { type: String, default: '' },
    stockQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    depotLocation: { type: String, default: '' },
    warehouseBay: { type: String, default: '' },
    leadTime: { type: String, default: '' },
    packagingType: { type: String, default: '' },
    shippingClass: { type: String, default: '' },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    gstSlab: { type: String, default: '' },
    tradeDiscount: { type: String, default: '' },
    transitPass: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
