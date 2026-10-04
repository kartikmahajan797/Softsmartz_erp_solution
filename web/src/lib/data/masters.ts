/**
 * Shared master data (mock). Mirrors architecture §10-11: tenant → company → GSTIN → plant,
 * parties, items with HSN / UoM / valuation, warehouses, work centres, operators.
 * Fictional company and parties.
 */

export const company = {
  tenantId: "t_01",
  name: "Shakti Precision Components Pvt Ltd",
  shortName: "Shakti Precision",
  gstin: "27AAKCS4821M1Z5",
  pan: "AAKCS4821M",
  state: "Maharashtra",
  stateCode: "27",
  plant: "Plant 1 · Bhosari MIDC, Pune",
  fiscalYear: "FY 2026-27",
  turnoverBand: "₹5-50 Cr",
  einvoiceApplicable: true,
  plan: "Growth",
  address: "Plot J-142, Bhosari MIDC, Pune, Maharashtra 411026",
};

export type PartyType = "customer" | "vendor" | "job_worker";

export interface Party {
  id: string;
  code: string;
  name: string;
  type: PartyType[];
  gstin: string;
  state: string;
  stateCode: string;
  city: string;
  contact: string;
  phone: string;
  creditLimit?: number;
  paymentTermsDays: number;
  outstanding: number;
  msme?: boolean;
}

export const parties: Party[] = [
  { id: "p1", code: "C-0001", name: "Deccan Motors Ltd", type: ["customer"], gstin: "27AABCD1234E1Z2", state: "Maharashtra", stateCode: "27", city: "Pune", contact: "Anil Joshi", phone: "+91 98220 11223", creditLimit: 2500000, paymentTermsDays: 45, outstanding: 1864200 },
  { id: "p2", code: "C-0002", name: "Sahyadri Tractors Pvt Ltd", type: ["customer"], gstin: "27AAECS7781K1Z9", state: "Maharashtra", stateCode: "27", city: "Kolhapur", contact: "Vikram Shinde", phone: "+91 97650 44120", creditLimit: 1500000, paymentTermsDays: 30, outstanding: 1412600 },
  { id: "p3", code: "C-0003", name: "Kaveri Engineering Works", type: ["customer"], gstin: "29AAFFK3321Q1Z4", state: "Karnataka", stateCode: "29", city: "Bengaluru", contact: "Ravi Gowda", phone: "+91 99001 77654", creditLimit: 1000000, paymentTermsDays: 30, outstanding: 486000 },
  { id: "p4", code: "C-0004", name: "Narmada Pumps & Valves", type: ["customer"], gstin: "24AAGFN5562P1Z1", state: "Gujarat", stateCode: "24", city: "Rajkot", contact: "Hitesh Patel", phone: "+91 98250 33410", creditLimit: 800000, paymentTermsDays: 30, outstanding: 0 },
  { id: "p5", code: "C-0005", name: "Varun Auto Components Ltd", type: ["customer"], gstin: "06AACCV9087L1Z3", state: "Haryana", stateCode: "06", city: "Gurugram", contact: "Sanjay Malik", phone: "+91 98110 66502", creditLimit: 3000000, paymentTermsDays: 60, outstanding: 2210450 },
  { id: "p6", code: "V-0001", name: "Mahalaxmi Steel Traders", type: ["vendor"], gstin: "27AAJFM4410D1Z6", state: "Maharashtra", stateCode: "27", city: "Pune", contact: "Kishor Bansal", phone: "+91 98230 55871", paymentTermsDays: 30, outstanding: 742300, msme: true },
  { id: "p7", code: "V-0002", name: "Bharat Bearings Co", type: ["vendor"], gstin: "27AACFB2219H1Z8", state: "Maharashtra", stateCode: "27", city: "Mumbai", contact: "Farhan Merchant", phone: "+91 98200 19943", paymentTermsDays: 45, outstanding: 186400 },
  { id: "p8", code: "V-0003", name: "Om Sai Packaging", type: ["vendor"], gstin: "27ABZPS6620N1Z2", state: "Maharashtra", stateCode: "27", city: "Chakan", contact: "Sachin Gaikwad", phone: "+91 97300 22781", paymentTermsDays: 15, outstanding: 38900, msme: true },
  { id: "p9", code: "J-0001", name: "Shree Ganesh Plating Works", type: ["job_worker", "vendor"], gstin: "27AAPFS1187C1Z5", state: "Maharashtra", stateCode: "27", city: "Bhosari", contact: "Ganesh Pawar", phone: "+91 98903 44512", paymentTermsDays: 30, outstanding: 64800, msme: true },
  { id: "p10", code: "J-0002", name: "Annapurna Heat Treatment", type: ["job_worker", "vendor"], gstin: "29AAKFA7754M1Z0", state: "Karnataka", stateCode: "29", city: "Belagavi", contact: "Prakash Hegde", phone: "+91 94480 61207", paymentTermsDays: 30, outstanding: 92500, msme: true },
  { id: "p11", code: "V-0004", name: "Precision Tools & Gauges", type: ["vendor"], gstin: "27AAHCP8812J1Z7", state: "Maharashtra", stateCode: "27", city: "Pune", contact: "Mahesh Kulkarni", phone: "+91 98221 90876", paymentTermsDays: 30, outstanding: 0 },
];

