import { collection, doc, setDoc, getDocs, writeBatch, query, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Customer, Lead, Project, WorkLog, InventoryItem, FinanceRecord, SupportTicket, AgronomyVisit, CompanySettings } from '../types';

const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: "CUST-001",
    name: "Rajesh Kumar",
    phone: "9876543210",
    whatsapp: "9876543210",
    email: "rajesh.kumar@gmail.com",
    address: "House 45, Ward 3",
    village: "Rampur",
    district: "Patna",
    state: "Bihar",
    pinCode: "800001",
    projectType: "Polyhouse",
    area: "1 Acre",
    crop: "Cherry Tomato",
    status: "Active",
    projectValue: 850000,
    notes: "Requires automation in irrigation setup.",
    documents: [
      { id: "doc-1", name: "Aadhaar Card", category: "Aadhaar", fileUrl: "data:text/plain;base64,U0FNUExFIEFBREhBQVI=", uploadedAt: "2026-06-10" },
      { id: "doc-2", name: "Land Possession Certificate", category: "Land Records", fileUrl: "data:text/plain;base64,U0FNUExFIExBTkQgRE9DVU1FTlQ=", uploadedAt: "2026-06-12" }
    ],
    createdAt: "2026-06-10"
  },
  {
    id: "CUST-002",
    name: "Anil Deshmukh",
    phone: "9123456789",
    whatsapp: "9123456789",
    email: "anil.desh@yahoo.com",
    address: "Gat No. 124",
    village: "Koregaon",
    district: "Satara",
    state: "Maharashtra",
    pinCode: "415001",
    projectType: "Flat Shade Net House",
    area: "2.5 Acres",
    crop: "Sugarcane",
    status: "Active",
    projectValue: 1200000,
    notes: "Subsidy application is pending at bank.",
    documents: [
      { id: "doc-3", name: "PAN Card", category: "PAN", fileUrl: "data:text/plain;base64,U0FNUExFIFBBTiBDQVJE", uploadedAt: "2026-06-15" }
    ],
    createdAt: "2026-06-15"
  },
  {
    id: "CUST-003",
    name: "Sandeep Singh",
    phone: "9812345670",
    whatsapp: "9812345670",
    email: "sandeep.singh@gamil.com",
    address: "Village Plot 89",
    village: "Ajnala",
    district: "Amritsar",
    state: "Punjab",
    pinCode: "143102",
    projectType: "Hydroponics",
    area: "5 Acres",
    crop: "Wheat & Paddy",
    status: "Completed",
    projectValue: 450000,
    notes: "Successful handover. System fully operational.",
    documents: [
      { id: "doc-4", name: "Warranty Certificate", category: "Warranty", fileUrl: "data:text/plain;base64,U0FNUExFIFdBUlJBTlRZ", uploadedAt: "2026-06-25" }
    ],
    createdAt: "2026-06-05"
  }
];

const SAMPLE_LEADS: Lead[] = [
  {
    id: "LEAD-001",
    name: "Vijay Patil",
    phone: "8888899999",
    whatsapp: "8888899999",
    email: "vijay.patil@outlook.com",
    source: "Referral",
    date: "2026-06-28",
    meetingDate: "2026-07-02",
    meetingNotes: "Met at local agricultural show. Highly interested in standard Polyhouse setup for strawberry cultivation.",
    product: "Polyhouse",
    budget: 900000,
    expectedClosingDate: "2026-07-15",
    followUpDate: "2026-07-06",
    status: "Follow-up",
    address: "Block B-12, Near Temple",
    village: "Narayangaon",
    district: "Pune",
    state: "Maharashtra",
    pinCode: "410504",
    area: "1.5 Acres",
    crop: "Strawberry",
    createdAt: "2026-06-28"
  },
  {
    id: "LEAD-002",
    name: "Gurpreet Singh",
    phone: "7777766666",
    whatsapp: "7777766666",
    email: "gurpreet.pb@gmail.com",
    source: "Social Media",
    date: "2026-07-01",
    meetingDate: "2026-07-04",
    meetingNotes: "Discussed solar pumps options. Wants high volume water discharge system.",
    product: "Flat Shade Net House",
    budget: 650000,
    expectedClosingDate: "2026-07-20",
    followUpDate: "2026-07-07",
    status: "New",
    address: "Gat 45, Farm Road",
    village: "Rurka Kalan",
    district: "Jalandhar",
    state: "Punjab",
    pinCode: "144031",
    area: "3 Acres",
    crop: "Bell Pepper / Capsicum",
    createdAt: "2026-07-01"
  },
  {
    id: "LEAD-003",
    name: "Karan Johar",
    phone: "9999911111",
    whatsapp: "9999911111",
    email: "karan.agri@gmail.com",
    source: "Direct Visit",
    date: "2026-06-20",
    meetingDate: "2026-06-22",
    meetingNotes: "Requires massive irrigation setup for grapes orchard, but budget is too low.",
    product: "Mushroom Chambers",
    budget: 200000,
    expectedClosingDate: "2026-06-25",
    status: "Lost",
    rejectionReason: "Budget too low for advanced drip automation.",
    address: "Plot 104, National Highway 9",
    village: "Shahabad",
    district: "Kurukshetra",
    state: "Haryana",
    pinCode: "136135",
    area: "0.5 Acres",
    crop: "Button Mushroom",
    createdAt: "2026-06-20"
  }
];

