// Centralized Dynamic Data Store with LocalStorage Persistence & MongoDB Backend Sync
// Supports multiple concurrent bills, dynamic products, customers, settings, and reports

const STORAGE_KEYS = {
  PRODUCTS: 'sivakasi_wood_products',
  CUSTOMERS: 'sivakasi_wood_customers',
  BILLS: 'sivakasi_wood_bills',
  ACTIVE_BILL_ID: 'sivakasi_wood_active_bill_id',
  TRANSACTIONS: 'sivakasi_wood_transactions',
  SETTINGS: 'sivakasi_wood_settings',
}

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''

// System Settings (Company: Kerala Wood Furniture, Location: Sivakasi)
const INITIAL_SETTINGS = {
  depotName: 'Kerala Wood Furniture - Sivakasi Depot',
  contactPhone: '+91 484 289 1204',
  contactEmail: 'depot@keralawood.in',
  address: 'Sivakasi Central Depot & Mill Yard, Sivakasi',
  dealerLicense: 'SFD/SVK/TMR/2023-884',
  operatingHours: 'Mon - Sat: 08:30 AM - 06:30 PM (Sun: Closed)',
  gstin: '32AABCP9821K1ZK',
  hsnCode: '9403',
  taxRate: '18% (Standard GST)',
  cgstRate: 9,
  sgstRate: 9,
  bankName: 'State Bank of India - Sivakasi Branch',
  accountNumber: '4092817290192',
  ifscCode: 'SBIN0008839',
  upiId: 'keralawood.depot@sbi',
  minStockThreshold: '5',
  moistureTarget: '10% - 12%',
  emailAlerts: true,
  smsNotifications: true,
  printFormat: 'A4 Ledger', // 'A4 Ledger' | 'Thermal Slip'
  paymentTerms: 'Immediate / POS',
  signatoryName: 'Rajesh Sivan',
  signatoryDesignation: 'Depot Lead & Store Manager',
  disclaimer: 'Natural variations in teak & rosewood grain are organic characteristics. Claims accepted within 7 days of yard delivery.',
  systemTime: '10:30 AM',
  systemDate: '',
}