export type ItemType = "raw" | "wip" | "fg" | "consumable";

export interface Item {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  type: ItemType;
  category: string;
  uom: string;
  purchaseUom?: string;
  purchaseFactor?: number;
  hsn: string;
  gstRate: number;
  valuation: "FIFO" | "Weighted avg";
  batchTracked: boolean;
  reorderLevel: number;
  reorderQty: number;
  standardCost: number;
  salePrice?: number;
  onHand: number;
  reserved: number;
  avgCost: number;
}

export const items: Item[] = [
  { id: "i1", code: "RM-BAR-EN8-32", name: "MS Round Bar EN8 Ø32 mm", nameHi: "एमएस राउंड बार EN8 Ø32", type: "raw", category: "Steel bars", uom: "kg", purchaseUom: "tonne", purchaseFactor: 1000, hsn: "721420", gstRate: 18, valuation: "FIFO", batchTracked: true, reorderLevel: 1500, reorderQty: 3000, standardCost: 68, onHand: 1180, reserved: 640, avgCost: 69.4 },
  { id: "i2", code: "RM-SHT-CRCA-2", name: "CRCA Sheet 2 mm", nameHi: "सीआरसीए शीट 2 मिमी", type: "raw", category: "Steel sheets", uom: "kg", purchaseUom: "tonne", purchaseFactor: 1000, hsn: "720917", gstRate: 18, valuation: "FIFO", batchTracked: true, reorderLevel: 1000, reorderQty: 2000, standardCost: 72, onHand: 2840, reserved: 420, avgCost: 71.2 },
  { id: "i3", code: "BO-BRG-6204", name: "Bearing 6204-2RS", nameHi: "बेयरिंग 6204-2RS", type: "raw", category: "Bought-out", uom: "nos", hsn: "848210", gstRate: 18, valuation: "Weighted avg", batchTracked: false, reorderLevel: 400, reorderQty: 1000, standardCost: 58, onHand: 260, reserved: 300, avgCost: 57.6 },
  { id: "i4", code: "BO-BLT-M10-40", name: "Hex Bolt M10×40 (8.8)", nameHi: "हेक्स बोल्ट M10×40", type: "raw", category: "Fasteners", uom: "nos", purchaseUom: "box", purchaseFactor: 100, hsn: "731815", gstRate: 18, valuation: "Weighted avg", batchTracked: false, reorderLevel: 2000, reorderQty: 5000, standardCost: 6.2, onHand: 6400, reserved: 1200, avgCost: 6.1 },
  { id: "i5", code: "PK-BOX-L", name: "Corrugated Box 5-ply (L)", nameHi: "कार्टन बॉक्स 5-प्लाई (L)", type: "consumable", category: "Packaging", uom: "nos", hsn: "481910", gstRate: 18, valuation: "Weighted avg", batchTracked: false, reorderLevel: 300, reorderQty: 1000, standardCost: 42, onHand: 210, reserved: 0, avgCost: 41.5 },
  { id: "i6", code: "CN-OIL-CUT", name: "Soluble Cutting Oil", nameHi: "कटिंग ऑयल", type: "consumable", category: "Consumables", uom: "ltr", hsn: "271019", gstRate: 18, valuation: "Weighted avg", batchTracked: false, reorderLevel: 100, reorderQty: 210, standardCost: 165, onHand: 145, reserved: 0, avgCost: 162 },
  { id: "i7", code: "WIP-SHF-BLK", name: "Turned Shaft Blank", nameHi: "टर्न्ड शाफ्ट ब्लैंक", type: "wip", category: "Semi-finished", uom: "nos", hsn: "848310", gstRate: 18, valuation: "FIFO", batchTracked: true, reorderLevel: 0, reorderQty: 0, standardCost: 212, onHand: 340, reserved: 300, avgCost: 214.8 },
  { id: "i8", code: "WIP-BRK-PLT", name: "Plated Bracket (unpacked)", nameHi: "प्लेटेड ब्रैकेट", type: "wip", category: "Semi-finished", uom: "nos", hsn: "870899", gstRate: 28, valuation: "FIFO", batchTracked: true, reorderLevel: 0, reorderQty: 0, standardCost: 96, onHand: 0, reserved: 0, avgCost: 0 },
  { id: "i9", code: "FG-DS-450", name: "Drive Shaft DS-450", nameHi: "ड्राइव शाफ्ट DS-450", type: "fg", category: "Shafts", uom: "nos", hsn: "848310", gstRate: 18, valuation: "FIFO", batchTracked: true, reorderLevel: 0, reorderQty: 0, standardCost: 486, salePrice: 640, onHand: 420, reserved: 380, avgCost: 492.3 },
  { id: "i10", code: "FG-MB-220", name: "Mounting Bracket MB-220", nameHi: "माउंटिंग ब्रैकेट MB-220", type: "fg", category: "Brackets", uom: "nos", hsn: "870899", gstRate: 28, valuation: "FIFO", batchTracked: true, reorderLevel: 0, reorderQty: 0, standardCost: 138, salePrice: 185, onHand: 1250, reserved: 1000, avgCost: 141.6 },
  { id: "i11", code: "FG-PA-110", name: "Pulley Assembly PA-110", nameHi: "पुली असेंबली PA-110", type: "fg", category: "Assemblies", uom: "nos", hsn: "848350", gstRate: 18, valuation: "FIFO", batchTracked: true, reorderLevel: 0, reorderQty: 0, standardCost: 362, salePrice: 475, onHand: 96, reserved: 96, avgCost: 368.1 },
  { id: "i12", code: "FG-FC-75", name: "Flange Coupling FC-75", nameHi: "फ्लैंज कपलिंग FC-75", type: "fg", category: "Couplings", uom: "nos", hsn: "848360", gstRate: 18, valuation: "FIFO", batchTracked: true, reorderLevel: 0, reorderQty: 0, standardCost: 228, salePrice: 310, onHand: 540, reserved: 0, avgCost: 226.9 },
  { id: "i13", code: "RM-CST-PUL", name: "Pulley Casting CI (raw)", nameHi: "पुली कास्टिंग (कच्चा)", type: "raw", category: "Castings", uom: "nos", hsn: "732510", gstRate: 18, valuation: "FIFO", batchTracked: true, reorderLevel: 200, reorderQty: 500, standardCost: 145, onHand: 88, reserved: 120, avgCost: 147.2 },
];