const STAGES_LIST = [
  "Lead", "Documentation", "Quotation", "Estimate", "Bank Application", "Sanction Letter",
  "GOC Application", "GOC Approval", "Material Dispatch", "Site Survey", "Engineering Design",
  "Civil Foundation", "Structure Installation", "Plastic Installation", "Irrigation Setup",
  "Automation", "Quality Check", "Project Handover", "Subsidy Documentation", "Completed"
];

function generateStages(activeStageIndex: number) {
  const stages: { [key: string]: any } = {};
  STAGES_LIST.forEach((stage, index) => {
    let status: 'Pending' | 'In Progress' | 'Completed' = 'Pending';
    let percentage = 0;
    if (index < activeStageIndex) {
      status = 'Completed';
      percentage = 100;
    } else if (index === activeStageIndex) {
      status = 'In Progress';
      percentage = 50;
    }
    stages[stage] = {
      name: stage,
      status,
      date: status !== 'Pending' ? "2026-06-" + (10 + index) : undefined,
      remarks: status === 'Completed' ? "Completed smoothly" : status === 'In Progress' ? "Active stage work ongoing" : undefined,
      percentage
    };
  });
  return stages;
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: "PROJ-001",
    customerId: "CUST-001",
    customerName: "Rajesh Kumar",
    projectName: "Rampur Polyhouse Tomato Project",
    currentStage: "Structure Installation",
    stages: generateStages(12), // index 12 is Structure Installation
    startDate: "2026-06-15",
    totalValue: 850000,
    areaCovered: 1.0,
    createdAt: "2026-06-15"
  },
  {
    id: "PROJ-002",
    customerId: "CUST-002",
    customerName: "Anil Deshmukh",
    projectName: "Koregaon Solar Sugarcane Project",
    currentStage: "Bank Application",
    stages: generateStages(4), // index 4 is Bank Application
    startDate: "2026-06-20",
    totalValue: 1200000,
    areaCovered: 2.5,
    createdAt: "2026-06-20"
  },
  {
    id: "PROJ-003",
    customerId: "CUST-003",
    customerName: "Sandeep Singh",
    projectName: "Ajnala Drip Wheat Irrigation",
    currentStage: "Completed",
    stages: generateStages(19), // index 19 is Completed
    startDate: "2026-06-05",
    endDate: "2026-06-30",
    totalValue: 450000,
    areaCovered: 5.0,
    createdAt: "2026-06-05"
  }
];

const SAMPLE_WORKLOGS: WorkLog[] = [
  {
    id: "LOG-001",
    projectId: "PROJ-001",
    date: "2026-07-04",
    workCompleted: "Completed foundation layout and primary steel pillars erection.",
    pendingWork: "Structure bracing and top roof truss installation.",
    materialUsed: [
      { productId: "INV-002", name: "Steel Girders", qty: 25, unit: "Pcs" }
    ],
    expectedCompletionDate: "2026-07-10",
    remarks: "Work was slightly delayed due to strong wind in Rampur.",
    createdAt: "2026-07-04"
  },
  {
    id: "LOG-002",
    projectId: "PROJ-001",
    date: "2026-07-05",
    workCompleted: "Installed roof structure cross bars and side ventilation channels.",
    pendingWork: "Plastic cladding and anti-insect netting.",
    materialUsed: [
      { productId: "INV-002", name: "Steel Girders", qty: 10, unit: "Pcs" }
    ],
    expectedCompletionDate: "2026-07-10",
    remarks: "Progressing well today.",
    createdAt: "2026-07-05"
  }
];