// Products Catalog (24 items to support minimum 20 items per ledger page)
const INITIAL_PRODUCTS = [
  { id: 'prod-1', sku: 'KWF-TB-NT-06', name: 'Nilambur Teak 6-Seater Dining Set', finish: 'Grade-A Matte Walnut Finish', category: 'Dining Sets', unitPrice: 54000, stockQuantity: 4, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-2', sku: 'KWF-DC-TK-02', name: 'Teakwood Dining Chairs with Cane Weave', finish: 'Handcrafted Rattan Back', category: 'Chairs', unitPrice: 6500, stockQuantity: 18, lowStockThreshold: 4, woodSpecies: 'Teak' },
  { id: 'prod-3', sku: 'KWF-CR-TK-01', name: 'Solid Teak Side Server Credenza', finish: 'Brass Pull Inlays', category: 'Storage', unitPrice: 24000, stockQuantity: 3, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-4', sku: 'KWF-BD-RW-K01', name: 'Solid Rosewood Royal King Bed', finish: 'Hand-Carved Headboard & Natural Beeswax', category: 'Beds', unitPrice: 78000, stockQuantity: 2, lowStockThreshold: 1, woodSpecies: 'Rosewood' },
  { id: 'prod-5', sku: 'KWF-SF-LV-08', name: 'Teak Frame 3-Seater Artisan Sofa', finish: 'Raw Organic Cotton & Walnut Polish', category: 'Living', unitPrice: 42000, stockQuantity: 5, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-6', sku: 'KWF-SH-CN-03', name: 'Handcrafted Cane Bookcase', finish: 'Bamboo & Mahogany 5-Tier', category: 'Storage', unitPrice: 18500, stockQuantity: 4, lowStockThreshold: 2, woodSpecies: 'Mahogany' },
  { id: 'prod-7', sku: 'KWF-CT-AN-14', name: 'Anjili Heritage Brass Chest', finish: 'Antique Brass Studded', category: 'Storage', unitPrice: 22500, stockQuantity: 7, lowStockThreshold: 2, woodSpecies: 'Anjili' },
  { id: 'prod-8', sku: 'KWF-DK-JK-02', name: 'Jackfruit Live-Edge Boardroom Desk', finish: 'Natural Plavu Oil Polish', category: 'Tables', unitPrice: 95000, stockQuantity: 4, lowStockThreshold: 1, woodSpecies: 'Jackfruit' },
  { id: 'prod-9', sku: 'KWF-WD-RW-03', name: 'Rosewood 3-Door Master Wardrobe', finish: 'Hand-Polished Rosewood Finish', category: 'Storage', unitPrice: 68000, stockQuantity: 3, lowStockThreshold: 1, woodSpecies: 'Rosewood' },
  { id: 'prod-10', sku: 'KWF-CT-TK-08', name: 'Solid Teak Coffee Table Glass Top', finish: 'Tempered Glass with Teak Base', category: 'Tables', unitPrice: 16500, stockQuantity: 6, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-11', sku: 'KWF-BD-TK-Q02', name: 'Teakwood Queen Hydraulic Storage Bed', finish: 'Warm Honey Teak Polish', category: 'Beds', unitPrice: 62000, stockQuantity: 4, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-12', sku: 'KWF-RC-TK-01', name: 'Traditional Hand-Carved Rocking Chair', finish: 'Ergonomic Curved Slats', category: 'Chairs', unitPrice: 12800, stockQuantity: 9, lowStockThreshold: 3, woodSpecies: 'Teak' },
  { id: 'prod-13', sku: 'KWF-PJ-TK-05', name: 'Kerala Traditional Mandapam Pooja Unit', finish: 'Carved Gopuram & Brass Bells', category: 'Living', unitPrice: 34000, stockQuantity: 3, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-14', sku: 'KWF-DT-RW-02', name: 'Solid Rosewood Dressing Table with Mirror', finish: 'Beveled Belgian Mirror & Velvet Drawers', category: 'Beds', unitPrice: 29500, stockQuantity: 4, lowStockThreshold: 1, woodSpecies: 'Rosewood' },
  { id: 'prod-15', sku: 'KWF-SH-MH-06', name: 'Mahogany 6-Shelf Library Display Rack', finish: 'Gloss Mahogany Polish', category: 'Storage', unitPrice: 21000, stockQuantity: 5, lowStockThreshold: 2, woodSpecies: 'Mahogany' },
  { id: 'prod-16', sku: 'KWF-TV-TK-04', name: 'Teakwood TV Media Entertainment Console', finish: 'Cable Ports & Louvered Slats', category: 'Living', unitPrice: 26500, stockQuantity: 7, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-17', sku: 'KWF-SW-TK-01', name: 'Handcrafted Wooden Oonjal Swing with Brass Chains', finish: 'Heavy Cast Brass Carved Chains', category: 'Living', unitPrice: 48000, stockQuantity: 2, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-18', sku: 'KWF-TB-TK-04', name: 'Teakwood 4-Seater Compact Dining Set', finish: 'Space-Saving Tuck-in Chairs', category: 'Dining Sets', unitPrice: 36000, stockQuantity: 8, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-19', sku: 'KWF-SR-WD-03', name: 'Solid Wood 3-Tier Louvered Shoe Rack', finish: 'Ventilated Louver Doors', category: 'Storage', unitPrice: 9500, stockQuantity: 12, lowStockThreshold: 3, woodSpecies: 'Hardwood' },
  { id: 'prod-20', sku: 'KWF-SC-TK-07', name: 'High-Back Ergonomic Teak Study Chair', finish: 'Cushioned Leatherette Seat', category: 'Chairs', unitPrice: 8500, stockQuantity: 10, lowStockThreshold: 3, woodSpecies: 'Teak' },
  { id: 'prod-21', sku: 'KWF-NS-RW-02', name: 'Rosewood Dual-Drawer Bedside Nightstand', finish: 'Brass Knob Hardware', category: 'Beds', unitPrice: 7200, stockQuantity: 11, lowStockThreshold: 3, woodSpecies: 'Rosewood' },
  { id: 'prod-22', sku: 'KWF-CN-TK-03', name: 'Live-Edge Teak Entryway Console Table', finish: 'Natural Edge Black Hairpin Legs', category: 'Tables', unitPrice: 19800, stockQuantity: 4, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-23', sku: 'KWF-CT-RW-05', name: 'Vintage 5-Drawer Wooden Chest', finish: 'Antiqued Hand-Waxed Rosewood', category: 'Storage', unitPrice: 31000, stockQuantity: 3, lowStockThreshold: 1, woodSpecies: 'Rosewood' },
  { id: 'prod-24', sku: 'KWF-BN-TK-02', name: 'Teakwood Solid Dining Bench', finish: 'Chamfered Edge Minimalist Legs', category: 'Dining Sets', unitPrice: 11500, stockQuantity: 6, lowStockThreshold: 2, woodSpecies: 'Teak' },
]

const INITIAL_CUSTOMERS = [
  {
    id: 1,
    initials: 'MP',
    avatarBg: '#5C3A21',
    name: 'Mathew Philip',
    personName: 'Mathew Philip',
    type: 'Residential',
    fullTypeLabel: 'Mathew Philip • Residential Client',
    phone: '+91 98470 12345',
    location: 'Sivakasi Town Center',
    address: 'Bazaar Street, Sivakasi',
    deliveryAddress: 'Bazaar Street, Sivakasi',
    gstin: '32AABCP9821K1ZK',
    totalOrders: 3,
    lifetimeValue: '1,38,060',
    outstandingBalance: '0',
    creditUsed: '1,38,060',
    creditTotal: '3,00,000',
    creditProgress: 46,
    recentTx: [
      { id: '#KWF-2026-0982', dateItem: 'Today • 6-Seater Table & Chairs', amount: '1,38,060' },
      { id: '#KWF-2026-0850', dateItem: '15 Oct • Teak Coffee Table', amount: '24,000' },
    ],
  },
  {
    id: 2,
    initials: 'DK',
    avatarBg: '#4A2E18',
    name: 'Deepak Kurian & Architects',
    personName: 'Deepak Kurian',
    type: 'B2B Studio',
    fullTypeLabel: 'Deepak Kurian & Architects • B2B',
    phone: '+91 97455 11029',
    location: 'Sivakasi Architecture Guild',
    address: 'Bazaar Rd, Sivakasi',
    deliveryAddress: 'Bazaar Rd, Sivakasi',
    gstin: '32AABCK9902Q1Z',
    totalOrders: 18,
    lifetimeValue: '18,40,000',
    outstandingBalance: '22,600',
    creditUsed: '1,20,000',
    creditTotal: '5,00,000',
    creditProgress: 24,
    recentTx: [
      { id: '#KWF-2026-0888', dateItem: 'Today • Cane Bookcase', amount: '22,600' },
      { id: '#KWF-2026-0792', dateItem: '14 Oct • Boardroom Desk', amount: '95,000' },
    ],
  },
  {
    id: 3,
    initials: 'AM',
    avatarBg: '#EFE3DC',
    avatarColor: '#5C3A21',
    name: 'Anoop Menon',
    personName: 'Anoop Menon',
    type: 'Residential',
    fullTypeLabel: 'Anoop Menon • Residential Client',
    phone: '+91 98471 20984',
    location: 'Sivakasi Colony',
    address: 'Plot 42, Sivakasi Colony',
    deliveryAddress: 'Plot 42, Sivakasi Colony',
    gstin: 'Unregistered / Personal',
    totalOrders: 4,
    lifetimeValue: '3,42,000',
    outstandingBalance: '0',
    creditUsed: '0',
    creditTotal: '1,00,000',
    creditProgress: 0,
    recentTx: [
      { id: '#KWF-2026-0854', dateItem: '18 Oct • Nilambur Teak Bed', amount: '1,45,000' },
    ],
  },
  {
    id: 4,
    initials: 'TV',
    avatarBg: '#EFE3DC',
    avatarColor: '#5C3A21',
    name: 'Dr. Thomas Varghese',
    personName: 'Dr. Thomas Varghese',
    type: 'Residential',
    fullTypeLabel: 'Dr. Thomas Varghese • Private Villa',
    phone: '+91 97455 11029',
    location: 'Sivakasi Division',
    address: 'Riverside Bungalow, Sivakasi',
    deliveryAddress: 'Riverside Bungalow, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 6,
    lifetimeValue: '5,80,000',
    outstandingBalance: '45,000',
    creditUsed: '45,000',
    creditTotal: '2,50,000',
    creditProgress: 18,
    recentTx: [
      { id: '#KWF-2026-0870', dateItem: '22 Oct • Dining Suite 8-Seater', amount: '2,80,000' },
    ],
  },
  {
    id: 5,
    initials: 'LN',
    avatarBg: '#EFE3DC',
    avatarColor: '#5C3A21',
    name: 'Lakshmi Nair',
    personName: 'Lakshmi Nair',
    type: 'Residential',
    fullTypeLabel: 'Lakshmi Nair • Residential Client',
    phone: '+91 91944 60882',
    location: 'Sivakasi East Yard',
    address: 'Main Road, Sivakasi',
    deliveryAddress: 'Main Road, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 2,
    lifetimeValue: '85,000',
    outstandingBalance: '0',
    creditUsed: '0',
    creditTotal: '1,50,000',
    creditProgress: 0,
    recentTx: [],
  },
  {
    id: 6,
    initials: 'SK',
    avatarBg: '#31190B',
    avatarColor: '#FFFFFF',
    name: 'Suresh Kumar & Sons',
    personName: 'Suresh Kumar',
    type: 'Commercial',
    fullTypeLabel: 'Suresh Kumar & Sons • Commercial Store',
    phone: '+91 94431 88201',
    location: 'Sivakasi Town',
    address: '14 Bazaar Cross Street, Sivakasi',
    deliveryAddress: '14 Bazaar Cross Street, Sivakasi',
    gstin: '33AABCS8820K1Z9',
    totalOrders: 5,
    lifetimeValue: '2,45,000',
    outstandingBalance: '0',
    creditUsed: '60,500',
    creditTotal: '3,00,000',
    creditProgress: 20,
    recentTx: [
      { id: 'INV-1024', dateItem: 'Today • Teak Dining Table & Chairs', amount: '60,500' },
    ],
  },
  {
    id: 7,
    initials: 'RP',
    avatarBg: '#5C3A21',
    avatarColor: '#FFFFFF',
    name: 'Rajesh Packaging Ind.',
    personName: 'Rajesh Pandian',
    type: 'Industrial',
    fullTypeLabel: 'Rajesh Packaging Ind. • Industrial Yard',
    phone: '+91 98421 55032',
    location: 'Industrial Estate, Sivakasi',
    address: 'Plot 12, SIDCO Industrial Estate, Sivakasi',
    deliveryAddress: 'Plot 12, SIDCO Industrial Estate, Sivakasi',
    gstin: '33AABCR5503M1Z2',
    totalOrders: 8,
    lifetimeValue: '5,12,000',
    outstandingBalance: '34,000',
    creditUsed: '1,20,000',
    creditTotal: '5,00,000',
    creditProgress: 24,
    recentTx: [
      { id: 'INV-1023', dateItem: 'Yesterday • Rosewood King Bed', amount: '78,000' },
    ],
  },
  {
    id: 8,
    initials: 'MS',
    avatarBg: '#4A2E18',
    avatarColor: '#FFFFFF',
    name: 'Meenakshi Sundaram',
    personName: 'Meenakshi Sundaram',
    type: 'Heritage Villa',
    fullTypeLabel: 'Meenakshi Sundaram • Heritage Residence',
    phone: '+91 97890 23419',
    location: 'South Car St, Sivakasi',
    address: '88 South Car Street, Sivakasi',
    deliveryAddress: '88 South Car Street, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 3,
    lifetimeValue: '1,65,000',
    outstandingBalance: '0',
    creditUsed: '42,000',
    creditTotal: '2,00,000',
    creditProgress: 21,
    recentTx: [
      { id: 'INV-1022', dateItem: 'Nov 16 • Teak Artisan Sofa', amount: '42,000' },
    ],
  },
  {
    id: 9,
    initials: 'AG',
    avatarBg: '#5C3A21',
    avatarColor: '#FFFFFF',
    name: 'Annamalai Gounder',
    personName: 'Annamalai Gounder',
    type: 'Contractor',
    fullTypeLabel: 'Annamalai Gounder • Depot Contractor',
    phone: '+91 94861 40382',
    location: 'Sattur Road, Sivakasi',
    address: '42 Sattur By-pass Road, Sivakasi',
    deliveryAddress: '42 Sattur By-pass Road, Sivakasi',
    gstin: '33AABCA4038P1Z5',
    totalOrders: 7,
    lifetimeValue: '4,80,000',
    outstandingBalance: '18,500',
    creditUsed: '62,000',
    creditTotal: '3,00,000',
    creditProgress: 20,
    recentTx: [
      { id: 'INV-1020', dateItem: 'Nov 15 • Rosewood Wardrobe', amount: '68,000' },
    ],
  },
  {
    id: 10,
    initials: 'KP',
    avatarBg: '#31190B',
    avatarColor: '#FFFFFF',
    name: 'Karpagam Printers',
    personName: 'Karpagam Shanmugam',
    type: 'Commercial Studio',
    fullTypeLabel: 'Karpagam Printers • Print Studio',
    phone: '+91 94432 77109',
    location: 'Railway Feeder Rd, Sivakasi',
    address: '109 Railway Feeder Road, Sivakasi',
    deliveryAddress: '109 Railway Feeder Road, Sivakasi',
    gstin: '33AABCK7710J1Z8',
    totalOrders: 6,
    lifetimeValue: '3,20,000',
    outstandingBalance: '0',
    creditUsed: '16,500',
    creditTotal: '2,00,000',
    creditProgress: 8,
    recentTx: [
      { id: 'INV-1019', dateItem: 'Nov 15 • Teak Coffee Table', amount: '16,500' },
    ],
  },
  {
    id: 11,
    initials: 'PT',
    avatarBg: '#4A2E18',
    avatarColor: '#FFFFFF',
    name: 'Palaniswamy Timber Traders',
    personName: 'Palaniswamy Nadar',
    type: 'B2B Partner',
    fullTypeLabel: 'Palaniswamy Timber Traders • B2B',
    phone: '+91 98430 66214',
    location: 'Timber Market, Sivakasi',
    address: 'Unit 5, Timber Market Yard, Sivakasi',
    deliveryAddress: 'Unit 5, Timber Market Yard, Sivakasi',
    gstin: '33AABCP6621L1Z1',
    totalOrders: 14,
    lifetimeValue: '12,90,000',
    outstandingBalance: '62,000',
    creditUsed: '1,80,000',
    creditTotal: '6,00,000',
    creditProgress: 30,
    recentTx: [
      { id: 'INV-1018', dateItem: 'Nov 14 • Hydraulic Storage Bed', amount: '62,000' },
    ],
  },
  {
    id: 12,
    initials: 'RS',
    avatarBg: '#5C3A21',
    avatarColor: '#FFFFFF',
    name: 'Radhakrishnan & Co',
    personName: 'Radhakrishnan Pillai',
    type: 'Commercial',
    fullTypeLabel: 'Radhakrishnan & Co • Commercial',
    phone: '+91 94420 31872',
    location: 'Vilampatti Rd, Sivakasi',
    address: '71 Vilampatti Road, Sivakasi',
    deliveryAddress: '71 Vilampatti Road, Sivakasi',
    gstin: '33AABCR3187N1Z4',
    totalOrders: 4,
    lifetimeValue: '2,10,000',
    outstandingBalance: '0',
    creditUsed: '34,000',
    creditTotal: '2,50,000',
    creditProgress: 13,
    recentTx: [
      { id: 'INV-1017', dateItem: 'Nov 14 • Kerala Mandapam Pooja Unit', amount: '34,000' },
    ],
  },
  {
    id: 13,
    initials: 'SR',
    avatarBg: '#31190B',
    avatarColor: '#FFFFFF',
    name: 'Sivakasi Residency Suites',
    personName: 'Senthil Nathan',
    type: 'Hospitality',
    fullTypeLabel: 'Sivakasi Residency Suites • Hospitality',
    phone: '+91 97880 91423',
    location: 'Bypass Road, Sivakasi',
    address: '33 Bypass Junction, Sivakasi',
    deliveryAddress: '33 Bypass Junction, Sivakasi',
    gstin: '33AABCS9142R1Z7',
    totalOrders: 9,
    lifetimeValue: '7,40,000',
    outstandingBalance: '29,500',
    creditUsed: '95,000',
    creditTotal: '4,00,000',
    creditProgress: 23,
    recentTx: [
      { id: 'INV-1016', dateItem: 'Nov 13 • Rosewood Dressing Table', amount: '29,500' },
    ],
  },
  {
    id: 14,
    initials: 'MI',
    avatarBg: '#4A2E18',
    avatarColor: '#FFFFFF',
    name: 'Murugan Litho Press',
    personName: 'Murugan Chettiar',
    type: 'Industrial',
    fullTypeLabel: 'Murugan Litho Press • Industrial',
    phone: '+91 98425 10982',
    location: 'Thirutangal, Sivakasi',
    address: '15 Litho Nagar, Thirutangal, Sivakasi',
    deliveryAddress: '15 Litho Nagar, Thirutangal, Sivakasi',
    gstin: '33AABCM1098T1Z3',
    totalOrders: 5,
    lifetimeValue: '3,85,000',
    outstandingBalance: '0',
    creditUsed: '48,000',
    creditTotal: '3,00,000',
    creditProgress: 16,
    recentTx: [
      { id: 'INV-1015', dateItem: 'Nov 13 • Handcrafted Wooden Oonjal Swing', amount: '48,000' },
    ],
  },
  {
    id: 15,
    initials: 'VC',
    avatarBg: '#5C3A21',
    avatarColor: '#FFFFFF',
    name: 'Vignesh Construction Co.',
    personName: 'Vigneshwaran',
    type: 'Contractor',
    fullTypeLabel: 'Vignesh Construction Co. • Builder',
    phone: '+91 94435 82910',
    location: 'Ring Road, Sivakasi',
    address: '88 Ring Road, Sivakasi',
    deliveryAddress: '88 Ring Road, Sivakasi',
    gstin: '33AABCV8291Q1Z6',
    totalOrders: 11,
    lifetimeValue: '9,20,000',
    outstandingBalance: '21,000',
    creditUsed: '1,45,000',
    creditTotal: '5,00,000',
    creditProgress: 29,
    recentTx: [
      { id: 'INV-1013', dateItem: 'Nov 12 • Mahogany Library Display Rack', amount: '21,000' },
    ],
  },
  {
    id: 16,
    initials: 'KR',
    avatarBg: '#31190B',
    avatarColor: '#FFFFFF',
    name: 'Karthik Raja',
    personName: 'Karthik Raja',
    type: 'Residential',
    fullTypeLabel: 'Karthik Raja • Residential Client',
    phone: '+91 98433 45192',
    location: 'Teachers Colony, Sivakasi',
    address: '12 Teachers Colony 2nd St, Sivakasi',
    deliveryAddress: '12 Teachers Colony 2nd St, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 3,
    lifetimeValue: '1,12,000',
    outstandingBalance: '0',
    creditUsed: '26,500',
    creditTotal: '1,50,000',
    creditProgress: 17,
    recentTx: [
      { id: 'INV-1012', dateItem: 'Nov 11 • Teakwood TV Entertainment Console', amount: '26,500' },
    ],
  },
  {
    id: 17,
    initials: 'ST',
    avatarBg: '#4A2E18',
    avatarColor: '#FFFFFF',
    name: 'Selvi Thirumalai',
    personName: 'Selvi Thirumalai',
    type: 'Residential',
    fullTypeLabel: 'Selvi Thirumalai • Residential Client',
    phone: '+91 97860 38291',
    location: 'Sankarankovil Rd, Sivakasi',
    address: '54 Sankarankovil Road, Sivakasi',
    deliveryAddress: '54 Sankarankovil Road, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 2,
    lifetimeValue: '72,000',
    outstandingBalance: '0',
    creditUsed: '12,800',
    creditTotal: '1,00,000',
    creditProgress: 12,
    recentTx: [
      { id: 'INV-1011', dateItem: 'Nov 11 • Hand-Carved Rocking Chair', amount: '12,800' },
    ],
  },
  {
    id: 18,
    initials: 'VS',
    avatarBg: '#5C3A21',
    avatarColor: '#FFFFFF',
    name: 'Vijayalakshmi Sweets',
    personName: 'Vijayalakshmi Ammal',
    type: 'Commercial Store',
    fullTypeLabel: 'Vijayalakshmi Sweets • Retail',
    phone: '+91 94433 90281',
    location: 'South Car Street, Sivakasi',
    address: '22 South Car Street, Sivakasi',
    deliveryAddress: '22 South Car Street, Sivakasi',
    gstin: '33AABCV9028K1Z5',
    totalOrders: 6,
    lifetimeValue: '2,90,000',
    outstandingBalance: '0',
    creditUsed: '29,000',
    creditTotal: '2,00,000',
    creditProgress: 14,
    recentTx: [
      { id: 'INV-1010', dateItem: 'Nov 10 • Teak Ergonomic Armchairs', amount: '29,000' },
    ],
  },
  {
    id: 19,
    initials: 'JB',
    avatarBg: '#31190B',
    avatarColor: '#FFFFFF',
    name: 'Jayaram Brothers',
    personName: 'Jayaram Pandian',
    type: 'Wholesale Merchant',
    fullTypeLabel: 'Jayaram Brothers • Wholesale',
    phone: '+91 98420 81290',
    location: 'Thirutangal Rd, Sivakasi',
    address: '90 Thirutangal Road, Sivakasi',
    deliveryAddress: '90 Thirutangal Road, Sivakasi',
    gstin: '33AABCJ8129F1Z2',
    totalOrders: 7,
    lifetimeValue: '4,10,000',
    outstandingBalance: '0',
    creditUsed: '18,500',
    creditTotal: '3,00,000',
    creditProgress: 6,
    recentTx: [
      { id: 'INV-1009', dateItem: 'Nov 10 • Handcrafted Cane Bookcase', amount: '18,500' },
    ],
  },
  {
    id: 20,
    initials: 'NS',
    avatarBg: '#4A2E18',
    avatarColor: '#FFFFFF',
    name: 'Dr. N. Soundararajan',
    personName: 'Dr. N. Soundararajan',
    type: 'Private Hospital',
    fullTypeLabel: 'Dr. N. Soundararajan • Hospital Suite',
    phone: '+91 97890 55192',
    location: 'Hospital Road, Sivakasi',
    address: '16 Hospital Road, Sivakasi',
    deliveryAddress: '16 Hospital Road, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 4,
    lifetimeValue: '2,60,000',
    outstandingBalance: '0',
    creditUsed: '22,500',
    creditTotal: '2,50,000',
    creditProgress: 9,
    recentTx: [
      { id: 'INV-1008', dateItem: 'Nov 09 • Anjili Heritage Brass Chest', amount: '22,500' },
    ],
  },
  {
    id: 21,
    initials: 'MI',
    avatarBg: '#5C3A21',
    avatarColor: '#FFFFFF',
    name: 'Malarvizhi Interiors',
    personName: 'Malarvizhi Senthil',
    type: 'Architect & Design',
    fullTypeLabel: 'Malarvizhi Interiors • Studio',
    phone: '+91 94421 66839',
    location: 'North Car Street, Sivakasi',
    address: '45 North Car Street, Sivakasi',
    deliveryAddress: '45 North Car Street, Sivakasi',
    gstin: '33AABCM6683P1Z9',
    totalOrders: 10,
    lifetimeValue: '8,40,000',
    outstandingBalance: '19,800',
    creditUsed: '1,10,000',
    creditTotal: '4,50,000',
    creditProgress: 24,
    recentTx: [
      { id: 'INV-1007', dateItem: 'Nov 09 • Live-Edge Console Table', amount: '19,800' },
    ],
  },
  {
    id: 22,
    initials: 'BA',
    avatarBg: '#31190B',
    avatarColor: '#FFFFFF',
    name: 'Balaji Agency',
    personName: 'Balaji Srinivasan',
    type: 'Commercial',
    fullTypeLabel: 'Balaji Agency • Commercial',
    phone: '+91 98432 10984',
    location: 'Sattur Road, Sivakasi',
    address: '38 Sattur Main Road, Sivakasi',
    deliveryAddress: '38 Sattur Main Road, Sivakasi',
    gstin: '33AABCB1098M1Z7',
    totalOrders: 5,
    lifetimeValue: '1,95,000',
    outstandingBalance: '0',
    creditUsed: '9,500',
    creditTotal: '1,50,000',
    creditProgress: 6,
    recentTx: [
      { id: 'INV-1006', dateItem: 'Nov 08 • Louvered Shoe Rack', amount: '9,500' },
    ],
  },
  {
    id: 23,
    initials: 'MS',
    avatarBg: '#4A2E18',
    avatarColor: '#FFFFFF',
    name: 'Manickam & Sons Traders',
    personName: 'Manickam Nadar',
    type: 'B2B Wholesale',
    fullTypeLabel: 'Manickam & Sons Traders • B2B',
    phone: '+91 94430 77190',
    location: 'Market Yard, Sivakasi',
    address: '29 Market Yard Outer, Sivakasi',
    deliveryAddress: '29 Market Yard Outer, Sivakasi',
    gstin: '33AABCM7719L1Z4',
    totalOrders: 12,
    lifetimeValue: '11,20,000',
    outstandingBalance: '31,000',
    creditUsed: '1,65,000',
    creditTotal: '5,00,000',
    creditProgress: 33,
    recentTx: [
      { id: 'INV-1005', dateItem: 'Nov 08 • Vintage 5-Drawer Wooden Chest', amount: '31,000' },
    ],
  },
  {
    id: 24,
    initials: 'SS',
    avatarBg: '#5C3A21',
    avatarColor: '#FFFFFF',
    name: 'Sree Saravana Match Works',
    personName: 'Saravanan Muthuraman',
    type: 'Industrial Safety',
    fullTypeLabel: 'Sree Saravana Match Works • Industrial',
    phone: '+91 97892 44381',
    location: 'Sivakasi Depot',
    address: '102 Match Factory Compound, Sivakasi',
    deliveryAddress: '102 Match Factory Compound, Sivakasi',
    gstin: '33AABCS4438H1Z1',
    totalOrders: 16,
    lifetimeValue: '15,60,000',
    outstandingBalance: '23,000',
    creditUsed: '2,10,000',
    creditTotal: '7,00,000',
    creditProgress: 30,
    recentTx: [
      { id: 'INV-1004', dateItem: 'Nov 07 • Teakwood Solid Dining Benches', amount: '23,000' },
    ],
  },
]

const INITIAL_TRANSACTIONS = [
  { id: 'INV-1024', date: 'Nov 17, 2026, 05:45 PM', monthYear: 'November 2026', year: '2026', customer: 'Suresh Kumar & Sons', project: 'Sivakasi Town', wood: 'Nilambur Teak', item: '1x Teak Dining Table, 6x Chairs', volume: 42, amount: '60,500', rawAmount: 60500, status: 'Paid' },
  { id: 'INV-1023', date: 'Nov 17, 2026, 04:15 PM', monthYear: 'November 2026', year: '2026', customer: 'Dr. Thomas Varghese', project: 'Sivakasi Division', wood: 'Rosewood Timber', item: '1x Solid Rosewood King Bed, 2x Nightstands', volume: 54, amount: '85,200', rawAmount: 85200, status: 'Paid' },
  { id: 'INV-1022', date: 'Nov 16, 2026, 03:30 PM', monthYear: 'November 2026', year: '2026', customer: 'Priya Lakshmi Textiles', project: 'Kamaraj Road, Sivakasi', wood: 'Nilambur Teak', item: '1x Teakwood 3-Seater Sofa, 1x Coffee Table', volume: 38, amount: '58,500', rawAmount: 58500, status: 'Paid' },
  { id: 'INV-1021', date: 'Nov 16, 2026, 01:20 PM', monthYear: 'November 2026', year: '2026', customer: 'Deepak Kurian & Architects', project: 'Sivakasi Guild', wood: 'Jackfruit Plavu', item: '1x Jackfruit Live-Edge Boardroom Desk', volume: 68, amount: '95,000', rawAmount: 95000, status: 'Paid' },
  { id: 'INV-1020', date: 'Nov 15, 2026, 05:10 PM', monthYear: 'November 2026', year: '2026', customer: 'Rajeshwari Ammal', project: 'Main Bazaar, Sivakasi', wood: 'Nilambur Teak', item: '1x Kerala Traditional Mandapam Pooja Unit', volume: 32, amount: '34,000', rawAmount: 34000, status: 'Paid' },
  { id: 'INV-1019', date: 'Nov 15, 2026, 02:45 PM', monthYear: 'November 2026', year: '2026', customer: 'Anoop Menon', project: 'Sivakasi Colony', wood: 'Nilambur Teak', item: '1x Teakwood Queen Hydraulic Storage Bed', volume: 46, amount: '62,000', rawAmount: 62000, status: 'Paid' },
  { id: 'INV-1018', date: 'Nov 14, 2026, 04:00 PM', monthYear: 'November 2026', year: '2026', customer: 'Sri Meenakshi Printers', project: 'Industrial Area, Sivakasi', wood: 'Rosewood Timber', item: '1x Rosewood 3-Door Master Wardrobe', volume: 58, amount: '68,000', rawAmount: 68000, status: 'Paid' },
  { id: 'INV-1017', date: 'Nov 14, 2026, 11:30 AM', monthYear: 'November 2026', year: '2026', customer: 'Murugan Modern Furnishings', project: 'Bypass Road, Sivakasi', wood: 'Nilambur Teak', item: '4x High-Back Ergonomic Teak Study Chairs', volume: 24, amount: '34,000', rawAmount: 34000, status: 'Paid' },
  { id: 'INV-1016', date: 'Nov 13, 2026, 03:15 PM', monthYear: 'November 2026', year: '2026', customer: 'Senthil Nathan', project: 'Police Station Rd, Sivakasi', wood: 'Nilambur Teak', item: '1x Handcrafted Wooden Oonjal Swing', volume: 40, amount: '48,000', rawAmount: 48000, status: 'Paid' },
  { id: 'INV-1015', date: 'Nov 13, 2026, 10:45 AM', monthYear: 'November 2026', year: '2026', customer: 'Dr. K. Radhakrishnan', project: 'Gandhi Nagar, Sivakasi', wood: 'Rosewood Timber', item: '1x Solid Rosewood Dressing Table with Mirror', volume: 28, amount: '29,500', rawAmount: 29500, status: 'Paid' },
  { id: 'INV-1014', date: 'Nov 12, 2026, 04:30 PM', monthYear: 'November 2026', year: '2026', customer: 'Anandha Bhavan Residency', project: 'Station Rd, Sivakasi', wood: 'Nilambur Teak', item: '1x Teakwood 4-Seater Dining Set', volume: 34, amount: '36,000', rawAmount: 36000, status: 'Paid' },
  { id: 'INV-1013', date: 'Nov 12, 2026, 01:15 PM', monthYear: 'November 2026', year: '2026', customer: 'Vignesh Construction Co.', project: 'Ring Road, Sivakasi', wood: 'Mahogany', item: '1x Mahogany 6-Shelf Library Display Rack', volume: 36, amount: '21,000', rawAmount: 21000, status: 'Paid' },
  { id: 'INV-1012', date: 'Nov 11, 2026, 05:00 PM', monthYear: 'November 2026', year: '2026', customer: 'Karthik Raja', project: 'Teachers Colony, Sivakasi', wood: 'Nilambur Teak', item: '1x Teakwood TV Media Entertainment Console', volume: 26, amount: '26,500', rawAmount: 26500, status: 'Paid' },
  { id: 'INV-1011', date: 'Nov 11, 2026, 11:20 AM', monthYear: 'November 2026', year: '2026', customer: 'Selvi Thirumalai', project: 'Sankarankovil Rd, Sivakasi', wood: 'Nilambur Teak', item: '1x Traditional Hand-Carved Rocking Chair', volume: 18, amount: '12,800', rawAmount: 12800, status: 'Paid' },
  { id: 'INV-1010', date: 'Nov 10, 2026, 03:45 PM', monthYear: 'November 2026', year: '2026', customer: 'Vijayalakshmi Sweets', project: 'South Car Street, Sivakasi', wood: 'Nilambur Teak', item: '2x Teak Ergonomic Armchairs', volume: 22, amount: '29,000', rawAmount: 29000, status: 'Paid' },
  { id: 'INV-1009', date: 'Nov 10, 2026, 10:30 AM', monthYear: 'November 2026', year: '2026', customer: 'Jayaram Brothers', project: 'Thirutangal Rd, Sivakasi', wood: 'Mahogany', item: '1x Handcrafted Cane Bookcase', volume: 25, amount: '18,500', rawAmount: 18500, status: 'Paid' },
  { id: 'INV-1008', date: 'Nov 09, 2026, 04:15 PM', monthYear: 'November 2026', year: '2026', customer: 'Dr. N. Soundararajan', project: 'Hospital Road, Sivakasi', wood: 'Wild Anjili', item: '1x Anjili Heritage Brass Chest', volume: 30, amount: '22,500', rawAmount: 22500, status: 'Paid' },
  { id: 'INV-1007', date: 'Nov 09, 2026, 11:00 AM', monthYear: 'November 2026', year: '2026', customer: 'Malarvizhi Interiors', project: 'North Car Street, Sivakasi', wood: 'Nilambur Teak', item: '1x Live-Edge Teak Entryway Console Table', volume: 24, amount: '19,800', rawAmount: 19800, status: 'Paid' },
  { id: 'INV-1006', date: 'Nov 08, 2026, 03:00 PM', monthYear: 'November 2026', year: '2026', customer: 'Balaji Agency', project: 'Sattur Road, Sivakasi', wood: 'Hardwood', item: '1x Solid Wood 3-Tier Louvered Shoe Rack', volume: 16, amount: '9,500', rawAmount: 9500, status: 'Paid' },
  { id: 'INV-1005', date: 'Nov 08, 2026, 09:45 AM', monthYear: 'November 2026', year: '2026', customer: 'Manickam & Sons Traders', project: 'Market Yard, Sivakasi', wood: 'Rosewood Timber', item: '1x Vintage 5-Drawer Wooden Chest', volume: 35, amount: '31,000', rawAmount: 31000, status: 'Paid' },
  { id: 'INV-1004', date: 'Nov 07, 2026, 04:30 PM', monthYear: 'November 2026', year: '2026', customer: 'Sree Saravana Match Works', project: 'Sivakasi Depot', wood: 'Nilambur Teak', item: '2x Teakwood Solid Dining Benches', volume: 28, amount: '23,000', rawAmount: 23000, status: 'Paid' },
  { id: 'INV-1003', date: 'Nov 07, 2026, 01:15 PM', monthYear: 'November 2026', year: '2026', customer: 'K. Vasanth Kumar', project: 'Velayutham Colony, Sivakasi', wood: 'Nilambur Teak', item: '2x Wooden Bar Stools with Swivel Top', volume: 15, amount: '13,600', rawAmount: 13600, status: 'Paid' },
  { id: 'INV-1002', date: 'Nov 06, 2026, 03:50 PM', monthYear: 'November 2026', year: '2026', customer: 'Gowri Shankar Mills', project: 'Vembakottai Rd, Sivakasi', wood: 'Nilambur Teak', item: '1x Solid Teak Side Server Credenza', volume: 29, amount: '24,000', rawAmount: 24000, status: 'Paid' },
  { id: 'INV-1001', date: 'Nov 05, 2026, 11:30 AM', monthYear: 'November 2026', year: '2026', customer: 'Shanmuga Priya', project: 'Alagappan Nagar, Sivakasi', wood: 'Rosewood Timber', item: '2x Rosewood Dual-Drawer Bedside Nightstands', volume: 20, amount: '14,400', rawAmount: 14400, status: 'Paid' },
]

const EMPTY_INITIAL_CUSTOMER = {
  id: 'cust-empty-1',
  name: '',
  phone: '',
  address: '',
  deliveryAddress: '',
  location: '',
  gstin: '',
  totalOrders: 0,
  lifetimeValue: 0,
}

const INITIAL_BILLS = [
  {
    id: 'bill-1',
    invoiceNumber: 'INV-1003',
    invoiceDate: '2026-11-17',
    dueDate: '2026-12-02',
    name: 'Bill #1',
    status: 'active',
    customer: EMPTY_INITIAL_CUSTOMER,
    items: [],
    paymentStatus: 'Pending',
    paymentMode: 'UPI',
    packagingNote: '',
    deliveryApplied: true,
  },
]

// Dispatch store changes to notify components
function notifyStoreUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('timber_store_updated'))
  }
}

// Helpers for localStorage
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (err) {
    console.warn(`[dataStore] load ${key} error:`, err)
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`[dataStore] save ${key} error:`, err)
  }
}

export const DataStore = {
  // SYNC WITH BACKEND
  async syncFromBackend() {
    try {
      // 1. Sync Settings
      const resSettings = await fetch(`${API_BASE}/api/settings`).catch(() => null)
      if (resSettings && resSettings.ok) {
        const data = await resSettings.json()
        if (data.settings) {
          saveToStorage(STORAGE_KEYS.SETTINGS, data.settings)
        }
      }

      // 2. Sync Products
      const resProducts = await fetch(`${API_BASE}/api/products`).catch(() => null)
      if (resProducts && resProducts.ok) {
        const data = await resProducts.json()
        if (data.products && data.products.length > 0) {
          saveToStorage(STORAGE_KEYS.PRODUCTS, data.products)
        }
      }

      // 3. Sync Customers
      const resCustomers = await fetch(`${API_BASE}/api/customers`).catch(() => null)
      if (resCustomers && resCustomers.ok) {
        const data = await resCustomers.json()
        if (data.customers && data.customers.length > 0) {
          const formatted = data.customers.map((c) => ({
            id: c._id || c.id || Date.now(),
            name: c.name,
            personName: c.personName || c.name,
            phone: c.phone || '',
            email: c.email || '',
            location: c.location || '',
            address: c.address || '',
            deliveryAddress: c.deliveryAddress || c.address || '',
            gstin: c.gstin || 'Unregistered / Personal',
            type: c.type || 'Residential',
            totalOrders: c.totalOrders || 0,
            lifetimeValue: c.lifetimeValue || '0',
            outstandingBalance: c.outstandingBalance || '0',
            creditUsed: c.creditUsed || '0',
            creditTotal: c.creditTotal || '2,00,000',
            recentTx: c.recentTx || [],
          }))
          saveToStorage(STORAGE_KEYS.CUSTOMERS, formatted)
        }
      }

      // 4. Sync Sales / Transactions
      const resSales = await fetch(`${API_BASE}/api/sales`).catch(() => null)
      if (resSales && resSales.ok) {
        const data = await resSales.json()
        if (data.sales && data.sales.length > 0) {
          const formatted = data.sales.map((s) => ({
            id: s.invoice,
            invoice: s.invoice,
            date: s.date ? new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 17, 2026',
            year: s.year || '2026',
            monthYear: s.monthYear || 'November 2026',
            customer: s.customer,
            project: s.location || 'Sivakasi Yard Sale',
            wood: s.wood || 'Artisan Timber',
            item: s.items,
            amount: Number(s.amount || 0).toLocaleString('en-IN'),
            rawAmount: Number(s.amount || 0),
            status: s.paymentStatus || s.status || 'Paid',
          }))
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, formatted)
        }
      }

      notifyStoreUpdate()
    } catch (err) {
      console.warn('[dataStore] Background sync failed, using offline cache:', err.message)
    }
  },

  // SETTINGS
  getSettings() {
    return loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  },
  saveSettings(settings) {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings)
    notifyStoreUpdate()

    // Sync to backend MongoDB
    fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(() => {})
  },

  // PRODUCTS
  getProducts() {
    return loadFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS)
  },
  saveProducts(list) {
    saveToStorage(STORAGE_KEYS.PRODUCTS, list)
    notifyStoreUpdate()
  },
  addProduct(item) {
    const list = this.getProducts()
    const qty = Number(item.stockQuantity) || 4
    const threshold = Number(item.lowStockThreshold) || 2
    const numPrice = Number(item.sellingPrice) || 45000

    const existingIndex = list.findIndex(
      (p) => (item.sku && p.sku === item.sku) || (item.name && p.name.toLowerCase() === item.name.toLowerCase())
    )

    if (existingIndex >= 0) {
      const existing = list[existingIndex]
      const newQty = (Number(existing.stockQuantity) || 0) + qty
      let stockType = 'in-stock'
      let stockLabel = `${newQty} in stock`
      if (newQty <= 1) {
        stockType = 'critical'
        stockLabel = `${newQty} left (Critical)`
      } else if (newQty <= (existing.lowStockThreshold || threshold)) {
        stockType = 'low'
        stockLabel = `${newQty} in stock (Low)`
      }
      list[existingIndex] = {
        ...existing,
        stockQuantity: newQty,
        stock: stockLabel,
        stockType,
        unitPrice: numPrice || existing.unitPrice,
        price: '₹' + (numPrice || existing.unitPrice).toLocaleString('en-IN'),
      }
      this.saveProducts(list)

      // Sync stock update to MongoDB
      fetch(`${API_BASE}/api/products/${encodeURIComponent(existing.sku || existing.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newQty, sellingPrice: numPrice || existing.unitPrice }),
      }).catch(() => {})

      return list[existingIndex]
    }

    let stockType = 'in-stock'
    let stockLabel = `${qty} in stock`
    if (qty <= 1) {
      stockType = 'critical'
      stockLabel = `${qty} left (Critical)`
    } else if (qty <= threshold) {
      stockType = 'low'
      stockLabel = `${qty} in stock (Low)`
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      sku: item.sku || `KWF-${Date.now().toString().slice(-4)}`,
      name: item.name || 'Artisan Timber Furniture',
      finish: item.surfacePolish || item.finish || 'Matte Natural Wax Finish',
      category: item.category || 'Dining Sets',
      unitPrice: numPrice,
      price: '₹' + numPrice.toLocaleString('en-IN'),
      sellingPrice: numPrice,
      stockQuantity: qty,
      stock: stockLabel,
      stockType,
      lowStockThreshold: threshold,
      woodSpecies: item.woodSpecies || 'Teak',
      description: item.description || '',
      dimensions: item.dimensions || { length: 0, width: 0, height: 0, weight: 0 },
      woodGrade: item.woodGrade || 'Grade A - Nilambur Heartwood',
      surfacePolish: item.surfacePolish || 'Natural Protective Organic-Beeswax',
      joineryTechnique: item.joineryTechnique || 'Mortise & Tenon with Rosewood Dowels',
      warranty: item.warranty || '5-Yr Termite & Wood',
      depotLocation: item.depotLocation || 'Sivakasi Central Depot',
      packagingType: item.packagingType || 'Corrugated Multi-layer Wood Wrap',
      shippingClass: item.shippingClass || 'Class 3 - Heavy Solid Furniture (Direct Depot Truck)',
      tradeDiscount: item.tradeDiscount || 'Standard Builder Tier (10% Off)',
    }
    list.unshift(newProduct)
    this.saveProducts(list)

    // Sync create to MongoDB
    fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    }).catch(() => {})

    return newProduct
  },
  updateProduct(item) {
    const list = this.getProducts()
    const targetId = item.id || item._id || item.sku
    const numPrice = Number(item.sellingPrice || item.unitPrice || 0) || 45000
    const qty = Number(item.stockQuantity !== undefined ? item.stockQuantity : 4)
    const threshold = Number(item.lowStockThreshold || 2)

    let stockType = 'in-stock'
    let stockLabel = `${qty} in stock`
    if (qty <= 1) {
      stockType = 'critical'
      stockLabel = `${qty} left (Critical)`
    } else if (qty <= threshold) {
      stockType = 'low'
      stockLabel = `${qty} in stock (Low)`
    }

    let updatedItem = null
    const updated = list.map((p) => {
      if (p.id === targetId || p._id === targetId || p.sku === item.sku || p.name === item.name) {
        updatedItem = {
          ...p,
          ...item,
          id: p.id || targetId,
          sku: item.sku || p.sku,
          name: item.name || p.name,
          category: item.category || p.category,
          woodSpecies: item.woodSpecies || p.woodSpecies,
          finish: item.surfacePolish || item.finish || p.finish,
          unitPrice: numPrice,
          price: '₹' + numPrice.toLocaleString('en-IN'),
          sellingPrice: numPrice,
          stockQuantity: qty,
          stock: stockLabel,
          stockType,
          lowStockThreshold: threshold,
          description: item.description !== undefined ? item.description : p.description,
          dimensions: item.dimensions || p.dimensions,
          woodGrade: item.woodGrade || p.woodGrade,
          surfacePolish: item.surfacePolish || p.surfacePolish,
          joineryTechnique: item.joineryTechnique || p.joineryTechnique,
          warranty: item.warranty || p.warranty,
          depotLocation: item.depotLocation || p.depotLocation,
          packagingType: item.packagingType || p.packagingType,
          shippingClass: item.shippingClass || p.shippingClass,
          tradeDiscount: item.tradeDiscount || p.tradeDiscount,
        }
        return updatedItem
      }
      return p
    })

    if (!updatedItem) {
      updatedItem = { ...item, id: targetId, price: '₹' + numPrice.toLocaleString('en-IN'), stock: stockLabel, stockType }
      updated.unshift(updatedItem)
    }

    this.saveProducts(updated)

    // Sync update to MongoDB
    fetch(`${API_BASE}/api/products/${encodeURIComponent(item._id || item.id || item.sku || item.name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem),
    }).catch(() => {})

    return updatedItem
  },
  deleteProduct(productId) {
    const list = this.getProducts()
    const target = list.find((p) => p.id === productId || p._id === productId || p.sku === productId)
    const filtered = list.filter((p) => p.id !== productId && p._id !== productId && p.sku !== productId)
    this.saveProducts(filtered)

    // Sync delete to MongoDB
    const idToSync = (target && (target._id || target.id || target.sku)) || productId
    fetch(`${API_BASE}/api/products/${encodeURIComponent(idToSync)}`, {
      method: 'DELETE',
    }).catch(() => {})

    return filtered
  },
  updateStock(productId, newQty) {
    const list = this.getProducts()
    let target = null
    const updated = list.map((p) => {
      if (p.id === productId || p.sku === productId || p.name === productId) {
        const qty = Math.max(0, newQty)
        const threshold = p.lowStockThreshold || 2
        let stockType = 'in-stock'
        let stockLabel = `${qty} in stock`
        if (qty <= 1) {
          stockType = 'critical'
          stockLabel = `${qty} left (Critical)`
        } else if (qty <= threshold) {
          stockType = 'low'
          stockLabel = `${qty} in stock (Low)`
        }
        target = { ...p, stockQuantity: qty, stock: stockLabel, stockType }
        return target
      }
      return p
    })
    this.saveProducts(updated)

    if (target) {
      fetch(`${API_BASE}/api/products/${encodeURIComponent(target.sku || target.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: target.stockQuantity }),
      }).catch(() => {})
    }
  },

  // CUSTOMERS
  getCustomers() {
    return loadFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS)
  },
  saveCustomers(list) {
    saveToStorage(STORAGE_KEYS.CUSTOMERS, list)
    notifyStoreUpdate()
  },
  addCustomer(c) {
    const list = this.getCustomers()
    const nameParts = (c.name || 'New Patron').split(' ')
    const initials = nameParts.length > 1 ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase() : nameParts[0].slice(0, 2).toUpperCase()
    const newCustomer = {
      id: Date.now(),
      initials,
      avatarBg: '#5C3A21',
      avatarColor: '#FFFFFF',
      name: c.name || 'New Patron',
      personName: c.personName || c.name,
      type: c.type || 'Residential',
      fullTypeLabel: `${c.name} • ${c.type || 'Client'}`,
      phone: c.phone || '',
      email: c.email || '',
      location: c.location || 'Sivakasi Yard Division',
      address: c.address || '',
      deliveryAddress: c.deliveryAddress || c.address || '',
      gstin: c.gstin || 'Unregistered / Personal',
      totalOrders: 0,
      lifetimeValue: '0',
      outstandingBalance: '0',
      creditUsed: '0',
      creditTotal: '2,00,000',
      creditProgress: 0,
      recentTx: [],
    }
    list.unshift(newCustomer)
    this.saveCustomers(list)

    // Sync to backend MongoDB
    fetch(`${API_BASE}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomer),
    }).catch(() => {})

    return newCustomer
  },

  // BILLS & DRAFTS
  getBills() {
    return loadFromStorage(STORAGE_KEYS.BILLS, INITIAL_BILLS)
  },
  saveBills(bills) {
    saveToStorage(STORAGE_KEYS.BILLS, bills)
    notifyStoreUpdate()
  },
  getActiveBillId() {
    return loadFromStorage(STORAGE_KEYS.ACTIVE_BILL_ID, 'bill-1')
  },
  setActiveBillId(id) {
    saveToStorage(STORAGE_KEYS.ACTIVE_BILL_ID, id)
    notifyStoreUpdate()
  },
  getActiveBill() {
    const bills = this.getBills()
    const activeId = this.getActiveBillId()
    return bills.find((b) => b.id === activeId) || bills[0] || null
  },
  createNewDraft(preselectedCustomer = null) {
    const bills = this.getBills()
    const emptyCustomer = {
      id: `cust-${Date.now()}`,
      name: '',
      phone: '',
      address: '',
      deliveryAddress: '',
      location: '',
      gstin: '',
      totalOrders: 0,
      lifetimeValue: 0,
    }
    const targetCust = preselectedCustomer || emptyCustomer
    const seq = bills.length + 1
    const newId = `bill-${Date.now()}`

    // Auto-generate next sequential invoice number like INV-1004, INV-1005
    const existingInvoices = [
      ...bills.map((b) => b.invoiceNumber || ''),
      ...this.getTransactions().map((t) => t.invoice || t.id || ''),
    ]
    const extractedNums = existingInvoices
      .map((inv) => {
        const m = String(inv).match(/INV-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => !isNaN(n) && n > 0)
    const nextSeq = extractedNums.length > 0 ? Math.max(...extractedNums) + 1 : 1001
    const autoInv = `INV-${nextSeq}`

    // Today's date formatted as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]
    // Due date +15 days
    const due = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const newBill = {
      id: newId,
      invoiceNumber: autoInv,
      invoiceDate: today,
      dueDate: due,
      name: targetCust.name ? `Bill #${seq} • ${targetCust.name}` : `Bill #${seq}`,
      status: 'active',
      customer: targetCust,
      items: [], // Completely clean empty items
      paymentStatus: 'Pending',
      paymentMode: 'UPI',
      amountPaid: 0,
      discount: 0,
      deliveryCharge: 0,
      notes: '',
    }

    bills.push(newBill)
    this.saveBills(bills)
    this.setActiveBillId(newId)
    return newBill
  },
  updateBill(billId, updates) {
    const bills = this.getBills()
    const updated = bills.map((b) => (b.id === billId ? { ...b, ...updates } : b))
    this.saveBills(updated)
  },
  holdCurrentBill(billId) {
    this.updateBill(billId, { status: 'draft' })
  },
  clearBillCart(billId) {
    this.updateBill(billId, { items: [] })
  },
  removeBill(billId) {
    const bills = this.getBills()
    const remaining = bills.filter((b) => b.id !== billId)
    if (remaining.length === 0) {
      const fresh = this.createNewDraft()
      return fresh
    }
    this.saveBills(remaining)
    if (this.getActiveBillId() === billId) {
      this.setActiveBillId(remaining[0].id)
    }
    return remaining[0]
  },

  // TRANSACTIONS / SALES
  getTransactions() {
    const raw = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS)
    const cleaned = (raw || []).filter((tx) => {
      const yr = String(tx.year || '')
      const dt = String(tx.date || '')
      return yr !== '2024' && !dt.includes('2024')
    })
    if (cleaned.length < 20) {
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS)
      return INITIAL_TRANSACTIONS
    }
    return cleaned
  },
  saveTransactions(txs) {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs)
    notifyStoreUpdate()
  },
  recordSaleFromBill(bill) {
    const txs = this.getTransactions()
    const items = bill.items || []
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1)), 0)
    const totalGst = items.reduce((sum, item) => {
      const lineCost = Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1)
      const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : 0
      return sum + (lineCost * gstRate) / 100
    }, 0)
    const discount = Number(bill.discount) || 0
    const delivery = Number(bill.deliveryCharge) || 0
    const grandTotal = Math.max(0, Math.round(subtotal + totalGst + delivery - discount))
    const totalVolume = items.reduce((sum, item) => sum + (Number(item.quantity || 1) * 12), 0)

    const settings = this.getSettings()
    let txDateStr
    let txYear
    if (settings.systemDate) {
      const d = new Date(settings.systemDate)
      txDateStr = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      txYear = !isNaN(d.getTime()) ? d.getFullYear().toString() : new Date().getFullYear().toString()
    } else {
      const d = new Date()
      txDateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      txYear = d.getFullYear().toString()
    }

    const txTimeStr = settings.systemTime?.trim()
      ? settings.systemTime.trim()
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    const itemNames = items.map((i) => `${i.quantity || 1}x ${i.description || i.name || 'Furniture'}`).join(', ')

    const newTx = {
      id: bill.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      invoice: bill.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      date: `${txDateStr}, ${txTimeStr}`,
      year: txYear,
      createdAt: new Date().toISOString(),
      monthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      customer: bill.customer?.name || 'Walk-in Patron',
      customerPhone: bill.customer?.phone || '',
      customerAddress: bill.customer?.address || '',
      customerGstin: bill.customer?.gstin || '',
      project: bill.customer?.location || 'Sivakasi Yard Sale',
      wood: items[0]?.woodSpecies || 'Teak Wood',
      item: itemNames || 'Artisan Furniture Order',
      volume: totalVolume || 36,
      amount: grandTotal.toLocaleString('en-IN'),
      rawAmount: grandTotal,
      subtotal,
      taxAmount: totalGst,
      discount,
      deliveryCharge: delivery,
      status: bill.paymentStatus || 'Paid',
      paymentStatus: bill.paymentStatus || 'Paid',
      paymentMode: bill.paymentMode || 'UPI',
    }

    txs.unshift(newTx)
    this.saveTransactions(txs)

    // Deduct stock locally
    const products = this.getProducts()
    items.forEach((item) => {
      const p = products.find((prod) => prod.sku === item.sku || prod.name === (item.description || item.name))
      if (p) {
        p.stockQuantity = Math.max(0, (p.stockQuantity || 0) - (Number(item.quantity) || 1))
        this.updateStock(p.id, p.stockQuantity)
      }
    })

    // Sync sale to MongoDB Backend
    fetch(`${API_BASE}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice: newTx.invoice,
        customer: newTx.customer,
        customerPhone: newTx.customerPhone,
        customerAddress: newTx.customerAddress,
        customerGstin: newTx.customerGstin,
        location: newTx.project,
        items: newTx.item,
        itemsList: items,
        subtotal,
        taxAmount: totalGst,
        discount,
        deliveryCharge: delivery,
        amount: grandTotal,
        paymentStatus: bill.paymentStatus || 'Pending',
        paymentMode: bill.paymentMode || 'UPI',
        invoiceDate: bill.invoiceDate,
        dueDate: bill.dueDate,
        notes: bill.notes,
        date: new Date().toISOString(),
      }),
    }).catch((err) => {
      console.warn('[dataStore] Offline sale saved locally:', err.message)
    })

    return newTx
  },
}

// Automatically trigger background sync on store load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    DataStore.syncFromBackend()
  }, 100)
}