export const warehouses = [
  { id: "w1", code: "RMS", name: "Raw Material Stores", type: "stores" },
  { id: "w2", code: "WIP", name: "Shop Floor WIP", type: "wip" },
  { id: "w3", code: "FGS", name: "Finished Goods Stores", type: "stores" },
  { id: "w4", code: "QCH", name: "QC Hold", type: "hold" },
  { id: "w5", code: "SCR", name: "Scrap Yard", type: "scrap" },
  { id: "w6", code: "JW-SGP", name: "JW: Shree Ganesh Plating", type: "jobwork" },
  { id: "w7", code: "JW-AHT", name: "JW: Annapurna Heat Treatment", type: "jobwork" },
];

export type WcStatus = "running" | "idle" | "down";

export interface WorkCentre {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  type: string;
  status: WcStatus;
  currentJob?: string;
  operator?: string;
  labourRate: number;
  overheadRate: number;
  utilisationToday: number;
  downReason?: string;
}

export const workCentres: WorkCentre[] = [
  { id: "wc1", code: "CNC-L01", name: "CNC Lathe 01", nameHi: "सीएनसी लेथ 01", type: "Turning", status: "running", currentJob: "JC-2026-00412", operator: "Ramesh Yadav", labourRate: 180, overheadRate: 420, utilisationToday: 78 },
  { id: "wc2", code: "CNC-L02", name: "CNC Lathe 02", nameHi: "सीएनसी लेथ 02", type: "Turning", status: "running", currentJob: "JC-2026-00415", operator: "Imran Shaikh", labourRate: 180, overheadRate: 420, utilisationToday: 71 },
  { id: "wc3", code: "VMC-01", name: "VMC 01", nameHi: "वीएमसी 01", type: "Milling", status: "down", downReason: "Spindle alarm — maintenance called", labourRate: 200, overheadRate: 560, utilisationToday: 34 },
  { id: "wc4", code: "PRS-100", name: "Power Press 100T", nameHi: "पावर प्रेस 100T", type: "Pressing", status: "running", currentJob: "JC-2026-00418", operator: "Vijay Kumar", labourRate: 150, overheadRate: 300, utilisationToday: 82 },
  { id: "wc5", code: "WLD-B1", name: "Welding Bay 1", nameHi: "वेल्डिंग बे 1", type: "Welding", status: "idle", labourRate: 170, overheadRate: 220, utilisationToday: 45 },
  { id: "wc6", code: "DRL-01", name: "Radial Drill", nameHi: "रेडियल ड्रिल", type: "Drilling", status: "running", currentJob: "JC-2026-00420", operator: "Anita Jadhav", labourRate: 140, overheadRate: 160, utilisationToday: 66 },
  { id: "wc7", code: "INS-PK", name: "Inspection & Packing", nameHi: "निरीक्षण और पैकिंग", type: "Inspection", status: "idle", labourRate: 130, overheadRate: 90, utilisationToday: 52 },
];

