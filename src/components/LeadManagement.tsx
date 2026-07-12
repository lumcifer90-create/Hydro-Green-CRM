import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, Phone, Check, AlertCircle, HelpCircle, Mail, MessageSquare, Send, Download, Sparkles, Upload } from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { Lead, CompanySettings } from '../types';
import { generateLeadsReportPDF } from '../utils/pdfGenerator';

interface LeadManagementProps {
  leads: Lead[];
  darkMode: boolean;
  onRefresh: () => void;
  settings: CompanySettings | null;
}

export default function LeadManagement({
  leads,
  darkMode,
  onRefresh,
  settings
}: LeadManagementProps) {
  const savedUserStr = localStorage.getItem('hydrogreen_user');
  const userRole = savedUserStr ? JSON.parse(savedUserStr).role : 'employee';
  const isAdmin = userRole === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Forms state
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('Referral');
  const [date, setDate] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [product, setProduct] = useState('Polyhouse');
  const [budget, setBudget] = useState(0);
  const [expectedClosingDate, setExpectedClosingDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [status, setStatus] = useState<'New' | 'Interested' | 'Follow-up' | 'Won' | 'Lost'>('New');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // New details fields for comprehensive leads
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [area, setArea] = useState('');
  const [crop, setCrop] = useState('');

  // Form Validation
  const [validationError, setValidationError] = useState('');

  // Document Auto-fill Parsing State
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState<string | null>(null);

  // Message Update modal state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedLeadForUpdate, setSelectedLeadForUpdate] = useState<Lead | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');

  const resetForm = () => {
    setId('');
    setName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setSource('Referral');
    setDate(new Date().toISOString().split('T')[0]);
    setMeetingDate('');
    setMeetingNotes('');
    setProduct('Polyhouse');
    setBudget(0);
    setExpectedClosingDate('');
    setFollowUpDate('');
    setStatus('New');
    setRejectionReason('');
    setAddress('');
    setVillage('');
    setDistrict('');
    setState('');
    setPinCode('');
    setArea('');
    setCrop('');
    setValidationError('');
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
            type: 'lead'
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
        if (parsed.source) setSource(parsed.source);
        if (parsed.product) setProduct(parsed.product);
        if (parsed.budget) setBudget(Number(parsed.budget));
        if (parsed.address) setAddress(parsed.address);
        if (parsed.village) setVillage(parsed.village);
        if (parsed.district) setDistrict(parsed.district);
        if (parsed.state) setState(parsed.state);
        if (parsed.pinCode) setPinCode(parsed.pinCode);
        if (parsed.area) setArea(parsed.area);
        if (parsed.crop) setCrop(parsed.crop);
        if (parsed.meetingNotes) setMeetingNotes(parsed.meetingNotes);

        setParseSuccess(`Extracted profile for "${parsed.name || 'Prospect'}" successfully!`);
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
    setId('LEAD-' + Math.floor(1000 + Math.random() * 9000));
    setIsAddOpen(true);
  };

  const handleOpenEdit = (l: Lead) => {
    setId(l.id);
    setName(l.name);
    setPhone(l.phone);
    setWhatsapp(l.whatsapp || '');
    setEmail(l.email || '');
    setSource(l.source);
    setDate(l.date);
    setMeetingDate(l.meetingDate || '');
    setMeetingNotes(l.meetingNotes || '');
    setProduct(l.product);
    setBudget(l.budget || 0);
    setExpectedClosingDate(l.expectedClosingDate || '');
    setFollowUpDate(l.followUpDate || '');
    setStatus(l.status);
    setRejectionReason(l.rejectionReason || '');
    setAddress(l.address || '');
    setVillage(l.village || '');
    setDistrict(l.district || '');
    setState(l.state || '');
    setPinCode(l.pinCode || '');
    setArea(l.area || '');
    setCrop(l.crop || '');
    setValidationError('');
    setIsEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setValidationError("Name and Phone are mandatory fields.");
      return;
    }
    if (status === 'Lost' && !rejectionReason.trim()) {
      setValidationError("Rejection reason must be provided for lost leads.");
      return;
    }

    try {
      const data: Lead = {
        id,
        name,
        phone,
        whatsapp,
        email,
        source,
        date,
        meetingDate: meetingDate || undefined,
        meetingNotes: meetingNotes || undefined,
        product,
        budget: Number(budget),
        expectedClosingDate: expectedClosingDate || undefined,
        followUpDate: followUpDate || undefined,
        status,
        rejectionReason: status === 'Lost' ? rejectionReason : undefined,
        address: address || undefined,
        village: village || undefined,
        district: district || undefined,
        state: state || undefined,
        pinCode: pinCode || undefined,
        area: area || undefined,
        crop: crop || undefined,
        createdAt: new Date().toISOString().split('T')[0]
      };

      await setDoc(doc(db, 'leads', id), cleanUndefined(data));
      setIsAddOpen(false);
      setIsEditOpen(false);
      resetForm();
      onRefresh();
    } catch (err) {
      console.error("Error writing lead:", err);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      onRefresh();
    } catch (err) {
      console.error("Error deleting lead:", err);
    }
  };

  const handleExportLeadsPDF = () => {
    generateLeadsReportPDF(filteredLeads, settings);
  };

  // Filters
  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.product.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = filterSource ? l.source === filterSource : true;
    const matchesStatus = filterStatus ? l.status === filterStatus : true;

    return matchesSearch && matchesSource && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Leads Pipeline</h2>
          <p className="text-xs text-slate-400 mt-1">Capture, audit, and follow up with hot/cold prospective farming projects</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportLeadsPDF}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Export leads list with address, number, name, area, etc."
          >
            <Download className="w-4 h-4 text-emerald-600" /> Export Full Leads (PDF)
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/15 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Inquiry Lead
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-lg border dark:border-slate-800 border-slate-100">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by lead name, phone, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded border focus:outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
          />
        </div>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className={`text-xs px-3 py-2 rounded border focus:outline-none ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <option value="">All Capture Sources</option>
          <option value="Referral">Referral</option>
          <option value="Social Media">Social Media</option>
          <option value="Exhibition">Agricultural Exhibition</option>
          <option value="Direct Visit">Direct Field Visit</option>
          <option value="Other">Other</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`text-xs px-3 py-2 rounded border focus:outline-none ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <option value="">All Lead Statuses</option>
          <option value="New">New Inquiry</option>
          <option value="Interested">Interested / Pre-Qualified</option>
          <option value="Follow-up">In Active Follow-up</option>
          <option value="Won">Won (Created Customer)</option>
          <option value="Lost">Lost Inquiry</option>
        </select>
      </div>

      {/* Leads Table */}
      {filteredLeads.length > 0 ? (
        <div className="border dark:border-slate-800 border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                <tr>
                  <th className="p-4 font-semibold">Lead ID</th>
                  <th className="p-4 font-semibold">Lead Contact</th>
                  <th className="p-4 font-semibold">Capture Source / Date</th>
                  <th className="p-4 font-semibold">Product & Budget</th>
                  <th className="p-4 font-semibold">Audit Timelines</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                {filteredLeads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-4 font-mono text-[11px] text-slate-400">{l.id}</td>
                    <td className="p-4 leading-relaxed font-semibold">
                      <p className="text-slate-900 dark:text-slate-100">{l.name}</p>
                      <div className="flex flex-col gap-1 mt-1 text-[10px] font-normal text-slate-400">
                        <span className="flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {l.phone}
                        </span>
                        {l.whatsapp && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold" title="WhatsApp Number">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            WA: {l.whatsapp}
                          </span>
                        )}
                        {l.email && (
                          <span className="flex items-center gap-1 text-slate-400" title="Gmail / Email">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{l.email}</span>
                          </span>
                        )}
                        {(l.address || l.village || l.district || l.state) && (
                          <span className="flex items-start gap-1 mt-1 text-[10px] text-slate-500 font-medium" title="Location / Address">
                            <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="line-clamp-2">
                              {[l.address, l.village, l.district, l.state].filter(Boolean).join(', ')}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium">
                      {l.source}
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">Captured: {l.date}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{l.product}</p>
                      <div className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5 space-y-0.5">
                        <p>Budget: {l.budget ? `₹${l.budget.toLocaleString('en-IN')}` : 'Not Specified'}</p>
                        {l.area && <p className="text-emerald-600 dark:text-emerald-400 font-bold">Area: {l.area}</p>}
                        {l.crop && <p className="italic text-slate-400">Crop: {l.crop}</p>}
                      </div>
                    </td>
                    <td className="p-4 text-[11px] space-y-1">
                      {l.followUpDate && (
                        <p className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Follow-up: <span className="font-semibold text-slate-700 dark:text-slate-300">{l.followUpDate}</span>
                        </p>
                      )}
                      {l.meetingDate && (
                        <p className="flex items-center gap-1 text-slate-400">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Meeting: <span>{l.meetingDate}</span>
                        </p>
                      )}
                      {!l.followUpDate && !l.meetingDate && <span className="text-slate-400 italic">No future dates set</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        l.status === 'Won' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        l.status === 'Lost' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                        l.status === 'Follow-up' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        l.status === 'Interested' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {l.status}
                      </span>
                      {l.status === 'Lost' && l.rejectionReason && (
                        <p className="text-[10px] text-red-500 mt-1 max-w-[140px] truncate" title={l.rejectionReason}>
                          Reason: {l.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedLeadForUpdate(l);
                          setSelectedTemplate('welcome');
                          setCustomMessage(
`*Subject: Inquiry Acknowledgment: Your ${l.product || 'Polyhouse'} Setup with HydroGreen Energy*

Dear Mr./Ms. ${l.name},

Thank you for reaching out to HydroGreen Energy Pvt Ltd. We have successfully received and registered your inquiry regarding a new *${l.product || 'Polyhouse'}* setup.

At HydroGreen, we know that a highly productive agricultural project requires comprehensive planning—from structural feasibility to optimized crop yield. Our technical team is currently reviewing your site preferences and capacity requirements to ensure we design the most effective solution for your needs.

To provide you with the highest level of personalized support and technical guidance, your inquiry has been routed directly to our central headquarters. We are pleased to inform you that a dedicated specialist from our *Head Office* has been assigned to oversee your project.

Your designated *Senior Executive & Modern Agriculture Expert* is:

* *Name:* Mr. Ambrish Pratap Singh (Head Office)
* *Mobile Number:* 8126122648

Mr. Singh will contact you shortly to schedule an initial consultation, discuss your requirements in detail, and outline the next steps for your project. Should you have any immediate questions in the meantime, please feel free to reach out to him directly.

Thank you for choosing HydroGreen Energy Pvt Ltd as your partner in advanced agricultural solutions. We look forward to working with you to build a successful and thriving project.

Warm regards,

*HydroGreen Energy Pvt Ltd*
_Head Office_
J-3 Shankar Square, Khatu Shyam Mandir,
Agra, Uttar Pradesh
_Premier Agricultural Solutions_
*GSTIN:* 09AAHCH3942A1ZT`
                          );
                          setIsUpdateModalOpen(true);
                        }}
                        className="mr-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 font-bold rounded text-[10px] flex items-center gap-1 transition-all"
                        title="Contact & Send Work Update"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Update & Message</span>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(l)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        title="Edit Lead"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500"
                          title="Delete Lead"
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
          🔍 No inquiry leads found matching filters.
        </div>
      )}

      {/* Add / Edit Lead Dialogue */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-xl rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4">
              {isAddOpen ? 'Add Prospective Inquiry Lead' : 'Edit Inquiry Lead Details'}
            </h3>

            {validationError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                        <span>Upload an inquiry sheet, RFP, or site survey doc to automatically extract contact info, crop, and location.</span>
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
                  <label className="block text-xs font-semibold mb-1">Lead ID (Auto)</label>
                  <input
                    type="text"
                    disabled
                    value={id}
                    className="w-full p-2 text-xs rounded border bg-slate-100 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Contact Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter prospect name"
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
                    placeholder="Enter phone number"
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
                    placeholder="Same or other number"
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
                    placeholder="prospect@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Inquiry Capture Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Referral">Referral</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Exhibition">Agricultural Exhibition</option>
                    <option value="Direct Visit">Direct Field Visit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Inquiry Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Interested Product</label>
                  <select
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
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
                  <label className="block text-xs font-semibold mb-1">Estimated Budget (₹)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Expected Closing Date</label>
                  <input
                    type="date"
                    value={expectedClosingDate}
                    onChange={(e) => setExpectedClosingDate(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Lead status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="New">New Inquiry</option>
                    <option value="Interested">Interested / Qualified</option>
                    <option value="Follow-up">In Active Follow-up</option>
                    <option value="Won">Won (Created Customer)</option>
                    <option value="Lost">Lost Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Meeting Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                {/* Advanced geographic / crop details */}
                <div className="col-span-1 sm:col-span-2 border-t dark:border-slate-800 border-slate-100 pt-4 mt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 font-mono">
                    Geographic & Crop Details (Full Lead Data)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Land Area (e.g. 2 Acres, 1000 sqm)</label>
                      <input
                        type="text"
                        placeholder="Enter project land area"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className={`w-full p-2 text-xs rounded border focus:outline-none ${
                          darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Target Crop (e.g. Cherry Tomato, Strawberry)</label>
                      <input
                        type="text"
                        placeholder="Enter planned crop"
                        value={crop}
                        onChange={(e) => setCrop(e.target.value)}
                        className={`w-full p-2 text-xs rounded border focus:outline-none ${
                          darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="House / Plot / Street details"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={`w-full p-2 text-xs rounded border focus:outline-none ${
                          darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Village / Town</label>
                      <input
                        type="text"
                        placeholder="Village name"
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
                        placeholder="District"
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
                        placeholder="State"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className={`w-full p-2 text-xs rounded border focus:outline-none ${
                          darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Pincode</label>
                      <input
                        type="text"
                        placeholder="6-digit pincode"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        className={`w-full p-2 text-xs rounded border focus:outline-none ${
                          darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Meeting & Negotiation Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record summary of customer meetings..."
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              {status === 'Lost' && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-red-500">Rejection Reason *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide specific reason why the inquiry was marked lost..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>
              )}

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
                  Save Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Update & Contact Modal */}
      {isUpdateModalOpen && selectedLeadForUpdate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>Send Update & Contact Lead</span>
            </h3>

            <div className="space-y-4">
              {/* Recipient Details */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs space-y-1">
                <p><strong className="text-slate-500 dark:text-slate-400">Recipient Name:</strong> {selectedLeadForUpdate.name}</p>
                <p><strong className="text-slate-500 dark:text-slate-400">Primary Phone:</strong> {selectedLeadForUpdate.phone}</p>
                {selectedLeadForUpdate.whatsapp && (
                  <p><strong className="text-slate-500 dark:text-slate-400">WhatsApp Number:</strong> {selectedLeadForUpdate.whatsapp}</p>
                )}
                {selectedLeadForUpdate.email && (
                  <p><strong className="text-slate-500 dark:text-slate-400">Gmail / Email:</strong> {selectedLeadForUpdate.email}</p>
                )}
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-semibold mb-1">Choose Message Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    const t = e.target.value;
                    setSelectedTemplate(t);
                    let text = '';
                    if (t === 'welcome') {
                      text = `*Subject: Inquiry Acknowledgment: Your ${selectedLeadForUpdate.product || 'Polyhouse'} Setup with HydroGreen Energy*

Dear Mr./Ms. ${selectedLeadForUpdate.name},

Thank you for reaching out to HydroGreen Energy Pvt Ltd. We have successfully received and registered your inquiry regarding a new *${selectedLeadForUpdate.product || 'Polyhouse'}* setup.

At HydroGreen, we know that a highly productive agricultural project requires comprehensive planning—from structural feasibility to optimized crop yield. Our technical team is currently reviewing your site preferences and capacity requirements to ensure we design the most effective solution for your needs.

To provide you with the highest level of personalized support and technical guidance, your inquiry has been routed directly to our central headquarters. We are pleased to inform you that a dedicated specialist from our *Head Office* has been assigned to oversee your project.

Your designated *Senior Executive & Modern Agriculture Expert* is:

* *Name:* Mr. Ambrish Pratap Singh (Head Office)
* *Mobile Number:* 8126122648

Mr. Singh will contact you shortly to schedule an initial consultation, discuss your requirements in detail, and outline the next steps for your project. Should you have any immediate questions in the meantime, please feel free to reach out to him directly.

Thank you for choosing HydroGreen Energy Pvt Ltd as your partner in advanced agricultural solutions. We look forward to working with you to build a successful and thriving project.

Warm regards,

*HydroGreen Energy Pvt Ltd*
_Head Office_
J-3 Shankar Square, Khatu Shyam Mandir,
Agra, Uttar Pradesh
_Premier Agricultural Solutions_
*GSTIN:* 09AAHCH3942A1ZT`;
                    } else if (t === 'audit') {
                      text = `*Technical Site Audit Schedule*

Dear Mr./Ms. ${selectedLeadForUpdate.name},

We are pleased to inform you that our technical division has scheduled a comprehensive site audit for your proposed *${selectedLeadForUpdate.product || 'Agricultural Solutions'}* installation.

*Scheduled Date:* ${selectedLeadForUpdate.meetingDate || '[Audit Date]'}
*Key Objectives:* Technical feasibility study, soil/topographic profiling, and water footprint mapping.

Our Lead Technical Auditor will coordinate with you directly prior to arrival. We look forward to establishing a precise blueprint for your project.

Warm regards,

*HydroGreen Energy Pvt Ltd*  
_Premier Agricultural Solutions_`;
                    } else if (t === 'estimate') {
                      text = `*Proposal & Budget Estimate Ready*

Dear Mr./Ms. ${selectedLeadForUpdate.name},

Our design and engineering division has finalized the customized technical proposal and cost estimate for your proposed *${selectedLeadForUpdate.product || 'Agricultural Solutions'}* setup.

We have optimized all structural parameters to ensure peak operational output and maximum environmental durability. Our team will share the complete document dossier via email shortly.

We look forward to discussing the next phase of our partnership.

Warm regards,

*HydroGreen Energy Pvt Ltd*  
_Premier Agricultural Solutions_`;
                    } else if (t === 'progress') {
                      text = `*Project Prep & Procurement Update*

Dear Mr./Ms. ${selectedLeadForUpdate.name},

We are pleased to share a progress update regarding your proposed *${selectedLeadForUpdate.product || 'Agricultural Solutions'}* project.

Our procurement and assembly units are actively preparing the initial materials, logistics, and technical components. We are fully committed to executing your project with the highest standards of craftsmanship.

We will keep you informed of all critical milestones as they arise.

Warm regards,

*HydroGreen Energy Pvt Ltd*  
_Premier Agricultural Solutions_`;
                    } else {
                      text = '';
                    }
                    setCustomMessage(text);
                  }}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <option value="welcome">Inquiry Welcome & Greetings</option>
                  <option value="audit">Technical Site Audit Schedule</option>
                  <option value="estimate">Budget Estimate / Technical Proposal Ready</option>
                  <option value="progress">Work In-Progress Status Update</option>
                  <option value="custom">Blank / Custom Message</option>
                </select>
              </div>

              {/* Message Content Area */}
              <div>
                <label className="block text-xs font-semibold mb-1">Edit Message Content</label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type custom message to send..."
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              {/* Dispatch Action Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    const phoneVal = selectedLeadForUpdate.whatsapp || selectedLeadForUpdate.phone;
                    const cleanPhone = phoneVal.replace(/[^0-9]/g, '');
                    const finalPhone = (cleanPhone.length === 10) ? `91${cleanPhone}` : cleanPhone;
                    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(customMessage)}`;
                    window.open(url, '_blank');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Message</span>
                </button>

                <button
                  disabled={!selectedLeadForUpdate.email}
                  onClick={() => {
                    if (!selectedLeadForUpdate.email) return;
                    const url = `mailto:${selectedLeadForUpdate.email}?subject=${encodeURIComponent('HydroGreen Project Update')}&body=${encodeURIComponent(customMessage)}`;
                    window.location.href = url;
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                  <span>Compose Gmail Update</span>
                </button>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t dark:border-slate-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsUpdateModalOpen(false); setSelectedLeadForUpdate(null); }}
                  className={`px-4 py-2 rounded text-xs font-semibold border ${
                    darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Close Dialogue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