const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: "INV-001",
    productName: "Drip Lateral 16mm",
    category: "Irrigation",
    supplier: "Finolex Plasson Ltd",
    unit: "Meters",
    purchasePrice: 12,
    sellingPrice: 18,
    availableQty: 4000,
    minStockLevel: 1000,
    purchaseHistory: [
      { date: "2026-05-15", qty: 5000, price: 12, supplier: "Finolex Plasson Ltd" }
    ],
    consumption: [
      { date: "2026-06-08", projectId: "PROJ-003", qty: 1000, remarks: "Ajnala installation" }
    ],
    createdAt: "2026-05-15"
  },
  {
    id: "INV-002",
    productName: "Steel Girders Hot-Dip Galvanized",
    category: "Structure",
    supplier: "Tata Structura",
    unit: "Pcs",
    purchasePrice: 1500,
    sellingPrice: 2200,
    availableQty: 8, // Low Stock! Alert should show
    minStockLevel: 20,
    purchaseHistory: [
      { date: "2026-05-20", qty: 100, price: 1500, supplier: "Tata Structura" }
    ],
    consumption: [
      { date: "2026-07-04", projectId: "PROJ-001", qty: 25, remarks: "Primary structure work Rampur" },
      { date: "2026-07-05", projectId: "PROJ-001", qty: 10, remarks: "Cross structure work Rampur" }
    ],
    createdAt: "2026-05-20"
  },
  {
    id: "INV-003",
    productName: "200 Micron UV Poly Film",
    category: "Structure",
    supplier: "Ginegar Plastics",
    unit: "Meters",
    purchasePrice: 85,
    sellingPrice: 120,
    availableQty: 2500,
    minStockLevel: 500,
    purchaseHistory: [
      { date: "2026-05-25", qty: 3000, price: 85, supplier: "Ginegar Plastics" }
    ],
    consumption: [],
    createdAt: "2026-05-25"
  },
  {
    id: "INV-004",
    productName: "EC & pH Irrigation Automation Controller",
    category: "Automation",
    supplier: "Netafim India",
    unit: "Nos",
    purchasePrice: 35000,
    sellingPrice: 55000,
    availableQty: 2, // Low Stock Alert
    minStockLevel: 3,
    purchaseHistory: [
      { date: "2026-06-01", qty: 5, price: 35000, supplier: "Netafim India" }
    ],
    consumption: [
      { date: "2026-06-28", projectId: "PROJ-003", qty: 1, remarks: "Sandeep automation setup" }
    ],
    createdAt: "2026-06-01"
  }
];

const SAMPLE_FINANCE: FinanceRecord[] = [
  {
    id: "FIN-001",
    type: "Quotation",
    number: "QT-2026-001",
    customerId: "CUST-001",
    projectId: "PROJ-001",
    customerName: "Rajesh Kumar",
    date: "2026-06-12",
    amount: 850000,
    status: "Approved",
    items: [
      { description: "GI Structure Framework with Clamping Materials", qty: 1, unitPrice: 480000, total: 480000 },
      { description: "200 Micron Poly Cladding & Insect Nets", qty: 1, unitPrice: 150000, total: 150000 },
      { description: "Automated Drip Irrigation and Fertigation System", qty: 1, unitPrice: 120000, total: 120000 },
      { description: "Civil Work, Grouting, and Foundation", qty: 1, unitPrice: 100000, total: 100000 }
    ],
    remarks: "Quotation accepted with 10% advance payment.",
    createdAt: "2026-06-12"
  },
  {
    id: "FIN-002",
    type: "Invoice",
    number: "INV-2026-001",
    customerId: "CUST-001",
    projectId: "PROJ-001",
    customerName: "Rajesh Kumar",
    date: "2026-06-16",
    amount: 250000,
    status: "Paid",
    items: [
      { description: "Stage 1 Advance - Material Procurement Call", qty: 1, unitPrice: 250000, total: 250000 }
    ],
    remarks: "Received through IMPS bank transfer.",
    createdAt: "2026-06-16"
  },
  {
    id: "FIN-003",
    type: "PaymentReceived",
    number: "PAY-2026-001",
    customerId: "CUST-001",
    projectId: "PROJ-001",
    customerName: "Rajesh Kumar",
    date: "2026-06-16",
    amount: 250000,
    status: "Cleared",
    remarks: "Advance payment confirmed against Stage-1 invoice.",
    createdAt: "2026-06-16"
  },
  {
    id: "FIN-004",
    type: "Expense",
    number: "EXP-2026-001",
    projectId: "PROJ-001",
    date: "2026-06-25",
    amount: 85000,
    status: "Paid",
    remarks: "Local sand, cement procurement and foundations digging labor charges.",
    createdAt: "2026-06-25"
  },
  {
    id: "FIN-005",
    type: "Expense",
    number: "EXP-2026-002",
    projectId: "PROJ-001",
    date: "2026-06-28",
    amount: 140000,
    status: "Paid",
    remarks: "Steel material dispatch logistics and freight cost.",
    createdAt: "2026-06-28"
  }
];