export interface Operator {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  labourRate: number;
  workCentres: string[];
  shift: "A" | "B";
  pin: string; // demo only — real system stores a hash (arch §17)
}

export const operators: Operator[] = [
  { id: "o1", code: "OP-101", name: "Ramesh Yadav", nameHi: "रमेश यादव", labourRate: 185, workCentres: ["wc1", "wc2"], shift: "A", pin: "1234" },
  { id: "o2", code: "OP-102", name: "Suresh Patil", nameHi: "सुरेश पाटिल", labourRate: 175, workCentres: ["wc1", "wc6"], shift: "A", pin: "2345" },
  { id: "o3", code: "OP-103", name: "Anita Jadhav", nameHi: "अनीता जाधव", labourRate: 160, workCentres: ["wc6", "wc7"], shift: "A", pin: "3456" },
  { id: "o4", code: "OP-104", name: "Imran Shaikh", nameHi: "इमरान शेख", labourRate: 185, workCentres: ["wc2", "wc3"], shift: "A", pin: "4567" },
  { id: "o5", code: "OP-105", name: "Vijay Kumar", nameHi: "विजय कुमार", labourRate: 150, workCentres: ["wc4", "wc5"], shift: "A", pin: "5678" },
  { id: "o6", code: "OP-106", name: "Sunita More", nameHi: "सुनीता मोरे", labourRate: 130, workCentres: ["wc7"], shift: "B", pin: "6789" },
];

export const reasonCodes = [
  { code: "DIM", name: "Dimension out of tolerance", nameHi: "माप गलत", icon: "ruler", kind: "reject" },
  { code: "SUR", name: "Surface defect / burr", nameHi: "सतह दोष", icon: "scan", kind: "reject" },
  { code: "MAT", name: "Material defect", nameHi: "सामग्री दोष", icon: "package-x", kind: "reject" },
  { code: "SET", name: "Setup piece", nameHi: "सेटअप पीस", icon: "settings", kind: "reject" },
  { code: "TOOL", name: "Tool breakage", nameHi: "टूल टूटा", icon: "wrench", kind: "reject" },
  { code: "PWR", name: "Power cut", nameHi: "बिजली कटौती", icon: "zap-off", kind: "pause" },
  { code: "MNT", name: "Machine breakdown", nameHi: "मशीन खराब", icon: "triangle-alert", kind: "pause" },
  { code: "MAT-W", name: "Waiting for material", nameHi: "माल का इंतज़ार", icon: "package", kind: "pause" },
  { code: "BRK", name: "Tea / meal break", nameHi: "चाय / भोजन", icon: "coffee", kind: "pause" },
] as const;

export const shifts = [
  { code: "A", name: "Shift A", start: "07:00", end: "15:30" },
  { code: "B", name: "Shift B", start: "15:30", end: "00:00" },
];

export const itemById = (id: string) => items.find((i) => i.id === id)!;
export const partyById = (id: string) => parties.find((p) => p.id === id)!;
export const wcById = (id: string) => workCentres.find((w) => w.id === id)!;
export const whById = (id: string) => warehouses.find((w) => w.id === id)!;
