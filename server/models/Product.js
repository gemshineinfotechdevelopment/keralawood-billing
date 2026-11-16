import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true, default: 'Dining' },
    woodSpecies: { type: String, default: 'Teak' },
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
    woodGrade: { type: String, default: 'Grade A - Nilambur Heartwood' },
    surfacePolish: { type: String, default: 'Natural Protective Organic-Beeswax' },
    joineryTechnique: { type: String, default: 'Mortise & Tenon with Rosewood Dowels' },
    warranty: { type: String, default: '5-Yr Termite & Wood' },
    stockQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 2 },
    depotLocation: { type: String, default: 'Kochi Central Depot' },
    warehouseBay: { type: String, default: 'Bay C-04 / Shed 2' },
    leadTime: { type: String, default: 'In Stock (Ready to Ship)' },
    packagingType: { type: String, default: 'Corrugated Multi-layer Wood Wrap' },
    shippingClass: { type: String, default: 'Class 3 - Heavy Solid Furniture (Direct Depot Truck)' },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    gstSlab: { type: String, default: '18% GST (HSN 9403 - Wooden Furniture)' },
    tradeDiscount: { type: String, default: 'Architect / Builder Tier 1 (12% Off)' },
    transitPass: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