const SAMPLE_SUPPORT: SupportTicket[] = [
  {
    id: "SUP-001",
    customerId: "CUST-003",
    customerName: "Sandeep Singh",
    complaintNumber: "CP-2026-001",
    complaint: "Drip lateral pressure drops at row 14-18, crop water supply uneven.",
    status: "Resolved",
    visitDate: "2026-07-03",
    resolutionNotes: "Discovered sand blockage in manual flush valve. Flushed entire lateral array, fully restored optimal pressure.",
    history: [
      { date: "2026-07-02", notes: "Complaint registered by Sandeep via WhatsApp.", status: "Registered" },
      { date: "2026-07-03", notes: "Technician visited site, identified choke point, performed lateral flush.", status: "Resolved" }
    ],
    warrantyStatus: "Active",
    amcDetails: "Under 1st Year Free AMC Services",
    feedback: "Extremely fast response time, fully satisfied with technician's work.",
    createdAt: "2026-07-02"
  }
];

const SAMPLE_AGRONOMY: AgronomyVisit[] = [
  {
    id: "AGR-001",
    customerId: "CUST-001",
    customerName: "Rajesh Kumar",
    visitDate: "2026-06-24",
    cropName: "Cherry Tomato",
    observation: "Excellent vegetative growth. Noticed minor whitefly infestation on yellow sticky traps at south ventilators.",
    diseaseDetails: "Whitefly (early stage)",
    recommendations: "Spray Neem oil (1500ppm) at 5ml/liter of water. Keep insect-proof net gates tightly closed.",
    nextVisitDate: "2026-07-08",
    remarks: "First agronomist audit after seed planting.",
    createdAt: "2026-06-24"
  }
];

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Hydrogreen Energy Pvt. Ltd.",
  logoUrl: "",
  gstNumber: "27AAACH4389B1ZX",
  address: "Plot 12, Energy Park, MIDC, Pune, Maharashtra",
  phone: "+91 20 4455 6677",
  email: "operations@hydrogreenenergy.in",
  website: "https://www.hydrogreenenergy.in",
  bankName: "State Bank of India",
  bankAccountNo: "38927493201",
  bankIfsc: "SBIN0004561",
  bankBranch: "Koregaon Branch, Pune",
  defaultPdfFooter: "Thank you for partnering with Hydrogreen Energy! Let's power green farming.",
  themeColor: "#059669" // Emerald Green representing green energy
};

export async function seedFirestoreIfEmpty() {
  try {
    const checkQuery = query(collection(db, "customers"), limit(1));
    const querySnapshot = await getDocs(checkQuery);
    
    if (querySnapshot.empty) {
      console.log("Firestore empty. Seeding initial data for Hydrogreen Energy CRM...");

      // Write settings
      await setDoc(doc(db, "settings", "default"), DEFAULT_SETTINGS);

      // Seed customers
      for (const cust of SAMPLE_CUSTOMERS) {
        await setDoc(doc(db, "customers", cust.id), cust);
      }

      // Seed leads
      for (const lead of SAMPLE_LEADS) {
        await setDoc(doc(db, "leads", lead.id), lead);
      }

      // Seed projects
      for (const proj of SAMPLE_PROJECTS) {
        await setDoc(doc(db, "projects", proj.id), proj);
      }

      // Seed worklogs
      for (const log of SAMPLE_WORKLOGS) {
        await setDoc(doc(db, "worklogs", log.id), log);
      }

      // Seed inventory
      for (const item of SAMPLE_INVENTORY) {
        await setDoc(doc(db, "inventory", item.id), item);
      }

      // Seed finance
      for (const record of SAMPLE_FINANCE) {
        await setDoc(doc(db, "finance", record.id), record);
      }

      // Seed support
      for (const ticket of SAMPLE_SUPPORT) {
        await setDoc(doc(db, "support", ticket.id), ticket);
      }

      // Seed agronomy
      for (const visit of SAMPLE_AGRONOMY) {
        await setDoc(doc(db, "agronomy", visit.id), visit);
      }

      console.log("Firestore seeding completed successfully.");
    } else {
      console.log("Firestore already populated, skipping seeding.");
    }
  } catch (error) {
    console.error("Error seeding Firestore:", error);
    handleFirestoreError(error, OperationType.WRITE, "seeding");
  }
}
