import React, { useState } from 'react';
import { 
  Users, TrendingUp, GitBranch, ShieldAlert, DollarSign, 
  Sprout, Calendar, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  Map, FileCheck, Landmark, CheckCircle, Activity, Search,
  Sparkles, Compass, ChevronDown, ChevronUp, Copy, Check, 
  MessageSquare, Info, ArrowRight, HelpCircle, ShoppingCart
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, Area, 
  Bar, 
  Line, 
  XAxis, YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart
} from 'recharts';
import { Customer, Lead, Project, InventoryItem, FinanceRecord, SupportTicket } from '../types';

interface DashboardProps {
  customers: Customer[];
  leads: Lead[];
  projects: Project[];
  inventory: InventoryItem[];
  finance: FinanceRecord[];
  support: SupportTicket[];
  setActiveTab: (tab: string) => void;
  setGlobalSearch: (search: string) => void;
  darkMode: boolean;
}

export default function Dashboard({
  customers,
  leads,
  projects,
  inventory,
  finance,
  support,
  setActiveTab,
  setGlobalSearch,
  darkMode
}: DashboardProps) {

  // Business Trends views
  const [trendsView, setTrendsView] = useState<'all' | 'revenue' | 'support'>('all');

  // Compute 6-Month rolling Revenue & Expenses (Cash Flow)
  const monthlyRevenueData = React.useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dataMap: { [key: string]: { monthKey: string; name: string; revenue: number; cashCollected: number; expenses: number } } = {};
    const today = new Date("2026-07-09");
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      dataMap[monthKey] = {
        monthKey,
        name,
        revenue: 0,
        cashCollected: 0,
        expenses: 0
      };
    }

    finance.forEach(record => {
      if (!record.date) return;
      const monthKey = record.date.substring(0, 7); // "YYYY-MM"
      
      if (dataMap[monthKey]) {
        if (record.type === 'Invoice' && (record.status === 'Paid' || record.status === 'Sent')) {
          dataMap[monthKey].revenue += record.amount;
        } else if (record.type === 'PaymentReceived' && (record.status === 'Cleared' || record.status === 'Paid')) {
          dataMap[monthKey].cashCollected += record.amount;
        } else if (record.type === 'Expense' && record.status === 'Paid') {
          dataMap[monthKey].expenses += record.amount;
        }
      }
    });

    return Object.values(dataMap);
  }, [finance]);

  // Compute 6-Month rolling Support SLA resolution speed
  const supportSlaData = React.useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dataMap: { [key: string]: { monthKey: string; name: string; avgDays: number; totalResolved: number; totalOpened: number } } = {};
    const today = new Date("2026-07-09");
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      dataMap[monthKey] = {
        monthKey,
        name,
        avgDays: 0,
        totalResolved: 0,
        totalOpened: 0
      };
    }

    const ticketsByMonth: { [key: string]: number[] } = {};

    support.forEach(ticket => {
      if (!ticket.createdAt) return;
      const monthKey = ticket.createdAt.substring(0, 7);
      
      if (dataMap[monthKey]) {
        dataMap[monthKey].totalOpened += 1;
        
        if (ticket.status === 'Resolved') {
          const regDateStr = ticket.createdAt;
          let resDateStr = ticket.visitDate || ticket.createdAt;
          
          const resolvedHistoryItem = ticket.history?.find(h => h.status === 'Resolved');
          if (resolvedHistoryItem) {
            resDateStr = resolvedHistoryItem.date;
          }
          
          const regDate = new Date(regDateStr);
          const resDate = new Date(resDateStr);
          const diffTime = resDate.getTime() - regDate.getTime();
          let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 0) diffDays = 0;
          if (diffDays === 0) diffDays = 1; // standard same day SLA representation

          if (!ticketsByMonth[monthKey]) {
            ticketsByMonth[monthKey] = [];
          }
          ticketsByMonth[monthKey].push(diffDays);
          dataMap[monthKey].totalResolved += 1;
        }
      }
    });

    Object.keys(ticketsByMonth).forEach(monthKey => {
      if (dataMap[monthKey]) {
        const daysList = ticketsByMonth[monthKey];
        const sum = daysList.reduce((acc, d) => acc + d, 0);
        dataMap[monthKey].avgDays = daysList.length > 0 ? parseFloat((sum / daysList.length).toFixed(1)) : 0;
      }
    });

    return Object.values(dataMap);
  }, [support]);

  // Computations
  const totalCustomers = customers.length;
  const totalLeads = leads.length;
  
  const runningProjects = projects.filter(p => p.currentStage !== 'Completed' && p.currentStage !== 'Lead').length;
  const completedProjects = projects.filter(p => p.currentStage === 'Completed').length;
  const pendingProjects = projects.filter(p => p.currentStage === 'Lead' || p.currentStage === 'Documentation').length;
  
  const totalProjectValue = projects.reduce((sum, p) => sum + (p.totalValue || 0), 0);
  const totalAreaCovered = projects.reduce((sum, p) => sum + (p.areaCovered || 0), 0);

  // Today's Follow-ups
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysFollowups = leads.filter(l => l.followUpDate === todayStr && l.status !== 'Won' && l.status !== 'Lost');

  // Pending Documents
  const pendingDocsCount = customers.reduce((count, cust) => {
    // If we assume a customer should have certain categories like Aadhaar, PAN, Land Records etc.
    const uploadedCategories = cust.documents?.map(d => d.category) || [];
    const required = ["Aadhaar", "PAN", "Land Records"];
    const missing = required.filter(r => !uploadedCategories.includes(r));
    return count + missing.length;
  }, 0);

  // Bank Pending
  const bankPending = projects.filter(p => p.currentStage === 'Bank Application').length;

  // GOC Pending
  const gocPending = projects.filter(p => p.currentStage === 'GOC Application' || p.currentStage === 'GOC Approval').length;

  // Payments
  const invoices = finance.filter(f => f.type === 'Invoice');
  const pendingPayments = invoices.filter(f => f.status === 'Pending').reduce((sum, i) => sum + i.amount, 0);
  const completedPayments = invoices.filter(f => f.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);

  // Active Complaints
  const activeComplaints = support.filter(s => s.status !== 'Resolved').length;

  // Low Inventory Items
  const lowInventoryItems = inventory.filter(i => i.availableQty <= i.minStockLevel);

  // Recent activities list builder
  const recentActivities = [
    ...customers.map(c => ({ type: 'customer', title: `New Customer Added: ${c.name}`, date: c.createdAt, desc: `${c.projectType} • ${c.village}, ${c.district}` })),
    ...leads.map(l => ({ type: 'lead', title: `Lead Inquired: ${l.name}`, date: l.createdAt, desc: `Source: ${l.source} • Interest: ${l.product}` })),
    ...projects.map(p => ({ type: 'project', title: `Project Started: ${p.projectName}`, date: p.startDate || p.createdAt, desc: `Stage: ${p.currentStage}` })),
    ...support.map(s => ({ type: 'support', title: `Complaint Lodged: ${s.customerName}`, date: s.createdAt, desc: s.complaint }))
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // Render SVG mini bar chart for monthly lead sources
  const leadSources = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const leadSourceColors: { [key: string]: string } = {
    Referral: '#059669', // emerald
    'Social Media': '#3b82f6', // blue
    Exhibition: '#eab308', // yellow
    'Direct Visit': '#ec4899', // pink
    Other: '#6b7280' // gray
  };

  return (
    <div className="space-y-8 animate-fade-in p-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className={`p-6 rounded-2xl border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-emerald-50/50 border-emerald-100'
      }`}>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
            Hydrogreen Operations Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time management portal for Hydrogreen Energy Pvt. Ltd.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => { setActiveTab('leads'); }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            + Create New Lead
          </button>
          <button 
            onClick={() => { setActiveTab('customers'); }}
            className="px-3.5 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            Manage Customers
          </button>
        </div>
      </div>

      {/* Grid of Key Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Row 1 */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Total Customers</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans">{totalCustomers}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Active relationships</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Total Leads</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans">{totalLeads}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Inquiries captured</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Active Projects</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans">{runningProjects}</h3>
            <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
              <span>{completedProjects} Done</span>
              <span>•</span>
              <span>{pendingProjects} New</span>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Project Value</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold font-sans">₹{(totalProjectValue / 100000).toFixed(1)} L</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Cumulative pipeline</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Area Covered</span>
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400">
              <Map className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans">{totalAreaCovered.toFixed(1)} Ac</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Total farm footprint</p>
          </div>
        </div>

        {/* Row 2 */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Today's Follow-ups</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold font-sans ${todaysFollowups.length > 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
              {todaysFollowups.length}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Leads to call today</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Missing Docs</span>
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans">{pendingDocsCount}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Aadhaar/PAN/Land pending</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Bank & GOC</span>
            <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-slate-800 text-violet-600 dark:text-violet-400">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans">{bankPending + gocPending}</h3>
            <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
              <span>{bankPending} Bank</span>
              <span>•</span>
              <span>{gocPending} GOC</span>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Finances Unpaid</span>
            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-slate-800 text-orange-600 dark:text-orange-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold font-sans text-orange-600 dark:text-orange-400">₹{(pendingPayments / 100000).toFixed(1)} L</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Pending collections</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Active Support Cases</span>
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-slate-800 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-sans">{activeComplaints}</h3>
            <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
              <span className={activeComplaints > 0 ? "text-rose-500 font-semibold" : ""}>{activeComplaints} Pending Complaints</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custom SVG Leads Source Chart */}
        <div className={`p-5 rounded-xl border lg:col-span-1 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-xs uppercase tracking-wider font-mono text-slate-400 mb-4">Lead Source Analysis</h3>
          <div className="flex flex-col items-center justify-center py-6">
            {/* Visual Donut representation */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke={darkMode ? '#1e293b' : '#f1f5f9'} strokeWidth="12" />
                {(() => {
                  let accumulatedPercent = 0;
                  const total = Object.values(leadSources).reduce((sum, v) => sum + v, 0) || 1;
                  return Object.entries(leadSources).map(([source, val], i) => {
                    const percentage = (val / total) * 100;
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += percentage;
                    return (
                      <circle
                        key={source}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={leadSourceColors[source] || '#6b7280'}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        pathLength="100"
                        className="transition-all duration-300"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold">{totalLeads}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">Leads</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-3 w-full mt-6 text-xs">
              {Object.entries(leadSources).map(([source, val]) => (
                <div key={source} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: leadSourceColors[source] || '#6b7280' }} />
                  <span className="text-slate-500 dark:text-slate-400 truncate">{source}:</span>
                  <span className="font-semibold">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Interactive SVG Monthly Revenue & Projects Flow */}
        <div className={`p-5 rounded-xl border lg:col-span-2 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider font-mono text-slate-400">Monthly Project Financials (Pipeline)</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-slate-800 text-emerald-600 font-mono">2026</span>
          </div>

          <div className="w-full h-56 mt-4">
            {/* Real SVG bar graph */}
            <svg className="w-full h-full" viewBox="0 0 500 200">
              {/* Grid lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke={darkMode ? '#334155' : '#e2e8f0'} strokeDasharray="3" />
              <line x1="40" y1="60" x2="480" y2="60" stroke={darkMode ? '#334155' : '#e2e8f0'} strokeDasharray="3" />
              <line x1="40" y1="100" x2="480" y2="100" stroke={darkMode ? '#334155' : '#e2e8f0'} strokeDasharray="3" />
              <line x1="40" y1="140" x2="480" y2="140" stroke={darkMode ? '#334155' : '#e2e8f0'} strokeDasharray="3" />
              <line x1="40" y1="170" x2="480" y2="170" stroke={darkMode ? '#475569' : '#cbd5e1'} strokeWidth="1" />

              {/* Data points mapping for June, July */}
              {/* June projects value and July projects value */}
              {(() => {
                const monthsData = [
                  { month: 'May', value: 0, count: 0, x: 100 },
                  { month: 'Jun', value: 2500000, count: 3, x: 250 },
                  { month: 'Jul', value: 0, count: 0, x: 400 },
                ];
                // Aggregate project value dynamically by month
                projects.forEach(p => {
                  const date = p.startDate || p.createdAt;
                  if (date.includes('-06-')) {
                    monthsData[1].value += p.totalValue || 0;
                    monthsData[1].count += 1;
                  } else if (date.includes('-07-')) {
                    monthsData[2].value += p.totalValue || 0;
                    monthsData[2].count += 1;
                  } else if (date.includes('-05-')) {
                    monthsData[0].value += p.totalValue || 0;
                    monthsData[0].count += 1;
                  }
                });

                const maxVal = Math.max(...monthsData.map(m => m.value), 1000000);

                return monthsData.map((d, idx) => {
                  const barHeight = (d.value / maxVal) * 130;
                  const barY = 170 - barHeight;
                  return (
                    <g key={d.month} className="group cursor-pointer">
                      {/* Bar shadow/hover background */}
                      <rect x={d.x - 30} y="15" width="60" height="155" fill="transparent" className="hover:fill-slate-500/5 dark:hover:fill-slate-100/5 transition-colors rounded" />
                      {/* Active bar */}
                      <rect
                        x={d.x - 15}
                        y={barY}
                        width="30"
                        height={barHeight || 4} // default thin bar if zero
                        fill={idx === 1 ? '#059669' : '#3b82f6'}
                        rx="4"
                        className="transition-all duration-300"
                      />
                      {/* Text value */}
                      <text x={d.x} y={barY - 8} textAnchor="middle" className="text-[10px] font-mono font-semibold fill-slate-500 dark:fill-slate-400">
                        {d.value > 0 ? `₹${(d.value / 100000).toFixed(1)}L` : '₹0'}
                      </text>
                      {/* X label */}
                      <text x={d.x} y="185" textAnchor="middle" className="text-[11px] font-medium fill-slate-400 dark:fill-slate-500 uppercase tracking-wider">
                        {d.month}
                      </text>
                    </g>
                  );
                });
              })()}
            </svg>
          </div>
          <div className="flex items-center justify-center gap-6 text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-600 rounded" />
              <span>June Delivery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded" />
              <span>July Pipelines</span>
            </div>
          </div>
        </div>
      </div>

      {/* Business Trends Dashboard Section */}
      <div className={`p-6 rounded-2xl border transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4 dark:border-slate-800 border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-white">
                Business Trends & Service SLAs
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Data-driven insights on monthly revenue trajectories and customer support SLA turnaround speed.
            </p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setTrendsView('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                trendsView === 'all'
                  ? (darkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm')
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTrendsView('revenue')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                trendsView === 'revenue'
                  ? (darkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm')
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Revenue Growth
            </button>
            <button
              onClick={() => setTrendsView('support')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                trendsView === 'support'
                  ? (darkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm')
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Support Performance
            </button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Revenue Chart */}
          {(trendsView === 'all' || trendsView === 'revenue') && (
            <div className={`space-y-4 ${trendsView === 'all' ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs uppercase tracking-wider font-mono font-semibold text-slate-400">
                  Monthly Revenue & Expenses (Cash Flow)
                </h4>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Invoiced</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Cash Recd</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />Expenses</span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#0f172a' : '#ffffff', 
                        borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: darkMode ? '#f8fafc' : '#0f172a'
                      }}
                      formatter={(value: any) => [`₹${(Number(value)).toLocaleString('en-IN')}`, '']}
                    />
                    <Area type="monotone" dataKey="revenue" name="Invoiced Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="cashCollected" name="Cash Collected" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCash)" />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorExpenses)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Support SLA Chart */}
          {(trendsView === 'all' || trendsView === 'support') && (
            <div className={`space-y-4 ${trendsView === 'all' ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs uppercase tracking-wider font-mono font-semibold text-slate-400">
                  Support Ticket Resolution & SLA Speeds
                </h4>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />Resolution Time</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Resolved Tickets</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Opened Tickets</span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={supportSlaData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" orientation="left" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val} d`} label={{ value: 'Avg Days', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: '9px', textAnchor: 'middle' }, offset: 0 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}`} label={{ value: 'Tickets', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: '9px', textAnchor: 'middle' }, offset: 0 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#0f172a' : '#ffffff', 
                        borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: darkMode ? '#f8fafc' : '#0f172a'
                      }}
                    />
                    <Bar yAxisId="right" dataKey="totalOpened" name="Total Opened" fill="#f59e0b" fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar yAxisId="right" dataKey="totalResolved" name="Total Resolved" fill="#10b981" fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={14} />
                    <Line yAxisId="left" type="monotone" dataKey="avgDays" name="Avg Resolution Time (Days)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Alerts & Quick Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-up Call List & Stock warnings */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wider font-mono text-slate-400">Priority Operational Focus</h3>
              <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded">Action Items</span>
            </div>

            <div className="space-y-3">
              {/* Follow-ups */}
              {todaysFollowups.length > 0 ? (
                todaysFollowups.map(l => (
                  <div key={l.id} className="p-3 rounded-lg bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">{l.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Follow up on: {l.product} ({l.phone})</p>
                    </div>
                    <button 
                      onClick={() => { setActiveTab('leads'); }}
                      className="text-[10px] px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm transition-colors"
                    >
                      Call Now
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg border border-dashed text-center text-xs text-slate-400 dark:border-slate-800">
                  🎉 All caught up on leads follow-ups for today.
                </div>
              )}

            </div>
          </div>

          <div className="mt-4 pt-3 border-t dark:border-slate-800 border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Operational tasks and client follow-ups</span>
            <button 
              onClick={() => setActiveTab('leads')}
              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold"
            >
              View Active Leads →
            </button>
          </div>
        </div>

        {/* Recent Operation Activities */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wider font-mono text-slate-400">Recent Operational Logs</h3>
              <Activity className="w-4 h-4 text-slate-400 animate-pulse" />
            </div>

            <div className="space-y-3.5">
              {recentActivities.map((act, idx) => (
                <div key={idx} className="flex gap-3 text-xs leading-relaxed">
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 border shadow-sm ${
                      act.type === 'customer' ? 'bg-emerald-500 border-emerald-200' :
                      act.type === 'lead' ? 'bg-blue-500 border-blue-200' :
                      act.type === 'project' ? 'bg-indigo-500 border-indigo-200' : 'bg-rose-500 border-rose-200'
                    }`} />
                    {idx < recentActivities.length - 1 && (
                      <div className="w-0.5 grow bg-slate-100 dark:bg-slate-800 mt-1 mb-1" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold">{act.title}</p>
                      <span className="text-[9px] text-slate-400 font-mono">{act.date}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t dark:border-slate-800 border-slate-100 flex justify-end">
            <button 
              onClick={() => setActiveTab('projects')}
              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold"
            >
              Check Timeline Tracker →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
