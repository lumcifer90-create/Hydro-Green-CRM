import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, cleanUndefined } from './firebase';
import { seedFirestoreIfEmpty } from './utils/seeder';
import { 
  Customer, Lead, Project, WorkLog, InventoryItem, 
  FinanceRecord, SupportTicket, AgronomyVisit, CompanySettings, UserProfile 
} from './types';
import {
  generateExecutiveSummaryPDF,
  generateHandoverPDF,
  generateFinancialPDF,
  generateInventoryPDF,
  generateSystemSnapshotPDF
} from './utils/pdfGenerator';

// Icons for placeholders / additional sections
import { 
  FileText, ShieldAlert, Sprout, BarChart3, Database, 
  Settings as SettingsIcon, AlertCircle, Plus, Search, Trash2, CheckCircle, Clock,
  Command, Keyboard, X, Sparkles, AlertTriangle, BookOpen, User, Briefcase, IndianRupee, HelpCircle,
  Info, Sun, Moon, Lock
} from 'lucide-react';

// Core Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import LeadManagement from './components/LeadManagement';
import ProjectWorkflow from './components/ProjectWorkflow';
import WorkLogs from './components/WorkLogs';
import InventoryManagement from './components/InventoryManagement';
import FinanceModule from './components/FinanceModule';
import AgronomyManagement from './components/AgronomyManagement';
import AuthManagement from './components/AuthManagement';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Firestore collections state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [worklogs, setWorklogs] = useState<WorkLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [finance, setFinance] = useState<FinanceRecord[]>([]);
  const [support, setSupport] = useState<SupportTicket[]>([]);
  const [agronomy, setAgronomy] = useState<AgronomyVisit[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [selectedHandoverProjId, setSelectedHandoverProjId] = useState('');

  const [loading, setLoading] = useState(true);

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Intercept window.alert dynamically to route alerts to our beautiful toast system
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message: string) => {
      let type: 'success' | 'error' | 'info' = 'success';
      const msgLower = message.toLowerCase();
      if (msgLower.includes('fail') || msgLower.includes('error') || msgLower.includes('block') || msgLower.includes('locked')) {
        type = 'error';
      } else if (msgLower.includes('warn') || msgLower.includes('sure') || msgLower.includes('attention') || msgLower.includes('sync')) {
        type = 'info';
      }
      showToast(message, type);
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // Command Palette / Quick Action states
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteSearch, setCommandPaletteSearch] = useState('');
  const [commandPaletteIndex, setCommandPaletteIndex] = useState(0);

  // Global hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
        setCommandPaletteSearch('');
        setCommandPaletteIndex(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Local Session initialization
  useEffect(() => {
    const savedUser = localStorage.getItem('hydrogreen_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to restore saved session:", err);
        localStorage.removeItem('hydrogreen_user');
      }
    }
    setAuthChecking(false);
  }, []);

  // 2. Real-time listeners gated by auth and including handleFirestoreError
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const initAndListen = async () => {
      if (!currentUser) return;

      setLoading(true);

      const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
        const data: Customer[] = [];
        snapshot.forEach((doc) => data.push(doc.data() as Customer));
        setCustomers(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'customers');
      });
      unsubs.push(unsubCustomers);

      const unsubLeads = onSnapshot(collection(db, 'leads'), (snapshot) => {
        const data: Lead[] = [];
        snapshot.forEach((doc) => data.push(doc.data() as Lead));
        setLeads(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'leads');
      });
      unsubs.push(unsubLeads);

      const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
        const data: Project[] = [];
        snapshot.forEach((doc) => data.push(doc.data() as Project));
        setProjects(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'projects');
      });
      unsubs.push(unsubProjects);

      const unsubWorkLogs = onSnapshot(collection(db, 'worklogs'), (snapshot) => {
        const data: WorkLog[] = [];
        snapshot.forEach((doc) => data.push(doc.data() as WorkLog));
        setWorklogs(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'worklogs');
      });
      unsubs.push(unsubWorkLogs);

      const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
        const data: InventoryItem[] = [];
        snapshot.forEach((doc) => data.push(doc.data() as InventoryItem));
        setInventory(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'inventory');
      });
      unsubs.push(unsubInventory);

      const unsubFinance = onSnapshot(collection(db, 'finance'), (snapshot) => {
        const data: FinanceRecord[] = [];
        snapshot.forEach((doc) => data.push(doc.data() as FinanceRecord));
        setFinance(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'finance');
      });
      unsubs.push(unsubFinance);

      const unsubSupport = onSnapshot(collection(db, 'support'), (snapshot) => {
        const data: SupportTicket[] = [];
        snapshot.forEach((doc) => data.push(doc.data() as SupportTicket));
        setSupport(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'support');
      });
      unsubs.push(unsubSupport);

      const unsubAgronomy = onSnapshot(collection(db, 'agronomy'), (snapshot) => {
        const data: AgronomyVisit[] = [];
        snapshot.forEach((doc) => data.push(doc.data() as AgronomyVisit));
        setAgronomy(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'agronomy');
      });
      unsubs.push(unsubAgronomy);

      const unsubSettings = onSnapshot(doc(db, 'settings', 'default'), (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as CompanySettings);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/default');
      });
      unsubs.push(unsubSettings);

      setLoading(false);
    };

    if (currentUser) {
      initAndListen();
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentUser]);

  const handleRefresh = () => {
    console.log("Real-time data synced cleanly.");
  };

  // Support Complaint Tickets Form State
  const [isSupOpen, setIsSupOpen] = useState(false);
  const [supCustId, setSupCustId] = useState('');
  const [supComplaint, setSupComplaint] = useState('');
  const [supWarranty, setSupWarranty] = useState('Active');

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supCustId || !supComplaint) return;
    const cust = customers.find(c => c.id === supCustId);
    if (!cust) return;

    const tId = 'SUP-' + Math.floor(100 + Math.random() * 900);
    const newTicket: SupportTicket = {
      id: tId,
      customerId: supCustId,
      customerName: cust.name,
      complaintNumber: 'CP-2026-' + Math.floor(100 + Math.random() * 900),
      complaint: supComplaint,
      status: 'Registered',
      history: [{
        date: new Date().toISOString().split('T')[0],
        notes: 'Ticket registered into service system.',
        status: 'Registered'
      }],
      warrantyStatus: supWarranty,
      createdAt: new Date().toISOString().split('T')[0]
    };

    await setDoc(doc(db, 'support', tId), newTicket);
    setIsSupOpen(false);
    setSupComplaint('');
  };

  const handleUpdateTicketStatus = async (ticket: SupportTicket, newStatus: 'In Progress' | 'Resolved', notes: string) => {
    const updatedHistory = [...ticket.history, {
      date: new Date().toISOString().split('T')[0],
      notes: notes || `Status changed to ${newStatus}`,
      status: newStatus
    }];

    await updateDoc(doc(db, 'support', ticket.id), cleanUndefined({
      status: newStatus,
      resolutionNotes: newStatus === 'Resolved' ? notes : undefined,
      history: updatedHistory
    }));
  };

  // Agronomist Visits Action Handler
  const handleAddAgronomyVisit = async (visitData: Omit<AgronomyVisit, 'id' | 'createdAt'>) => {
    const vId = 'AGR-' + Math.floor(100 + Math.random() * 900);
    const newVisit: AgronomyVisit = {
      id: vId,
      ...visitData,
      createdAt: new Date().toISOString().split('T')[0]
    };
    await setDoc(doc(db, 'agronomy', vId), cleanUndefined(newVisit));
    showToast('Agronomy field advisory logged successfully', 'success');
  };

  // Company Settings Form State
  const [gst, setGst] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  useEffect(() => {
    if (settings) {
      setGst(settings.gstNumber || '');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setBank(settings.bankName || '');
      setAccount(settings.bankAccountNo || '');
      setIfsc(settings.bankIfsc || '');
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: CompanySettings = {
      companyName: "Hydrogreen Energy Pvt. Ltd.",
      gstNumber: gst,
      address,
      phone,
      email,
      bankName: bank,
      bankAccountNo: account,
      bankIfsc: ifsc,
      themeColor: "#059669"
    };
    await setDoc(doc(db, 'settings', 'default'), updatedSettings);
    alert("Company settings updated successfully in Firestore!");
  };

  // Compile all customer documents for a unified global document explorer
  const allGlobalDocuments = customers.flatMap(cust => 
    (cust.documents || []).map(docItem => ({
      ...docItem,
      customerId: cust.id,
      customerName: cust.name
    }))
  );

  if (authChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">
        🔄 Initializing Hydrogreen CRM Secure Shell...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Sprout className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Hydrogreen CRM</h2>
              <p className="text-xs text-slate-400">
                Internal Enterprise Resource Planning & Customer Relationship Management
              </p>
            </div>

            {/* Admin / Employee Toggle Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const btn = document.getElementById('role-toggle-btn');
                  if (btn) {
                    btn.dataset.role = 'employee';
                    btn.innerText = 'Employee Login Active';
                    // Trigger UI changes
                    document.getElementById('email-input')?.setAttribute('placeholder', 'employee@hydrogreen.com');
                    document.getElementById('role-employee-btn')?.classList.add('bg-emerald-600', 'text-white');
                    document.getElementById('role-employee-btn')?.classList.remove('text-slate-400');
                    document.getElementById('role-admin-btn')?.classList.remove('bg-emerald-600', 'text-white');
                    document.getElementById('role-admin-btn')?.classList.add('text-slate-400');
                    document.getElementById('login-error-msg')?.classList.add('hidden');
                  }
                }}
                id="role-employee-btn"
                className="py-2 text-xs font-bold rounded-md bg-emerald-600 text-white shadow-sm transition-all cursor-pointer text-center"
              >
                Employee Login
              </button>
              <button
                type="button"
                onClick={() => {
                  const btn = document.getElementById('role-toggle-btn');
                  if (btn) {
                    btn.dataset.role = 'admin';
                    btn.innerText = 'Admin Login Active';
                    // Trigger UI changes
                    document.getElementById('email-input')?.setAttribute('placeholder', 'admin@hydrogreen.com');
                    document.getElementById('role-admin-btn')?.classList.add('bg-emerald-600', 'text-white');
                    document.getElementById('role-admin-btn')?.classList.remove('text-slate-400');
                    document.getElementById('role-employee-btn')?.classList.remove('bg-emerald-600', 'text-white');
                    document.getElementById('role-employee-btn')?.classList.add('text-slate-400');
                    document.getElementById('login-error-msg')?.classList.add('hidden');
                  }
                }}
                id="role-admin-btn"
                className="py-2 text-xs font-bold rounded-md text-slate-400 hover:text-slate-200 transition-all cursor-pointer text-center"
              >
                Admin Login
              </button>
            </div>

            {/* Hidden flag tracking active role selection */}
            <span id="role-toggle-btn" data-role="employee" className="hidden">Employee Login Active</span>

            {/* Login Form */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const emailEl = document.getElementById('email-input') as HTMLInputElement;
                const passwordEl = document.getElementById('password-input') as HTMLInputElement;
                const errorEl = document.getElementById('login-error-msg');
                const errorTextEl = document.getElementById('login-error-text');
                const submitBtn = document.getElementById('login-submit-btn') as HTMLButtonElement;
                const activeRole = document.getElementById('role-toggle-btn')?.dataset.role || 'employee';

                if (!emailEl?.value || !passwordEl?.value) return;

                if (errorEl) errorEl.classList.add('hidden');
                if (submitBtn) {
                  submitBtn.disabled = true;
                  submitBtn.innerText = "Authenticating Session...";
                }

                try {
                  const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: emailEl.value,
                      password: passwordEl.value,
                      role: activeRole
                    })
                  });

                  let data: any = null;
                  try {
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                      data = await res.json();
                    }
                  } catch (e) {
                    console.error("Failed to parse response JSON:", e);
                  }

                  if (!res.ok) {
                    throw new Error(data?.error || "Incorrect credentials or unauthorized email ID.");
                  }

                  if (!data || !data.success || !data.user) {
                    throw new Error("Could not retrieve user session details. Please try again.");
                  }

                  // Save authenticated session profile
                  localStorage.setItem('hydrogreen_user', JSON.stringify(data.user));
                  setCurrentUser(data.user);
                } catch (err: any) {
                  if (errorEl && errorTextEl) {
                    errorTextEl.innerText = err.message || "Failed to authenticate session.";
                    errorEl.classList.remove('hidden');
                  }
                } finally {
                  if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = `Sign In`;
                  }
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Corporate Email ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    id="email-input"
                    type="email"
                    required
                    placeholder="employee@hydrogreen.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  System Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    id="password-input"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Login Error Alert */}
              <div id="login-error-msg" className="hidden p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 flex gap-1.5 items-start">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span id="login-error-text">Unauthorized Email.</span>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow-lg shadow-emerald-600/10 transition-all cursor-pointer text-center text-xs"
              >
                Sign In
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                Authorized Corporate Access Terminals Only
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className={`flex h-screen overflow-hidden font-sans ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}>
        
        {/* Main Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={currentUser}
          onLogout={() => {
            localStorage.removeItem('hydrogreen_user');
            setCurrentUser(null);
          }}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
        />

        {/* Content Panel Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Status and User Bar */}
          <header className={`px-6 py-3.5 border-b flex items-center justify-between shrink-0 ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Connected • Live Database Sync
                </span>
              </div>
              
              {/* Quick Actions / Command Palette Trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsCommandPaletteOpen(true);
                  setCommandPaletteSearch('');
                  setCommandPaletteIndex(0);
                }}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-200 ${
                  darkMode 
                    ? 'bg-slate-800/60 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400' 
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <Command className="w-3.5 h-3.5 text-emerald-500" />
                <span>Search or run actions...</span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded font-mono text-[9px] bg-slate-200 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border dark:border-slate-800">
                  ⌘K
                </span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setIsCommandPaletteOpen(true);
                  setCommandPaletteSearch('');
                  setCommandPaletteIndex(0);
                }}
                className="md:hidden flex p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                title="Search Command Hub"
              >
                <Command className="w-4 h-4 text-emerald-500" />
              </button>
              <span>IST: {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline">
                {currentUser?.role === 'admin' ? 'Admin Terminal' : 'Employee Terminal'}
              </span>
            </div>
          </header>

          {/* Render Active Tab Pane */}
          <main className="flex-1 overflow-y-auto bg-slate-50/20 dark:bg-slate-950/20 relative">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 font-mono text-xs">
                🔄 Syncing database schemas...
              </div>
            ) : (
              <div key={activeTab} className="min-h-full animate-slide-up">
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    customers={customers}
                    leads={leads}
                    projects={projects}
                    finance={finance}
                    inventory={inventory}
                    support={support}
                    setActiveTab={setActiveTab}
                    setGlobalSearch={setGlobalSearch}
                    darkMode={darkMode}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomerManagement 
                    customers={customers}
                    darkMode={darkMode}
                    onRefresh={handleRefresh}
                    agronomy={agronomy}
                    support={support}
                    finance={finance}
                    projects={projects}
                  />
                )}

                {activeTab === 'leads' && (
                  <LeadManagement 
                    leads={leads}
                    darkMode={darkMode}
                    onRefresh={handleRefresh}
                    settings={settings}
                  />
                )}

                {activeTab === 'projects' && (
                  <ProjectWorkflow 
                    projects={projects}
                    customers={customers}
                    darkMode={darkMode}
                    onRefresh={handleRefresh}
                  />
                )}

                {activeTab === 'worklogs' && (
                  <WorkLogs 
                    worklogs={worklogs}
                    projects={projects}
                    inventory={inventory}
                    darkMode={darkMode}
                    onRefresh={handleRefresh}
                  />
                )}

                {activeTab === 'finance' && (
                  <FinanceModule 
                    finance={finance}
                    customers={customers}
                    projects={projects}
                    darkMode={darkMode}
                    onRefresh={handleRefresh}
                  />
                )}

                {/* Global Document explorer */}
                {activeTab === 'documents' && (
                  <div className="p-6 space-y-6 max-w-5xl mx-auto">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Global Documents Depository</h2>
                      <p className="text-xs text-slate-400 mt-1">Cross-reference and verify files, PAN, Aadhaar, and sanction sheets for all farming customers</p>
                    </div>

                    <div className="border dark:border-slate-800 border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                            <tr>
                              <th className="p-4 font-semibold">Document Name</th>
                              <th className="p-4 font-semibold">Verification Code</th>
                              <th className="p-4 font-semibold">Category</th>
                              <th className="p-4 font-semibold">Associated Customer</th>
                              <th className="p-4 font-semibold">Upload Date</th>
                              <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                            {allGlobalDocuments.map((docItem) => (
                              <tr key={docItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                <td className="p-4 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-emerald-600" /> {docItem.name}
                                </td>
                                <td className="p-4 font-mono text-[11px] text-slate-400">{docItem.id}</td>
                                <td className="p-4">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {docItem.category}
                                  </span>
                                </td>
                                <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                                  {docItem.customerName} ({docItem.customerId})
                                </td>
                                <td className="p-4 text-slate-400">{docItem.uploadedAt}</td>
                                <td className="p-4 text-right">
                                  <a 
                                    href={docItem.fileUrl} 
                                    download={docItem.name}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition-all"
                                  >
                                    Verify & Download
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* After-sales ticket register */}
                {activeTab === 'support' && (
                  <div className="p-6 space-y-6 max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">After-Sales & Warranty Support</h2>
                        <p className="text-xs text-slate-400 mt-1">Register drip chokes, pump queries, track complaints, and monitor active AMC terms</p>
                      </div>
                      <button
                        onClick={() => setIsSupOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/15"
                      >
                        <Plus className="w-4 h-4" /> Log Complaint Ticket
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {support.map((ticket) => (
                        <div key={ticket.id} className={`p-5 rounded-xl border space-y-4 ${
                          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between border-b dark:border-slate-800 border-slate-100 pb-2">
                            <div>
                              <p className="text-xs font-mono text-slate-400">{ticket.complaintNumber}</p>
                              <h3 className="font-bold text-sm mt-0.5">{ticket.customerName}</h3>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>

                          <div className="text-xs space-y-2">
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[9px]">Complaint Issue</span>
                              <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{ticket.complaint}</p>
                            </div>

                            {ticket.resolutionNotes && (
                              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded border dark:border-slate-800 italic">
                                "Resolution: {ticket.resolutionNotes}"
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t dark:border-slate-800 border-slate-100 text-[10px] text-slate-400">
                              <span>Warranty: <b className="text-emerald-600">{ticket.warrantyStatus}</b></span>
                              <span>Logged: {ticket.createdAt}</span>
                            </div>
                          </div>

                          {ticket.status !== 'Resolved' && (
                            <div className="flex justify-end gap-1.5 pt-2">
                              <button
                                onClick={() => {
                                  const notes = prompt("Enter resolution details:");
                                  if (notes) handleUpdateTicketStatus(ticket, 'Resolved', notes);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[10px]"
                              >
                                Mark Resolved
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Support dialog popup */}
                    {isSupOpen && (
                      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className={`w-full max-w-sm rounded-xl p-6 shadow-2xl relative ${
                          darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
                        }`}>
                          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4">Log Support Case</h3>
                          <form onSubmit={handleCreateSupportTicket} className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold mb-1">Customer *</label>
                              <select
                                value={supCustId}
                                onChange={(e) => setSupCustId(e.target.value)}
                                className={`w-full p-2 text-xs rounded border focus:outline-none ${
                                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                                }`}
                              >
                                <option value="">-- Choose Customer --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold mb-1">Complaint Description *</label>
                              <textarea
                                rows={3}
                                required
                                value={supComplaint}
                                onChange={(e) => setSupComplaint(e.target.value)}
                                className={`w-full p-2 text-xs rounded border focus:outline-none ${
                                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                                }`}
                                placeholder="Describe drip chokes, pressure leaks, pump complaints..."
                              />
                            </div>

                            <div className="flex justify-end gap-1.5 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsSupOpen(false)}
                                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-700"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                              >
                                Save Ticket
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Agronomy site records */}
                {activeTab === 'agronomy' && (
                  <AgronomyManagement
                    agronomy={agronomy}
                    customers={customers}
                    darkMode={darkMode}
                    onAddVisit={handleAddAgronomyVisit}
                  />
                )}

                {/* Company Settings */}
                {activeTab === 'settings' && (
                  <div className="p-6 space-y-6 max-w-xl mx-auto">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Company Configuration</h2>
                      <p className="text-xs text-slate-400 mt-1">Maintain legal company parameters, GST registers, and primary banking accounts for invoices</p>
                    </div>

                    <form onSubmit={handleSaveSettings} className={`p-6 rounded-xl border space-y-4 ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <label className="block text-xs font-semibold mb-1">GST Number</label>
                        <input
                          type="text"
                          value={gst}
                          onChange={(e) => setGst(e.target.value)}
                          className={`w-full p-2 text-xs rounded border focus:outline-none ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">Corporate Address</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className={`w-full p-2 text-xs rounded border focus:outline-none ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">Phone</label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={`w-full p-2 text-xs rounded border focus:outline-none ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full p-2 text-xs rounded border focus:outline-none ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                            }`}
                          />
                        </div>
                      </div>

                      <div className={`p-4 border border-dashed rounded-xl space-y-3 ${
                        darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Invoice Bank parameters</h4>
                        
                        <div>
                          <label className="block text-[10px] font-semibold mb-1 text-slate-400">Bank Name</label>
                          <input
                            type="text"
                            value={bank}
                            onChange={(e) => setBank(e.target.value)}
                            className={`w-full p-2 text-xs rounded border focus:outline-none ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold mb-1 text-slate-400">Account No</label>
                            <input
                              type="text"
                              value={account}
                              onChange={(e) => setAccount(e.target.value)}
                              className={`w-full p-2 text-xs rounded border focus:outline-none ${
                                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold mb-1 text-slate-400">IFSC Code</label>
                            <input
                              type="text"
                              value={ifsc}
                              onChange={(e) => setIfsc(e.target.value)}
                              className={`w-full p-2 text-xs rounded border focus:outline-none ${
                                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-md transition-all"
                      >
                        Save Company settings
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'auth-mgmt' && (
                  <AuthManagement darkMode={darkMode} />
                )}

                {/* backup and restore simulation */}
                {activeTab === 'backup' && (
                  <div className="p-6 space-y-6 max-w-xl mx-auto">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Database Backup & Snapshots</h2>
                      <p className="text-xs text-slate-400 mt-1">Export full database logs as a highly professional, comprehensive PDF backup report</p>
                    </div>

                    <div className={`p-6 rounded-xl border space-y-4 text-xs ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <p className="leading-relaxed text-slate-500 dark:text-slate-300">
                        To generate an offline physical backup of your system's complete operations, click the button below to compile and download a multi-page, beautiful executive PDF snapshot of all registry databases, pipelines, active installation projects, financial ledgers, customer support tickets, and agronomy consultant logs.
                      </p>

                      <button
                        onClick={() => {
                          generateSystemSnapshotPDF({
                            customers,
                            leads,
                            projects,
                            finance,
                            support,
                            agronomy
                          }, settings);
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-md hover:shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" /> Download Complete System Backup Report (.pdf)
                      </button>
                    </div>

                    <div className={`p-6 rounded-xl border space-y-4 text-xs ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500" />
                        <span>Initialize Sample Demo Data</span>
                      </h3>
                      <p className="leading-relaxed text-slate-500 dark:text-slate-300">
                        If you are exploring the application and want to populate your database with high-fidelity, realistic agricultural CRM data (sample customers, projects, finance, support tickets), you can trigger it manually.
                      </p>
                      <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                        🛡️ <b>Data Safety Active:</b> Auto-seeding on reload is disabled. Seeding is blocked if you have any existing customer records, ensuring your primary data is never corrupted or mixed.
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (customers.length > 0) {
                            alert(`Seeding blocked! Your database is already populated with real data (you have ${customers.length} customer records). To protect your inputs, we do not allow seeding demo data on top of your existing files.`);
                            return;
                          }
                          if (confirm("Are you sure you want to load sample demo data into your Firestore database? This is only allowed because your database is currently empty.")) {
                            try {
                              await seedFirestoreIfEmpty();
                              alert("Sample demo data loaded successfully! All dashboards are now populated.");
                            } catch (error) {
                              alert("Error loading demo data: " + (error instanceof Error ? error.message : String(error)));
                            }
                          }
                        }}
                        className={`w-full py-2.5 rounded font-bold shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2 ${
                          customers.length > 0
                            ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed border border-slate-800'
                            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        }`}
                        disabled={customers.length > 0}
                      >
                        <Database className="w-4 h-4" /> {customers.length > 0 ? "Database Is Active (Seeding Locked)" : "Populate Database with Demo Data"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Reports & PDF Export */}
                {activeTab === 'reports' && (
                  <div className="p-6 space-y-6 max-w-4xl mx-auto">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Executive Business Reports</h2>
                      <p className="text-xs text-slate-400 mt-1">Compile and export high-fidelity PDF ledgers, project handovers, and procurement asset reports</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Executive Operations Summary */}
                      <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-3 ${
                        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-bold text-sm">Executive Operations Summary PDF</h3>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Compiles total business revenue, active installation counts, customer stats, and inventory valuation into a professional, multi-page executive summary PDF.
                          </p>
                        </div>
                        <button 
                          onClick={() => generateExecutiveSummaryPDF({ customers, leads, projects, inventory, finance }, settings)}
                          className="w-full mt-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition-all cursor-pointer shadow-sm"
                        >
                          Download Executive Summary (.pdf)
                        </button>
                      </div>

                      {/* 2. Operational Project Handover */}
                      <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-3 ${
                        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <h3 className="font-bold text-sm">Operational Project Handover PDF</h3>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Generates complete site commissioning documents, milestone phase checklists, and technical maintenance guides with signature lines for handover sign-offs.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Project Site</label>
                          <select
                            value={selectedHandoverProjId}
                            onChange={(e) => setSelectedHandoverProjId(e.target.value)}
                            className={`w-full p-2 text-xs rounded border focus:outline-none ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                            }`}
                          >
                            <option value="">-- Choose Active or Completed Project --</option>
                            {projects.map(proj => (
                              <option key={proj.id} value={proj.id}>
                                {proj.customerName} - {proj.projectName || "Irrigation Install"}
                              </option>
                            ))}
                          </select>
                          <button 
                            disabled={!selectedHandoverProjId}
                            onClick={() => {
                              const proj = projects.find(p => p.id === selectedHandoverProjId);
                              if (proj) {
                                const cust = customers.find(c => c.id === proj.customerId);
                                generateHandoverPDF(proj, cust, settings);
                              }
                            }}
                            className={`w-full mt-1 px-3 py-2 text-white font-semibold text-xs rounded transition-all cursor-pointer shadow-sm ${
                              selectedHandoverProjId 
                                ? 'bg-blue-600 hover:bg-blue-700' 
                                : 'bg-slate-700 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            Generate Completion Certificate (.pdf)
                          </button>
                        </div>
                      </div>

                      {/* 3. Financial Statement & Cash Ledger */}
                      <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-3 ${
                        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-sm">Finances Statement & Cash Ledger</h3>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Draws a structured ledger statement of cash-flow, accounting for total invoiced revenue, realized payments, and business operational expenses.
                          </p>
                        </div>
                        <button 
                          onClick={() => generateFinancialPDF(finance, settings)}
                          className="w-full mt-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded transition-all cursor-pointer shadow-sm text-center"
                        >
                          Download Financial Ledger (.pdf)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
      </div>

      {/* Toast Notifications Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 pointer-events-auto backdrop-blur-md animate-slide-up ${
              darkMode 
                ? 'bg-slate-900/90 border-slate-800 text-slate-100' 
                : 'bg-white/95 border-slate-100 text-slate-800'
            }`}
          >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                )}
                {toast.type === 'error' && (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
                {toast.type === 'info' && (
                  <Info className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium leading-normal">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
      </div>

      {/* Interactive Command Palette Modal */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 md:p-12 flex items-start justify-center">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCommandPaletteOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs animate-fade-in"
          />

          {/* Modal Box */}
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden relative flex flex-col animate-scale-in ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
              {/* Header Search Field */}
              <div className="relative border-b dark:border-slate-800 border-slate-100 p-4 flex items-center gap-3">
                <Command className="w-5 h-5 text-emerald-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search commands, customers or leads..."
                  value={commandPaletteSearch}
                  onChange={(e) => {
                    setCommandPaletteSearch(e.target.value);
                    setCommandPaletteIndex(0);
                  }}
                  onKeyDown={(e) => {
                    const baseActionsList = [
                      { id: 'goto-dashboard', label: 'Go to Dashboard', category: 'Navigation', icon: BarChart3, action: () => { setActiveTab('dashboard'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-customers', label: 'Go to Customers List', category: 'Navigation', icon: User, action: () => { setActiveTab('customers'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-leads', label: 'Go to Leads Pipeline', category: 'Navigation', icon: Briefcase, action: () => { setActiveTab('leads'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-projects', label: 'Go to Projects workflow', category: 'Navigation', icon: Sprout, action: () => { setActiveTab('projects'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-worklogs', label: 'Go to Operational Work Logs', category: 'Navigation', icon: Clock, action: () => { setActiveTab('worklogs'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-inventory', label: 'Go to Inventory & Safety Stocks', category: 'Navigation', icon: Database, action: () => { setActiveTab('inventory'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-finance', label: 'Go to Finance Module', category: 'Navigation', icon: IndianRupee, action: () => { setActiveTab('finance'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-support', label: 'Go to Support & Warranty Support', category: 'Navigation', icon: HelpCircle, action: () => { setActiveTab('support'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-agronomy', label: 'Go to Agronomy site logs', category: 'Navigation', icon: Sprout, action: () => { setActiveTab('agronomy'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-settings', label: 'Go to Company Configurations', category: 'Navigation', icon: SettingsIcon, action: () => { setActiveTab('settings'); setIsCommandPaletteOpen(false); } },
                      { id: 'goto-backup', label: 'Go to Database Backup & Demo Seeding', category: 'Navigation', icon: Database, action: () => { setActiveTab('backup'); setIsCommandPaletteOpen(false); } },
                      { id: 'toggle-theme', label: `Toggle Theme (Switch to ${darkMode ? 'Light' : 'Dark'} Mode)`, category: 'System', icon: darkMode ? Sun : Moon, action: () => { setDarkMode(!darkMode); showToast(`Switched to ${darkMode ? 'Light' : 'Dark'} Mode`, 'info'); setIsCommandPaletteOpen(false); } },
                      { id: 'pdf-executive', label: 'Generate Executive Business Summary PDF', category: 'Reports', icon: FileText, action: () => { generateExecutiveSummaryPDF({ customers, leads, projects, inventory, finance }, settings); setIsCommandPaletteOpen(false); showToast('Compiling Executive Summary PDF...', 'info'); } },
                      { id: 'pdf-financial', label: 'Generate Financial Cash Ledger PDF', category: 'Reports', icon: FileText, action: () => { generateFinancialPDF(finance, settings); setIsCommandPaletteOpen(false); showToast('Compiling Financial Ledger PDF...', 'info'); } },
                      { id: 'pdf-system', label: 'Generate Complete Database Snapshot PDF', category: 'Reports', icon: FileText, action: () => { generateSystemSnapshotPDF({ customers, leads, projects, finance, support, agronomy }, settings); setIsCommandPaletteOpen(false); showToast('Compiling System Backup PDF...', 'info'); } }
                    ];

                    const dynamicItemsList: any[] = [];
                    if (commandPaletteSearch.trim().length > 0) {
                      const searchLower = commandPaletteSearch.toLowerCase();
                      customers.forEach(cust => {
                        if (cust.name.toLowerCase().includes(searchLower) || cust.phone.toLowerCase().includes(searchLower) || (cust.district && cust.district.toLowerCase().includes(searchLower))) {
                          dynamicItemsList.push({
                            id: `cust-${cust.id}`,
                            label: `Customer: ${cust.name} (${cust.district || 'No District'})`,
                            category: 'Customers',
                            icon: User,
                            action: () => {
                              setActiveTab('customers');
                              setGlobalSearch(cust.name);
                              setIsCommandPaletteOpen(false);
                              showToast(`Searching customer "${cust.name}"`, 'success');
                            }
                          });
                        }
                      });
                      leads.forEach(lead => {
                        if (lead.name.toLowerCase().includes(searchLower) || lead.phone.toLowerCase().includes(searchLower) || (lead.cropType && lead.cropType.toLowerCase().includes(searchLower))) {
                          dynamicItemsList.push({
                            id: `lead-${lead.id}`,
                            label: `Lead: ${lead.name} (${lead.cropType || 'Crop unspecified'})`,
                            category: 'Leads',
                            icon: Briefcase,
                            action: () => {
                              setActiveTab('leads');
                              setGlobalSearch(lead.name);
                              setIsCommandPaletteOpen(false);
                              showToast(`Searching lead "${lead.name}"`, 'success');
                            }
                          });
                        }
                      });
                      projects.forEach(p => {
                        if ((p.projectName && p.projectName.toLowerCase().includes(searchLower)) || p.customerName.toLowerCase().includes(searchLower)) {
                          dynamicItemsList.push({
                            id: `proj-${p.id}`,
                            label: `Project: ${p.projectName} for ${p.customerName}`,
                            category: 'Projects',
                            icon: Sprout,
                            action: () => {
                              setActiveTab('projects');
                              setGlobalSearch(p.projectName);
                              setIsCommandPaletteOpen(false);
                              showToast(`Jumping to project site for "${p.customerName}"`, 'success');
                            }
                          });
                        }
                      });
                    }

                    const filtered = [...dynamicItemsList, ...baseActionsList].filter(item => 
                      item.label.toLowerCase().includes(commandPaletteSearch.toLowerCase()) ||
                      item.category.toLowerCase().includes(commandPaletteSearch.toLowerCase())
                    );

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setCommandPaletteIndex(prev => Math.min(prev + 1, filtered.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setCommandPaletteIndex(prev => Math.max(prev - 1, 0));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filtered[commandPaletteIndex]) {
                        filtered[commandPaletteIndex].action();
                      }
                    } else if (e.key === 'Escape') {
                      setIsCommandPaletteOpen(false);
                    }
                  }}
                  className="w-full text-sm font-medium bg-transparent focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCommandPaletteOpen(false)}
                  className="px-1.5 py-0.5 text-[10px] font-mono border rounded border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ESC
                </button>
              </div>

              {/* Suggestions / Results */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {(() => {
                  const baseActionsList = [
                    { id: 'goto-dashboard', label: 'Go to Dashboard', category: 'Navigation', icon: BarChart3, action: () => { setActiveTab('dashboard'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-customers', label: 'Go to Customers List', category: 'Navigation', icon: User, action: () => { setActiveTab('customers'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-leads', label: 'Go to Leads Pipeline', category: 'Navigation', icon: Briefcase, action: () => { setActiveTab('leads'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-projects', label: 'Go to Projects workflow', category: 'Navigation', icon: Sprout, action: () => { setActiveTab('projects'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-worklogs', label: 'Go to Operational Work Logs', category: 'Navigation', icon: Clock, action: () => { setActiveTab('worklogs'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-inventory', label: 'Go to Inventory & Safety Stocks', category: 'Navigation', icon: Database, action: () => { setActiveTab('inventory'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-finance', label: 'Go to Finance Module', category: 'Navigation', icon: IndianRupee, action: () => { setActiveTab('finance'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-support', label: 'Go to Support & Warranty Support', category: 'Navigation', icon: HelpCircle, action: () => { setActiveTab('support'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-agronomy', label: 'Go to Agronomy site logs', category: 'Navigation', icon: Sprout, action: () => { setActiveTab('agronomy'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-settings', label: 'Go to Company Configurations', category: 'Navigation', icon: SettingsIcon, action: () => { setActiveTab('settings'); setIsCommandPaletteOpen(false); } },
                    { id: 'goto-backup', label: 'Go to Database Backup & Demo Seeding', category: 'Navigation', icon: Database, action: () => { setActiveTab('backup'); setIsCommandPaletteOpen(false); } },
                    { id: 'toggle-theme', label: `Toggle Theme (Switch to ${darkMode ? 'Light' : 'Dark'} Mode)`, category: 'System', icon: darkMode ? Sun : Moon, action: () => { setDarkMode(!darkMode); showToast(`Switched to ${darkMode ? 'Light' : 'Dark'} Mode`, 'info'); setIsCommandPaletteOpen(false); } },
                    { id: 'pdf-executive', label: 'Generate Executive Business Summary PDF', category: 'Reports', icon: FileText, action: () => { generateExecutiveSummaryPDF({ customers, leads, projects, inventory, finance }, settings); setIsCommandPaletteOpen(false); showToast('Compiling Executive Summary PDF...', 'info'); } },
                    { id: 'pdf-financial', label: 'Generate Financial Cash Ledger PDF', category: 'Reports', icon: FileText, action: () => { generateFinancialPDF(finance, settings); setIsCommandPaletteOpen(false); showToast('Compiling Financial Ledger PDF...', 'info'); } },
                    { id: 'pdf-system', label: 'Generate Complete Database Snapshot PDF', category: 'Reports', icon: FileText, action: () => { generateSystemSnapshotPDF({ customers, leads, projects, finance, support, agronomy }, settings); setIsCommandPaletteOpen(false); showToast('Compiling System Backup PDF...', 'info'); } }
                  ];

                  const dynamicItemsList: any[] = [];
                  if (commandPaletteSearch.trim().length > 0) {
                    const searchLower = commandPaletteSearch.toLowerCase();
                    customers.forEach(cust => {
                      if (cust.name.toLowerCase().includes(searchLower) || cust.phone.toLowerCase().includes(searchLower) || (cust.district && cust.district.toLowerCase().includes(searchLower))) {
                        dynamicItemsList.push({
                          id: `cust-${cust.id}`,
                          label: `Customer: ${cust.name} (${cust.district || 'No District'})`,
                          category: 'Customers',
                          icon: User,
                          action: () => {
                            setActiveTab('customers');
                            setGlobalSearch(cust.name);
                            setIsCommandPaletteOpen(false);
                            showToast(`Searching customer "${cust.name}"`, 'success');
                          }
                        });
                      }
                    });
                    leads.forEach(lead => {
                      if (lead.name.toLowerCase().includes(searchLower) || lead.phone.toLowerCase().includes(searchLower) || (lead.cropType && lead.cropType.toLowerCase().includes(searchLower))) {
                        dynamicItemsList.push({
                          id: `lead-${lead.id}`,
                          label: `Lead: ${lead.name} (${lead.cropType || 'Crop unspecified'})`,
                          category: 'Leads',
                          icon: Briefcase,
                          action: () => {
                            setActiveTab('leads');
                            setGlobalSearch(lead.name);
                            setIsCommandPaletteOpen(false);
                            showToast(`Searching lead "${lead.name}"`, 'success');
                          }
                        });
                      }
                    });
                    projects.forEach(p => {
                      if ((p.projectName && p.projectName.toLowerCase().includes(searchLower)) || p.customerName.toLowerCase().includes(searchLower)) {
                        dynamicItemsList.push({
                          id: `proj-${p.id}`,
                          label: `Project: ${p.projectName} for ${p.customerName}`,
                          category: 'Projects',
                          icon: Sprout,
                          action: () => {
                            setActiveTab('projects');
                            setGlobalSearch(p.projectName);
                            setIsCommandPaletteOpen(false);
                            showToast(`Jumping to project site for "${p.customerName}"`, 'success');
                          }
                        });
                      }
                    });
                  }

                  const filtered = [...dynamicItemsList, ...baseActionsList].filter(item => 
                    item.label.toLowerCase().includes(commandPaletteSearch.toLowerCase()) ||
                    item.category.toLowerCase().includes(commandPaletteSearch.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                        <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                        <div>No commands or records found matching "{commandPaletteSearch}"</div>
                      </div>
                    );
                  }

                  let lastCategory = '';
                  return filtered.map((item, index) => {
                    const isSelected = index === commandPaletteIndex;
                    const IconComponent = item.icon || Command;
                    const showCategory = item.category !== lastCategory;
                    lastCategory = item.category;

                    return (
                      <div key={item.id} className="space-y-0.5">
                        {showCategory && (
                          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                            {item.category}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => item.action()}
                          onMouseEnter={() => setCommandPaletteIndex(index)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                              : darkMode 
                                ? 'hover:bg-slate-800 text-slate-200' 
                                : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <span className={`text-[10px] font-mono shrink-0 ml-4 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {isSelected ? '⏎ Enter' : 'Jump'}
                          </span>
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Status footer */}
              <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border-t dark:border-slate-800 border-slate-100 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Keyboard className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Navigate with ↑↓ keys</span>
                </span>
                <span>Hydrogreen Enterprise Command v2.1</span>
              </div>
            </div>
          </div>
        )}
    </div>
  </div>
);
}
