export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  active: boolean;
}

export interface CustomerDocument {
  id: string;
  name: string;
  category: string; // 'Aadhaar' | 'PAN' | 'Land Records' | 'Bank Documents' | 'Quotation' | 'Estimate' | 'DPR' | 'Sanction Letter' | 'GOC' | 'Warranty' | 'Completion Certificate' | 'Other'
  fileUrl: string; // Base64 or object URL or simulated link
  uploadedAt: string;
}

export interface CustomerInteraction {
  id: string;
  date: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Site Visit' | 'Other';
  notes: string;
  agentName?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  village?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  projectType?: string; // 'Polyhouse' | 'Flat Shade Net House' | 'Domb Shape Shade Net House' | 'Hydroponics' | 'Mushroom Chambers' | 'Other'
  area?: string; // e.g. '2 Acres'
  crop?: string;
  status: string; // 'Lead' | 'Active' | 'Completed' | 'Pending'
  projectValue?: number;
  loanPercentage?: number;
  marginPercentage?: number;
  loanAmount?: number;
  marginAmount?: number;
  nhbSubsidyEligible?: boolean;
  subsidyAmount?: number;
  notes?: string;
  documents: CustomerDocument[];
  interactions?: CustomerInteraction[];
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  source: string; // 'Referral' | 'Social Media' | 'Exhibition' | 'Direct Visit' | 'Other'
  date: string;
  meetingDate?: string;
  meetingNotes?: string;
  product: string;
  budget?: number;
  expectedClosingDate?: string;
  followUpDate?: string;
  status: 'New' | 'Interested' | 'Follow-up' | 'Won' | 'Lost';
  rejectionReason?: string;
  address?: string;
  village?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  area?: string;
  crop?: string;
  createdAt: string;
}

export interface ProjectStage {
  name: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  date?: string;
  remarks?: string;
  percentage: number;
}

export interface Project {
  id: string;
  customerId: string;
  customerName: string;
  projectName: string;
  currentStage: string;
  stages: { [stageName: string]: ProjectStage };
  startDate?: string;
  endDate?: string;
  totalValue: number;
  areaCovered?: number; // in Acres/sqm
  createdAt: string;
}

export interface WorkLogMaterial {
  productId: string;
  name: string;
  qty: number;
  unit: string;
}

export interface WorkLog {
  id: string;
  projectId: string;
  date: string;
  workCompleted: string;
  pendingWork?: string;
  materialUsed: WorkLogMaterial[];
  expectedCompletionDate?: string;
  remarks?: string;
  createdAt: string;
}

export interface PurchaseHistoryItem {
  date: string;
  qty: number;
  price: number;
  supplier: string;
}

export interface ConsumptionItem {
  date: string;
  projectId: string;
  qty: number;
  remarks: string;
}

export interface InventoryItem {
  id: string;
  productName: string;
  category: string; // 'Irrigation' | 'Structure' | 'Automation' | 'Electrical' | 'Solar' | 'Other'
  supplier?: string;
  unit: string; // 'Pcs' | 'Meters' | 'Kg' | 'Nos' | 'Liters'
  purchasePrice: number;
  sellingPrice: number;
  availableQty: number;
  minStockLevel: number;
  purchaseHistory: PurchaseHistoryItem[];
  consumption: ConsumptionItem[];
  createdAt: string;
}

export interface FinanceItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface FinanceRecord {
  id: string;
  type: 'Quotation' | 'Estimate' | 'Invoice' | 'Expense' | 'PaymentReceived';
  number: string; // e.g., 'QT-2026-001'
  customerId?: string;
  projectId?: string;
  customerName?: string;
  date: string;
  amount: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Paid' | 'Pending' | 'Void' | 'Cleared';
  items?: FinanceItem[];
  remarks?: string;
  createdAt: string;
}

export interface SupportHistoryItem {
  date: string;
  notes: string;
  status: 'Registered' | 'In Progress' | 'Resolved';
}

export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  complaintNumber: string; // 'CP-2026-001'
  complaint: string;
  status: 'Registered' | 'In Progress' | 'Resolved';
  visitDate?: string;
  resolutionNotes?: string;
  history: SupportHistoryItem[];
  warrantyStatus: string; // 'Active' | 'Expired' | 'N/A'
  amcDetails?: string;
  feedback?: string;
  createdAt: string;
}

export interface AgronomyVisit {
  id: string;
  customerId: string;
  customerName: string;
  visitDate: string;
  cropName: string;
  observation: string;
  diseaseDetails?: string;
  recommendations: string;
  nextVisitDate?: string;
  remarks?: string;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  gstNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  defaultPdfFooter?: string;
  themeColor?: string;
}
