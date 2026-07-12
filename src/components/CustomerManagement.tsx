import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Eye, FileText, Download, Upload, 
  ChevronLeft, ArrowLeft, Phone, Calendar, MapPin, Sparkles, BookOpen,
  Sprout, ShieldAlert, DollarSign, Clock, MessageSquare, CheckCircle, 
  AlertTriangle, User, Mail, X, Activity, ChevronRight, Check, Wrench
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { 
  Customer, CustomerDocument, CustomerInteraction, 
  AgronomyVisit, SupportTicket, FinanceRecord, Project 
} from '../types';

interface CustomerManagementProps {
  customers: Customer[];
  darkMode: boolean;
  onRefresh: () => void;
  agronomy?: AgronomyVisit[];
  support?: SupportTicket[];
  finance?: FinanceRecord[];
  projects?: Project[];
}

export default function CustomerManagement({
  customers,
  darkMode,
  onRefresh,
  agronomy = [],
  support = [],
  finance = [],
  projects = []
}: CustomerManagementProps) {
  const savedUserStr = localStorage.getItem('hydrogreen_user');
  const userRole = savedUserStr ? JSON.parse(savedUserStr).role : 'employee';
  const isAdmin = userRole === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProjectType, setFilterProjectType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Detailed single customer view state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Forms state
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pinCode, setPinCode] = useState('');
  const [projectType, setProjectType] = useState('Polyhouse');
  const [area, setArea] = useState('');
  const [crop, setCrop] = useState('');
  const [status, setStatus] = useState('Lead');
  const [projectValue, setProjectValue] = useState(0);
  const [loanPercentage, setLoanPercentage] = useState<number>(80);
  const [marginPercentage, setMarginPercentage] = useState<number>(20);
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [marginAmount, setMarginAmount] = useState<number>(0);
  const [nhbSubsidyEligible, setNhbSubsidyEligible] = useState<boolean>(false);
  const [subsidyAmount, setSubsidyAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const updateFinances = (val: number, lp: number, mp: number, isSubsidyEligible: boolean) => {
    const calculatedLoan = Number(((val * lp) / 100).toFixed(2));
    const calculatedMargin = Number(((val * mp) / 100).toFixed(2));
    setLoanAmount(calculatedLoan);
    setMarginAmount(calculatedMargin);
    setSubsidyAmount(isSubsidyEligible ? Number(((val * 50) / 100).toFixed(2)) : 0);
  };

  const handleProjectValueChange = (val: number) => {
    setProjectValue(val);
    updateFinances(val, loanPercentage, marginPercentage, nhbSubsidyEligible);
  };

  const handleLoanPercentChange = (pct: number) => {
    const lp = Math.min(100, Math.max(0, pct));
    const mp = 100 - lp;
    setLoanPercentage(lp);
    setMarginPercentage(mp);
    updateFinances(projectValue, lp, mp, nhbSubsidyEligible);
  };

  const handleMarginPercentChange = (pct: number) => {
    const mp = Math.min(100, Math.max(0, pct));
    const lp = 100 - mp;
    setLoanPercentage(lp);
    setMarginPercentage(mp);
    updateFinances(projectValue, lp, mp, nhbSubsidyEligible);
  };

  const handleSubsidyToggle = (checked: boolean) => {
    setNhbSubsidyEligible(checked);
    updateFinances(projectValue, loanPercentage, marginPercentage, checked);
  };

  // Document upload state
  const [uploadCategory, setUploadCategory] = useState('Aadhaar');
  const [uploadName, setUploadName] = useState('');

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  // Sub-tabs in customer details
  const [activeSubTab, setActiveSubTab] = useState<'files' | 'timeline'>('timeline');

  // Manual Interaction form state
  const [isInteractionOpen, setIsInteractionOpen] = useState(false);
  const [intType, setIntType] = useState<'Call' | 'Email' | 'Meeting' | 'Site Visit' | 'Other'>('Call');
  const [intNotes, setIntNotes] = useState('');
  const [intAgentName, setIntAgentName] = useState('');
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !currentCustomer || !intNotes) return;

    setIsSavingInteraction(true);
    try {
      const newInteraction: CustomerInteraction = {
        id: 'INT-' + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toISOString().split('T')[0],
        type: intType,
        notes: intNotes,
        agentName: intAgentName || 'Representative'
      };

      const updatedInteractions = [
        ...(currentCustomer.interactions || []),
        newInteraction
      ];

      await updateDoc(doc(db, 'customers', selectedCustomerId), {
        interactions: updatedInteractions
      });

      // Reset form
      setIntNotes('');
      setIntAgentName('');
      setIsInteractionOpen(false);
    } catch (err) {
      console.error("Error saving interaction log:", err);
    } finally {
      setIsSavingInteraction(false);
    }
  };

  // Filters
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.village && c.village.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.district && c.district.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterProjectType ? c.projectType === filterProjectType : true;
    const matchesStatus = filterStatus ? c.status === filterStatus : true;

    return matchesSearch && matchesType && matchesStatus;
  });

  const customerTimelineEvents = useMemo(() => {
    if (!selectedCustomerId || !currentCustomer) return [];

    const items: Array<{
      id: string;
      date: string;
      title: string;
      type: 'interaction' | 'agronomy' | 'support' | 'finance' | 'project' | 'document';
      status?: string;
      meta?: string;
      notes: string;
      recommendations?: string;
      author?: string;
      iconColor: string;
      tagLabel?: string;
    }> = [];

    // 1. Manual Interactions
    if (currentCustomer.interactions) {
      currentCustomer.interactions.forEach(int => {
        items.push({
          id: int.id,
          date: int.date,
          title: `Client Interaction (${int.type})`,
          type: 'interaction',
          notes: int.notes,
          author: int.agentName || 'Representative',
          iconColor: 'emerald'
        });
      });
    }

    // 2. Agronomy Visits
    const custAgronomy = agronomy.filter(a => a.customerId === selectedCustomerId);
    custAgronomy.forEach(ag => {
      items.push({
        id: ag.id,
        date: ag.visitDate,
        title: `Agronomy Advisory: ${ag.cropName}`,
        type: 'agronomy',
        notes: ag.observation,
        recommendations: ag.recommendations,
        meta: ag.diseaseDetails ? `⚠️ Diagnostic Flag: ${ag.diseaseDetails}` : undefined,
        tagLabel: ag.remarks ? `Remarks: ${ag.remarks}` : undefined,
        iconColor: 'green'
      });
    });

    // 3. Support Tickets
    const custSupport = support.filter(s => s.customerId === selectedCustomerId);
    custSupport.forEach(st => {
      items.push({
        id: st.id,
        date: st.createdAt,
        title: `Support Ticket Complaint (${st.complaintNumber})`,
        type: 'support',
        status: st.status,
        notes: st.complaint,
        meta: st.resolutionNotes ? `Resolution: ${st.resolutionNotes}` : undefined,
        tagLabel: `Warranty: ${st.warrantyStatus}`,
        iconColor: 'rose'
      });
    });

    // 4. Finance Records
    const custFinance = finance.filter(f => f.customerId === selectedCustomerId);
    custFinance.forEach(f => {
      items.push({
        id: f.id,
        date: f.date,
        title: `Finance Generated: ${f.type} (${f.number})`,
        type: 'finance',
        status: f.status,
        notes: `Amount: ₹${f.amount.toLocaleString('en-IN')}. ${f.remarks || ''}`,
        iconColor: 'blue'
      });
    });

    // 5. Document Upload Events
    if (currentCustomer.documents) {
      currentCustomer.documents.forEach(docItem => {
        items.push({
          id: docItem.id,
          date: docItem.uploadedAt,
          title: `Document Vault: File Uploaded`,
          type: 'document',
          notes: `File "${docItem.name}" uploaded under category "${docItem.category}".`,
          iconColor: 'violet'
        });
      });
    }

    // Sort chronologically (newest first)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCustomerId, currentCustomer, agronomy, support, finance]);

  // Document Auto-fill Parsing State
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setId('');
    setName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setVillage('');
    setDistrict('');
    setState('Maharashtra');
    setPinCode('');
    setProjectType('Polyhouse');
    setArea('');
    setCrop('');
    setStatus('Lead');
    setProjectValue(0);
    setLoanPercentage(80);
    setMarginPercentage(20);
    setLoanAmount(0);
    setMarginAmount(0);
    setNhbSubsidyEligible(false);
    setSubsidyAmount(0);
    setNotes('');
    setParseError(null);
    setParseSuccess(null);
  };

  const handleDocumentParse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setParseSuccess(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target?.result as string;
        const base64Content = dataUrl.split(',')[1];
        const fileMime = file.type || 'application/pdf';

        const response = await fetch('/api/parse-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileBase64: base64Content,
            fileType: fileMime,
            type: 'customer'
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Server-side document processing failed.');
        }

        const parsed = await response.json();

        // Populate fields
        if (parsed.name) setName(parsed.name);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.village) setVillage(parsed.village);
        if (parsed.district) setDistrict(parsed.district);
        if (parsed.state) setState(parsed.state);
        if (parsed.pinCode) setPinCode(parsed.pinCode);
        if (parsed.farmSize) setArea(parsed.farmSize);
        if (parsed.crop) setCrop(parsed.crop);
        if (parsed.systemType) setProjectType(parsed.systemType);
        if (parsed.notes) setNotes(parsed.notes);

        setParseSuccess(`Extracted profile for "${parsed.name || 'Customer'}" successfully!`);
      } catch (err: any) {
        console.error("Parsing error:", err);
        setParseError(err?.message || "An error occurred while parsing the document.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    resetForm();
    setId('CUST-' + Math.floor(1000 + Math.random() * 9000));
    setIsAddOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setWhatsapp(c.whatsapp || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setVillage(c.village || '');
    setDistrict(c.district || '');
    setState(c.state || 'Maharashtra');
    setPinCode(c.pinCode || '');
    setProjectType(c.projectType || 'Polyhouse');
    setArea(c.area || '');
    setCrop(c.crop || '');
    setStatus(c.status);
    setProjectValue(c.projectValue || 0);
    const lp = c.loanPercentage !== undefined ? c.loanPercentage : 80;
    const mp = c.marginPercentage !== undefined ? c.marginPercentage : 20;
    const pVal = c.projectValue || 0;
    setLoanPercentage(lp);
    setMarginPercentage(mp);
    setLoanAmount(c.loanAmount !== undefined ? c.loanAmount : Number(((pVal * lp) / 100).toFixed(2)));
    setMarginAmount(c.marginAmount !== undefined ? c.marginAmount : Number(((pVal * mp) / 100).toFixed(2)));
    const subEligible = c.nhbSubsidyEligible || false;
    setNhbSubsidyEligible(subEligible);
    setSubsidyAmount(c.subsidyAmount !== undefined ? c.subsidyAmount : (subEligible ? Number(((pVal * 50) / 100).toFixed(2)) : 0));
    setNotes(c.notes || '');
    setIsEditOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      const newCustomer: Customer = {
        id,
        name,
        phone,
        whatsapp,
        email,
        address,
        village,
        district,
        state,
        pinCode,
        projectType,
        area,
        crop,
        status,
        projectValue: Number(projectValue),
        loanPercentage: Number(loanPercentage),
        marginPercentage: Number(marginPercentage),
        loanAmount: Number(loanAmount),
        marginAmount: Number(marginAmount),
        nhbSubsidyEligible: Boolean(nhbSubsidyEligible),
        subsidyAmount: Number(subsidyAmount),
        notes,
        documents: [],
        createdAt: new Date().toISOString().split('T')[0]
      };

      await setDoc(doc(db, 'customers', id), cleanUndefined(newCustomer));
      setIsAddOpen(false);
      resetForm();
      onRefresh();
    } catch (err) {
      console.error("Error adding customer:", err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      const customerDoc = doc(db, 'customers', id);
      await updateDoc(customerDoc, cleanUndefined({
        name,
        phone,
        whatsapp,
        email,
        address,
        village,
        district,
        state,
        pinCode,
        projectType,
        area,
        crop,
        status,
        projectValue: Number(projectValue),
        loanPercentage: Number(loanPercentage),
        marginPercentage: Number(marginPercentage),
        loanAmount: Number(loanAmount),
        marginAmount: Number(marginAmount),
        nhbSubsidyEligible: Boolean(nhbSubsidyEligible),
        subsidyAmount: Number(subsidyAmount),
        notes
      }));
      setIsEditOpen(false);
      onRefresh();
    } catch (err) {
      console.error("Error editing customer:", err);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      if (selectedCustomerId === customerId) {
        setSelectedCustomerId(null);
      }
      onRefresh();
    } catch (err) {
      console.error("Error deleting customer:", err);
    }
  };

  // Real Local File base64 uploader!
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCustomer) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Content = event.target?.result as string;
      const newDoc: CustomerDocument = {
        id: 'doc-' + Date.now(),
        name: uploadName || file.name,
        category: uploadCategory,
        fileUrl: base64Content,
        uploadedAt: new Date().toISOString().split('T')[0]
      };

      const updatedDocs = [...(currentCustomer.documents || []), newDoc];
      try {
        await updateDoc(doc(db, 'customers', currentCustomer.id), {
          documents: updatedDocs
        });
        setUploadName('');
        onRefresh();
      } catch (err) {
        console.error("Error uploading document:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!currentCustomer || !window.confirm("Delete this document?")) return;

    const updatedDocs = currentCustomer.documents.filter(d => d.id !== docId);
    try {
      await updateDoc(doc(db, 'customers', currentCustomer.id), {
        documents: updatedDocs
      });
      onRefresh();
    } catch (err) {
      console.error("Error deleting document:", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* If single customer is selected, show detail view */}
      {selectedCustomerId && currentCustomer ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header Back Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Customers List
            </button>
            <span className="text-slate-400 font-mono text-xs">/ {currentCustomer.id}</span>
          </div>

          {/* Profile Details Page */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side info card */}
            <div className={`p-6 rounded-xl border space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{currentCustomer.name}</h2>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    currentCustomer.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    currentCustomer.status === 'Active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {currentCustomer.status} Customer
                  </span>
                </div>
                <button
                  onClick={() => handleOpenEdit(currentCustomer)}
                  className="p-1.5 rounded-lg border dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4 text-xs border-t dark:border-slate-800 border-slate-100 pt-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-slate-400 font-medium">Phone / WhatsApp</p>
                    <p className="font-semibold">{currentCustomer.phone} {currentCustomer.whatsapp ? `/ ${currentCustomer.whatsapp}` : ''}</p>
                  </div>
                </div>
                {currentCustomer.email && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-slate-400 font-medium">Email Address</p>
                      <p className="font-semibold">{currentCustomer.email}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <div>
                    <p className="text-slate-400 font-medium">Village & Location</p>
                    <p className="font-semibold">{currentCustomer.village || 'N/A'}, {currentCustomer.district || 'N/A'}, {currentCustomer.state || 'Maharashtra'}</p>
                    {currentCustomer.pinCode && <p className="text-slate-400 font-mono mt-0.5">PIN: {currentCustomer.pinCode}</p>}
                  </div>
                </div>
                {currentCustomer.address && (
                  <div className="pt-2">
                    <p className="text-slate-400 font-medium mb-1">Full Postal Address</p>
                    <p className="font-normal bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg leading-relaxed">{currentCustomer.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Project Details Box */}
            <div className={`p-6 rounded-xl border lg:col-span-2 space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between border-b dark:border-slate-800 border-slate-100 pb-3">
                <h3 className="text-sm uppercase tracking-wider font-mono text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Project Engagement Overview
                </h3>
                {currentCustomer.projectValue && (
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    Est. Value: ₹{currentCustomer.projectValue.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] uppercase font-mono text-slate-400">Project Type</span>
                  <p className="font-semibold text-sm mt-1">{currentCustomer.projectType || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] uppercase font-mono text-slate-400">Area Under Care</span>
                  <p className="font-semibold text-sm mt-1">{currentCustomer.area || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] uppercase font-mono text-slate-400">Primary Crop</span>
                  <p className="font-semibold text-sm mt-1">{currentCustomer.crop || 'N/A'}</p>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 pb-px gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('timeline')}
                  className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all flex items-center gap-2 ${
                    activeSubTab === 'timeline'
                      ? 'border-emerald-600 text-slate-800 dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Activity className="w-4 h-4 text-emerald-600" /> Activity Log & Visits ({customerTimelineEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('files')}
                  className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all flex items-center gap-2 ${
                    activeSubTab === 'files'
                      ? 'border-emerald-600 text-slate-800 dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-600" /> Documents & Vault ({currentCustomer.documents?.length || 0})
                </button>
              </div>

              {/* Sub-tab Content */}
              {activeSubTab === 'timeline' ? (
                <div className="space-y-6">
                  {/* Log New Interaction form */}
                  <div className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
                  }`}>
                    {!isInteractionOpen ? (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold">Log Customer Interaction</h4>
                          <p className="text-[11px] text-slate-400">Record calls, emails, on-site meetings, or general communications with this customer.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsInteractionOpen(true)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Log Interaction
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleAddInteraction} className="space-y-4">
                        <div className="flex items-center justify-between border-b dark:border-slate-800 border-slate-200/60 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-emerald-600" /> Record Client Interaction
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsInteractionOpen(false)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 font-mono">Channel</label>
                            <select
                              value={intType}
                              onChange={(e) => setIntType(e.target.value as any)}
                              className={`w-full text-xs p-2 rounded border focus:outline-none ${
                                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <option value="Call">📞 Phone Call</option>
                              <option value="Meeting">🤝 In-Person Meeting</option>
                              <option value="Site Visit">🚜 Farm / Site Visit</option>
                              <option value="Email">📧 Email</option>
                              <option value="Other">💬 Other Channel</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 font-mono">Assigned Agent / Author</label>
                            <input
                              type="text"
                              placeholder="Enter agent or representative name..."
                              value={intAgentName}
                              onChange={(e) => setIntAgentName(e.target.value)}
                              className={`w-full text-xs p-2 rounded border focus:outline-none ${
                                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 font-mono">Discussion Notes & Outcomes</label>
                          <textarea
                            placeholder="Summarize the interaction, issues raised, agreements made, and next actions..."
                            value={intNotes}
                            onChange={(e) => setIntNotes(e.target.value)}
                            required
                            rows={3}
                            className={`w-full text-xs p-2.5 rounded border focus:outline-none ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsInteractionOpen(false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                              darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingInteraction}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                          >
                            {isSavingInteraction ? 'Saving...' : 'Save Interaction Log'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Timeline Feed */}
                  {customerTimelineEvents.length > 0 ? (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800/80">
                      {customerTimelineEvents.map((event) => {
                        const getTimelineIcon = (type: string) => {
                          switch (type) {
                            case 'interaction':
                              return <MessageSquare className="w-3 h-3" />;
                            case 'agronomy':
                              return <Sprout className="w-3 h-3" />;
                            case 'support':
                              return <ShieldAlert className="w-3 h-3" />;
                            case 'finance':
                              return <DollarSign className="w-3 h-3" />;
                            case 'document':
                              return <FileText className="w-3 h-3" />;
                            default:
                              return <Activity className="w-3 h-3" />;
                          }
                        };

                        const getColorClasses = (color: string) => {
                          switch (color) {
                            case 'emerald':
                              return {
                                bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                                text: 'text-emerald-600 dark:text-emerald-400',
                                border: 'border-emerald-200 dark:border-emerald-800/50'
                              };
                            case 'green':
                              return {
                                bg: 'bg-green-50 dark:bg-green-950/40',
                                text: 'text-green-600 dark:text-green-400',
                                border: 'border-green-200 dark:border-green-800/50'
                              };
                            case 'rose':
                              return {
                                bg: 'bg-rose-50 dark:bg-rose-950/40',
                                text: 'text-rose-600 dark:text-rose-400',
                                border: 'border-rose-200 dark:border-rose-800/50'
                              };
                            case 'blue':
                              return {
                                bg: 'bg-blue-50 dark:bg-blue-950/40',
                                text: 'text-blue-600 dark:text-blue-400',
                                border: 'border-blue-200 dark:border-blue-800/50'
                              };
                            case 'violet':
                              return {
                                bg: 'bg-violet-50 dark:bg-violet-950/40',
                                text: 'text-violet-600 dark:text-violet-400',
                                border: 'border-violet-200 dark:border-violet-800/50'
                              };
                            default:
                              return {
                                bg: 'bg-slate-50 dark:bg-slate-800/40',
                                text: 'text-slate-600 dark:text-slate-400',
                                border: 'border-slate-200 dark:border-slate-800/50'
                              };
                          }
                        };

                        const colors = getColorClasses(event.iconColor);
                        return (
                          <div key={event.id} className="relative group animate-fade-in">
                            {/* Timeline dot & icon */}
                            <div className={`absolute -left-[30px] top-1 w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 ${colors.bg} ${colors.text} ${colors.border} z-10 shadow-sm transition-transform group-hover:scale-110`}>
                              {getTimelineIcon(event.type)}
                            </div>

                            {/* Event content box */}
                            <div className={`p-4 rounded-xl border transition-all ${
                              darkMode ? 'bg-slate-900/30 border-slate-800/60 hover:border-slate-700/80' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                                <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
                                  {event.title}
                                  {event.status && (
                                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${
                                      event.status === 'Resolved' || event.status === 'Paid' || event.status === 'Approved' || event.status === 'Cleared' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                      event.status === 'In Progress' || event.status === 'Sent' || event.status === 'Pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    }`}>
                                      {event.status}
                                    </span>
                                  )}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 font-medium shrink-0">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {event.date}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
                                {event.notes}
                              </p>

                              {/* Conditional Meta / Diagnosis info */}
                              {event.meta && (
                                <div className="mt-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 dark:border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                                  {event.meta}
                                </div>
                              )}

                              {/* Conditional Advisory/Recommendations info */}
                              {event.recommendations && (
                                <div className="mt-2 p-2.5 rounded-lg bg-green-500/5 border border-green-500/10 dark:border-green-500/20 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                  <span className="font-bold text-green-600 dark:text-green-400 uppercase tracking-wider text-[9px] block mb-1 font-mono">Agronomist Recommendation:</span>
                                  {event.recommendations}
                                </div>
                              )}

                              {/* Extra Tag Details or Author */}
                              {(event.author || event.tagLabel) && (
                                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/40 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-medium">
                                  {event.author && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3.5 h-3.5 text-slate-400" /> Logged by: <span className="font-semibold text-slate-500 dark:text-slate-300">{event.author}</span>
                                    </span>
                                  )}
                                  {event.tagLabel && (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px]">
                                      {event.tagLabel}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-10 text-center border border-dashed rounded-lg text-slate-400 dark:border-slate-800 text-xs">
                      📅 No previous activities, agronomy visits, or support history compiled for this customer.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Financing & Capital Structure */}
                  {currentCustomer.projectValue !== undefined && currentCustomer.projectValue > 0 && (
                    <div className="p-5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40 space-y-4">
                      <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                        Financing & Capital Structure
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Loan structure details */}
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 dark:border-blue-500/20 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Loan Amount</span>
                            <p className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                              ₹{((currentCustomer.loanAmount !== undefined) ? currentCustomer.loanAmount : ((currentCustomer.projectValue * (currentCustomer.loanPercentage !== undefined ? currentCustomer.loanPercentage : 80)) / 100)).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {currentCustomer.loanPercentage !== undefined ? currentCustomer.loanPercentage : 80}%
                          </span>
                        </div>

                        {/* Margin structure details */}
                        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 dark:border-indigo-500/20 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Margin Money</span>
                            <p className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                              ₹{((currentCustomer.marginAmount !== undefined) ? currentCustomer.marginAmount : ((currentCustomer.projectValue * (currentCustomer.marginPercentage !== undefined ? currentCustomer.marginPercentage : 20)) / 100)).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            {currentCustomer.marginPercentage !== undefined ? currentCustomer.marginPercentage : 20}%
                          </span>
                        </div>
                      </div>

                      {/* Proportional split bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Loan ({(currentCustomer.loanPercentage !== undefined ? currentCustomer.loanPercentage : 80)}%)</span>
                          <span>Margin ({(currentCustomer.marginPercentage !== undefined ? currentCustomer.marginPercentage : 20)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500" 
                            style={{ width: `${currentCustomer.loanPercentage !== undefined ? currentCustomer.loanPercentage : 80}%` }}
                          />
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500" 
                            style={{ width: `${currentCustomer.marginPercentage !== undefined ? currentCustomer.marginPercentage : 20}%` }}
                          />
                        </div>
                      </div>

                      {/* NHB Subsidy Grant Info */}
                      {currentCustomer.nhbSubsidyEligible && (
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                              NHB Subsidy Grant (50%)
                            </span>
                            <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                              ₹{((currentCustomer.subsidyAmount !== undefined) ? currentCustomer.subsidyAmount : ((currentCustomer.projectValue || 0) * 0.5)).toLocaleString('en-IN')}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1 leading-relaxed">
                              Note: This is a government grant paid directly to the customer's account; it does not reduce the project value, loan, or margin requirement.
                            </span>
                          </div>
                          <span className="shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            NHB Eligible
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {currentCustomer.notes && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Special Directives & Notes</h4>
                      <p className="text-xs p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-lg italic leading-relaxed text-slate-700 dark:text-slate-300">
                        "{currentCustomer.notes}"
                      </p>
                    </div>
                  )}

                  {/* Document management section */}
                  <div className="space-y-4 pt-4 border-t dark:border-slate-800 border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">Document Vault ({currentCustomer.documents?.length || 0} items)</h4>
                      
                      {/* Quick Upload Form */}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          className={`text-xs px-2.5 py-1.5 rounded border focus:outline-none ${
                            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <option value="Aadhaar">Aadhaar Card</option>
                          <option value="PAN">PAN Card</option>
                          <option value="Land Records">Land Records</option>
                          <option value="Bank Documents">Bank Documents</option>
                          <option value="Quotation">Quotation</option>
                          <option value="Estimate">Estimate</option>
                          <option value="DPR">DPR Report</option>
                          <option value="Sanction Letter">Sanction Letter</option>
                          <option value="GOC">GOC Documents</option>
                          <option value="Warranty">Warranty Certificate</option>
                          <option value="Completion Certificate">Completion Cert</option>
                          <option value="Other">Other File</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Custom doc name..."
                          value={uploadName}
                          onChange={(e) => setUploadName(e.target.value)}
                          className={`text-xs px-2.5 py-1.5 rounded border focus:outline-none max-w-[120px] ${
                            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        />

                        <label className="cursor-pointer px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Select File
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Documents Table */}
                    {currentCustomer.documents && currentCustomer.documents.length > 0 ? (
                      <div className="overflow-x-auto border dark:border-slate-800 border-slate-100 rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead className={darkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                            <tr>
                              <th className="p-3">Doc Title</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Uploaded</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                            {currentCustomer.documents.map((docItem) => (
                              <tr key={docItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="p-3 font-medium flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[180px]">{docItem.name}</span>
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                    {docItem.category}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-400 font-mono text-[11px]">{docItem.uploadedAt}</td>
                                <td className="p-3 text-right flex items-center justify-end gap-2">
                                  <a
                                    href={docItem.fileUrl}
                                    download={docItem.name}
                                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors"
                                    title="Download File"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDoc(docItem.id)}
                                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                      title="Delete File"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed rounded-lg text-slate-400 dark:border-slate-800 text-xs">
                        📂 No documents uploaded to this customer vault yet. Select a category and upload.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Customer Engagement Center</h2>
              <p className="text-xs text-slate-400 mt-1">Manage active company relationships, client records, and document vaulting</p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/15 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Add Customer Profile
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-lg border dark:border-slate-800 border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, phone, village..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded border focus:outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}
              />
            </div>

            <select
              value={filterProjectType}
              onChange={(e) => setFilterProjectType(e.target.value)}
              className={`text-xs px-3 py-2 rounded border focus:outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <option value="">All Project Types</option>
              <option value="Polyhouse">Polyhouse</option>
              <option value="Flat Shade Net House">Flat Shade Net House</option>
              <option value="Domb Shape Shade Net House">Domb Shape Shade Net House</option>
              <option value="Hydroponics">Hydroponics</option>
              <option value="Mushroom Chambers">Mushroom Chambers</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`text-xs px-3 py-2 rounded border focus:outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <option value="">All Statuses</option>
              <option value="Lead">Lead Status</option>
              <option value="Active">Active Project</option>
              <option value="Completed">Completed Project</option>
              <option value="Pending">Pending Action</option>
            </select>

            <div className="text-right flex items-center justify-end text-xs text-slate-400 px-1 font-mono">
              Filtered: {filteredCustomers.length} of {customers.length}
            </div>
          </div>

          {/* Customers Table */}
          {filteredCustomers.length > 0 ? (
            <div className="border dark:border-slate-800 border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                    <tr>
                      <th className="p-4 font-semibold">Customer ID</th>
                      <th className="p-4 font-semibold">Name</th>
                      <th className="p-4 font-semibold">Contact Info</th>
                      <th className="p-4 font-semibold">Location (Village / District)</th>
                      <th className="p-4 font-semibold">Project Type & Area</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                    {filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-4 font-mono text-[11px] text-slate-400">{cust.id}</td>
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedCustomerId(cust.id)}
                            className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-left"
                          >
                            {cust.name}
                          </button>
                        </td>
                        <td className="p-4 leading-relaxed font-medium">
                          <p>{cust.phone}</p>
                          {cust.email && <p className="text-slate-400 font-normal text-[10px]">{cust.email}</p>}
                        </td>
                        <td className="p-4 font-medium">
                          {cust.village || 'N/A'}, {cust.district || 'N/A'}
                          <p className="text-[10px] text-slate-400 font-normal">{cust.state || 'Maharashtra'}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold">{cust.projectType || 'N/A'}</p>
                          <p className="text-slate-400 text-[10px] font-normal">Area: {cust.area || 'N/A'}</p>
                          {cust.projectValue ? (
                            <p className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">
                              ₹{cust.projectValue.toLocaleString('en-IN')} ({cust.loanPercentage !== undefined ? cust.loanPercentage : 80}/{cust.marginPercentage !== undefined ? cust.marginPercentage : 20})
                            </p>
                          ) : null}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            cust.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            cust.status === 'Active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {cust.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCustomerId(cust.id)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            title="View Vault & Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(cust.id)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center border border-dashed rounded-xl text-slate-400 dark:border-slate-800 text-xs">
              🔍 No customers found matching search filters.
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Customer Modal Popups */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4">
              {isAddOpen ? 'Add Customer Profile' : 'Edit Customer Profile'}
            </h3>

            <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              {isAddOpen && (
                <div className={`p-4 rounded-xl border border-dashed transition-all ${
                  darkMode ? 'bg-slate-900/60 border-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Auto-Fill via Document (AI Parser)
                    </span>
                    <span className="text-[10px] text-slate-400">PDF or Image (Max 15MB)</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="w-full sm:w-auto shrink-0 cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-colors">
                      <Upload className="w-4 h-4" /> Upload Document
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleDocumentParse}
                        disabled={isParsing}
                      />
                    </label>
                    <div className="text-[11px] text-slate-400 text-center sm:text-left leading-snug">
                      {isParsing ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse flex items-center gap-1">
                          Analyzing document details with Gemini... Please wait...
                        </span>
                      ) : (
                        <span>Upload a registration sheet, land registry form, or agreement to automatically extract name, contact info, crop, and farm details.</span>
                      )}
                    </div>
                  </div>

                  {parseError && (
                    <p className="mt-2 text-xs text-red-500 font-medium">⚠️ {parseError}</p>
                  )}
                  {parseSuccess && (
                    <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ {parseSuccess}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Customer ID (Auto)</label>
                  <input
                    type="text"
                    disabled
                    value={id}
                    className="w-full p-2 text-xs rounded border bg-slate-100 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Mobile Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Village Location</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Project Type</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Polyhouse">Polyhouse</option>
                    <option value="Flat Shade Net House">Flat Shade Net House</option>
                    <option value="Domb Shape Shade Net House">Domb Shape Shade Net House</option>
                    <option value="Hydroponics">Hydroponics</option>
                    <option value="Mushroom Chambers">Mushroom Chambers</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Land Area (e.g. 2 Acres)</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Primary Cultivating Crop</label>
                  <input
                    type="text"
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Relationship Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Lead">Lead Status</option>
                    <option value="Active">Active Project</option>
                    <option value="Completed">Completed Project</option>
                    <option value="Pending">Pending Action</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Estimated Project Value (₹)</label>
                  <input
                    type="number"
                    value={projectValue || ''}
                    onChange={(e) => handleProjectValueChange(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                    placeholder="e.g. 100000"
                  />
                </div>
              </div>

              {/* Loan % & Margin % Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 animate-fadeIn">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">Loan Share (%)</label>
                    <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400">Amt: ₹{loanAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={loanPercentage || ''}
                    onChange={(e) => handleLoanPercentChange(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-white border-slate-200 focus:border-blue-500'
                    }`}
                    placeholder="80"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">Margin Money (%)</label>
                    <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">Amt: ₹{marginAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marginPercentage || ''}
                    onChange={(e) => handleMarginPercentChange(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'
                    }`}
                    placeholder="20"
                  />
                </div>
              </div>

              {/* NHB Subsidy Toggle */}
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/40 bg-emerald-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      id="nhbSubsidyEligible"
                      checked={nhbSubsidyEligible}
                      onChange={(e) => handleSubsidyToggle(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:border-slate-700"
                    />
                    <label htmlFor="nhbSubsidyEligible" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      Enable NHB Govt. Subsidy (50%)
                    </label>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    NHB Scheme
                  </span>
                </div>
                {nhbSubsidyEligible && (
                  <div className="pt-2 border-t border-emerald-100/50 dark:border-emerald-950/20 flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Estimated Direct Grant Amount:</span>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{subsidyAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                  Note: NHB (National Horticulture Board) subsidy is treated purely as a government direct-to-customer grant. It does not reduce the project value, loan, or margin requirement.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Postal Street Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Operational Directives & Custom Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                  className={`px-4 py-2 rounded text-xs font-semibold border ${
                    darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
