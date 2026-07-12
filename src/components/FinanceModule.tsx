import React, { useState } from 'react';
import { 
  Plus, Search, DollarSign, FileText, TrendingUp, AlertCircle, 
  Trash2, Landmark, CheckCircle, Receipt, ArrowDownRight, Briefcase 
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { FinanceRecord, Customer, Project, FinanceItem } from '../types';

interface FinanceModuleProps {
  finance: FinanceRecord[];
  customers: Customer[];
  projects: Project[];
  darkMode: boolean;
  onRefresh: () => void;
}

export default function FinanceModule({
  finance,
  customers,
  projects,
  darkMode,
  onRefresh
}: FinanceModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Forms state
  const [id, setId] = useState('');
  const [type, setType] = useState<'Quotation' | 'Estimate' | 'Invoice' | 'Expense' | 'PaymentReceived'>('Quotation');
  const [number, setNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [status, setStatus] = useState('Draft');
  const [remarks, setRemarks] = useState('');

  // Item lines state for complex docs
  const [itemLines, setItemLines] = useState<FinanceItem[]>([]);
  const [lineDesc, setLineDesc] = useState('');
  const [lineQty, setLineQty] = useState(1);
  const [linePrice, setLinePrice] = useState(0);

  const resetForm = () => {
    setId('');
    setType('Quotation');
    setNumber('');
    setCustomerId('');
    setProjectId('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount(0);
    setStatus('Draft');
    setRemarks('');
    setItemLines([]);
    setLineDesc('');
    setLineQty(1);
    setLinePrice(0);
  };

  const handleOpenAdd = () => {
    resetForm();
    const randId = 'FIN-' + Math.floor(1000 + Math.random() * 9000);
    setId(randId);
    setNumber(type === 'Quotation' ? 'QT-2026-' + Math.floor(100 + Math.random() * 900) : 
              type === 'Invoice' ? 'INV-2026-' + Math.floor(100 + Math.random() * 900) : 
              'REC-2026-' + Math.floor(100 + Math.random() * 900));
    if (customers.length > 0) {
      setCustomerId(customers[0].id);
    }
    if (projects.length > 0) {
      setProjectId(projects[0].id);
    }
    setIsAddOpen(true);
  };

  // Adjusts the default number format on type change
  const handleTypeChange = (newType: any) => {
    setType(newType);
    setNumber(newType === 'Quotation' ? 'QT-2026-' + Math.floor(100 + Math.random() * 900) : 
              newType === 'Invoice' ? 'INV-2026-' + Math.floor(100 + Math.random() * 900) : 
              newType === 'Estimate' ? 'EST-2026-' + Math.floor(100 + Math.random() * 900) : 
              newType === 'Expense' ? 'EXP-2026-' + Math.floor(100 + Math.random() * 900) : 
              'PAY-2026-' + Math.floor(100 + Math.random() * 900));
    setStatus(newType === 'PaymentReceived' ? 'Cleared' : newType === 'Expense' ? 'Paid' : 'Draft');
  };

  const handleAddLine = () => {
    if (!lineDesc) return;
    const lineTotal = Number(lineQty) * Number(linePrice);
    const newLine: FinanceItem = {
      description: lineDesc,
      qty: Number(lineQty),
      unitPrice: Number(linePrice),
      total: lineTotal
    };
    const updatedLines = [...itemLines, newLine];
    setItemLines(updatedLines);
    
    // Auto calculate aggregate amount
    const totalSum = updatedLines.reduce((sum, line) => sum + line.total, 0);
    setAmount(totalSum);

    setLineDesc('');
    setLineQty(1);
    setLinePrice(0);
  };

  const handleRemoveLine = (idx: number) => {
    const updatedLines = itemLines.filter((_, i) => i !== idx);
    setItemLines(updatedLines);
    const totalSum = updatedLines.reduce((sum, line) => sum + line.total, 0);
    setAmount(totalSum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || amount <= 0) return;

    let customerName = '';
    if (customerId) {
      const selectedCust = customers.find(c => c.id === customerId);
      if (selectedCust) customerName = selectedCust.name;
    }

    try {
      const newRecord: FinanceRecord = {
        id,
        type,
        number,
        customerId: customerId || undefined,
        projectId: projectId || undefined,
        customerName: customerName || undefined,
        date,
        amount: Number(amount),
        status,
        items: itemLines.length > 0 ? itemLines : undefined,
        remarks: remarks || undefined,
        createdAt: new Date().toISOString().split('T')[0]
      };

      await setDoc(doc(db, 'finance', id), cleanUndefined(newRecord));
      setIsAddOpen(false);
      resetForm();
      onRefresh();
    } catch (err) {
      console.error("Error writing finance record:", err);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!window.confirm("Are you sure you want to delete this financial ledger record?")) return;
    try {
      await deleteDoc(doc(db, 'finance', recordId));
      onRefresh();
    } catch (err) {
      console.error("Error deleting finance record:", err);
    }
  };

  // Computations for KPI cards
  const invoicedTotal = finance.filter(f => f.type === 'Invoice' && f.status !== 'Void').reduce((sum, f) => sum + f.amount, 0);
  const collectedTotal = finance.filter(f => f.type === 'PaymentReceived' && f.status === 'Cleared').reduce((sum, f) => sum + f.amount, 0);
  const unpaidTotal = finance.filter(f => f.type === 'Invoice' && f.status === 'Pending').reduce((sum, f) => sum + f.amount, 0);
  const expensesTotal = finance.filter(f => f.type === 'Expense' && f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
  const profitMargin = collectedTotal - expensesTotal;

  // Filter
  const filteredFinance = finance.filter(f => {
    const matchesSearch = 
      f.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.customerName && f.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.remarks && f.remarks.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType ? f.type === filterType : true;
    return matchesSearch && matchesType;
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Financial ledgers & Costing</h2>
          <p className="text-xs text-slate-400 mt-1">Audit customer quotations, estimates, invoice registers, operations expenses, and collections ledger</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/15 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Log Transaction / Doc
        </button>
      </div>

      {/* Financial Summary Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Total Invoiced</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-sans">₹{invoicedTotal.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Approved billings</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Total Collected</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-sans text-emerald-600 dark:text-emerald-400">₹{collectedTotal.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">In bank accounts</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Uncollected</span>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-sans text-orange-500">₹{unpaidTotal.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Outstanding payments</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Expenses Logged</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-sans text-rose-500">₹{expensesTotal.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Materials, logistics, labor</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Profit Margin</span>
            <DollarSign className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-3">
            <h3 className={`text-xl font-bold font-sans ${profitMargin >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'}`}>
              ₹{profitMargin.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Revenue - Expenses</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-lg border dark:border-slate-800 border-slate-100">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice/quotation number, client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded border focus:outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={`text-xs px-3 py-2 rounded border focus:outline-none ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <option value="">All Document Types</option>
          <option value="Quotation">Quotations</option>
          <option value="Estimate">Estimates</option>
          <option value="Invoice">Invoices Register</option>
          <option value="Expense">Operations Expenses</option>
          <option value="PaymentReceived">Payments Received</option>
        </select>
      </div>

      {/* Financial records table list */}
      {filteredFinance.length > 0 ? (
        <div className="border dark:border-slate-800 border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold">Doc Number</th>
                  <th className="p-4 font-semibold">Client/Project Connection</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                {filteredFinance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-4 font-mono text-slate-400">{rec.date}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        rec.type === 'Quotation' ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300' :
                        rec.type === 'Estimate' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
                        rec.type === 'Invoice' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                        rec.type === 'Expense' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}>
                        {rec.type === 'PaymentReceived' ? 'Receipt' : rec.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-semibold">{rec.number}</td>
                    <td className="p-4 font-medium">
                      {rec.customerName ? rec.customerName : <span className="text-slate-400 italic">No Client</span>}
                      {rec.projectId && <p className="text-[10px] text-slate-400 font-normal">Proj: {rec.projectId}</p>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'Paid' || rec.status === 'Cleared' || rec.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        rec.status === 'Pending' || rec.status === 'Sent' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-sm">
                      ₹{rec.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete Ledger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center border border-dashed rounded-xl text-slate-400 dark:border-slate-800 text-xs">
          🔍 No financial records matching query found.
        </div>
      )}

      {/* Log Transaction Dialogue */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-xl rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4">
              Create Financial Entry
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Document Category</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as any)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Quotation">Quotation</option>
                    <option value="Estimate">Estimate</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Expense">Expense</option>
                    <option value="PaymentReceived">Payment Received (Receipt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Doc Number / Reference *</label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Associate Customer</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="">-- Optional / None --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Associate Active Project</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="">-- Optional / None --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.projectName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Workflow Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent to Client</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Payment Pending</option>
                    <option value="Paid">Fully Paid</option>
                    <option value="Cleared">Cleared (Bank Transferred)</option>
                    <option value="Void">Void / Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Line items additions (Only for Quotations/Invoices/Estimates) */}
              {(type === 'Quotation' || type === 'Invoice' || type === 'Estimate') && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 border border-dashed dark:border-slate-800 border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">Add Itemized Lines</h4>
                  
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Line Description..."
                      value={lineDesc}
                      onChange={(e) => setLineDesc(e.target.value)}
                      className={`text-xs p-1.5 rounded border focus:outline-none flex-1 min-w-[150px] ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={lineQty}
                      onChange={(e) => setLineQty(Number(e.target.value))}
                      className={`text-xs p-1.5 rounded border focus:outline-none w-[50px] ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={linePrice}
                      onChange={(e) => setLinePrice(Number(e.target.value))}
                      className={`text-xs p-1.5 rounded border focus:outline-none w-[100px] ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white font-semibold rounded text-xs hover:bg-slate-600 transition-colors"
                    >
                      Add Line
                    </button>
                  </div>

                  {itemLines.length > 0 && (
                    <div className="space-y-1.5 pt-2 max-h-[120px] overflow-y-auto pr-1">
                      {itemLines.map((line, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-medium p-1.5 rounded bg-white dark:bg-slate-900 border dark:border-slate-800">
                          <span className="truncate">{line.description} (x{line.qty})</span>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="font-bold text-slate-700 dark:text-slate-300">₹{line.total.toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-red-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">Total Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  disabled={itemLines.length > 0}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Transaction remarks / payment terms</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared via Bank IMPS"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
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
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
