import React, { useState, useMemo } from 'react';
import { 
  Sprout, Calendar, Filter, Plus, Search, User, Clock, 
  BookOpen, CheckCircle, AlertTriangle, ArrowRight, Activity, 
  FileText, ShieldCheck, HelpCircle, FileCheck, X
} from 'lucide-react';
import { AgronomyVisit, Customer } from '../types';

interface AgronomyManagementProps {
  agronomy: AgronomyVisit[];
  customers: Customer[];
  darkMode: boolean;
  onAddVisit: (visit: Omit<AgronomyVisit, 'id' | 'createdAt'>) => Promise<void>;
}

export default function AgronomyManagement({ 
  agronomy, 
  customers, 
  darkMode, 
  onAddVisit 
}: AgronomyManagementProps) {
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('all');
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<AgronomyVisit | null>(null);

  // Form State
  const [agCustId, setAgCustId] = useState('');
  const [agCrop, setAgCrop] = useState('');
  const [agObservation, setAgObservation] = useState('');
  const [agRecommendation, setAgRecommendation] = useState('');
  const [agDiseaseDetails, setAgDiseaseDetails] = useState('');
  const [agNextVisitDate, setAgNextVisitDate] = useState('');
  const [agRemarks, setAgRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available crops list for filter dropdown
  const cropsList = useMemo(() => {
    const crops = new Set<string>();
    agronomy.forEach(v => {
      if (v.cropName) crops.add(v.cropName);
    });
    return Array.from(crops);
  }, [agronomy]);

  // Filtered agronomy list sorted chronologically (latest first)
  const filteredVisits = useMemo(() => {
    return agronomy
      .filter((v) => {
        const matchesCustomer = selectedCustomerFilter === 'all' || v.customerId === selectedCustomerFilter;
        const matchesCrop = selectedCropFilter === 'all' || v.cropName.toLowerCase() === selectedCropFilter.toLowerCase();
        
        const contentString = `${v.customerName} ${v.cropName} ${v.observation} ${v.recommendations} ${v.diseaseDetails || ''}`.toLowerCase();
        const matchesSearch = contentString.includes(searchQuery.toLowerCase());

        return matchesCustomer && matchesCrop && matchesSearch;
      })
      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [agronomy, selectedCustomerFilter, selectedCropFilter, searchQuery]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agCustId || !agCrop || !agObservation || !agRecommendation) return;

    setIsSubmitting(true);
    try {
      const selectedCust = customers.find(c => c.id === agCustId);
      await onAddVisit({
        customerId: agCustId,
        customerName: selectedCust ? selectedCust.name : 'Unknown',
        visitDate: new Date().toISOString().split('T')[0],
        cropName: agCrop,
        observation: agObservation,
        diseaseDetails: agDiseaseDetails || undefined,
        recommendations: agRecommendation,
        nextVisitDate: agNextVisitDate || undefined,
        remarks: agRemarks || undefined
      });

      // Reset form
      setAgCustId('');
      setAgCrop('');
      setAgObservation('');
      setAgRecommendation('');
      setAgDiseaseDetails('');
      setAgNextVisitDate('');
      setAgRemarks('');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="agronomy-module" className="p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Sprout className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Interactive Agronomy Smart Timelines</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time crop health logs, disease diagnostic tracking, field observations, and smart advisory timelines.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/15 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Log Field Advisory
        </button>
      </div>

      {/* Grid: Left Filters/Overview + Middle Timeline + Right Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Metrics & Filter Panel (3 Cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Quick Stats Panel */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agronomy Summary</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <span className="block text-[10px] text-slate-400 font-medium">Total Visits</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{agronomy.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <span className="block text-[10px] text-slate-400 font-medium">Crops Logged</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{cropsList.length}</span>
              </div>
            </div>
          </div>

          {/* Filters Card */}
          <div className={`p-4 rounded-xl border space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-1.5 pb-2 border-b dark:border-slate-800 border-slate-100">
              <Filter className="w-3.5 h-3.5 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Timeline Filters</h3>
            </div>

            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Search Advisory Logs</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Keyword search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded border focus:outline-none ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-600'
                  }`}
                />
              </div>
            </div>

            {/* Customer Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Customer</label>
              <select
                value={selectedCustomerFilter}
                onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                className={`w-full p-2 text-xs rounded border focus:outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="all">All Customers</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Crop Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Crop Type</label>
              <select
                value={selectedCropFilter}
                onChange={(e) => setSelectedCropFilter(e.target.value)}
                className={`w-full p-2 text-xs rounded border focus:outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="all">All Crops</option>
                {cropsList.map(crop => <option key={crop} value={crop}>{crop}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Middle Column: Chronological Interactive Timeline (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Chronological Logs</h3>
            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
              Showing {filteredVisits.length} events
            </span>
          </div>

          {filteredVisits.length === 0 ? (
            <div className={`p-8 text-center rounded-xl border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2 animate-pulse" />
              <p className="text-xs font-medium">No agronomy visit records match the criteria.</p>
              <p className="text-[10px] text-slate-400 mt-1">Try resetting filters or log a new field visit.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-emerald-500/20 pl-4 ml-3 space-y-6">
              {filteredVisits.map((v, index) => {
                const isSelected = selectedVisit?.id === v.id;
                return (
                  <div 
                    key={v.id} 
                    onClick={() => setSelectedVisit(v)}
                    className="relative cursor-pointer group"
                  >
                    {/* Circle Node Indicator */}
                    <div className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-emerald-500 border-emerald-400 scale-125 shadow-md shadow-emerald-500/30' 
                        : 'bg-white dark:bg-slate-950 border-emerald-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    </div>

                    {/* Timeline Event Card */}
                    <div className={`p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? darkMode ? 'bg-slate-800/80 border-emerald-500 shadow-md' : 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                        : darkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            {v.cropName}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                            {v.customerName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 shrink-0">
                          <Calendar className="w-3 h-3" />
                          {v.visitDate}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 italic">
                        "{v.observation}"
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t dark:border-slate-800/50 border-slate-100 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded-full font-bold ${
                          v.diseaseDetails 
                            ? 'bg-amber-500/10 text-amber-600' 
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          {v.diseaseDetails ? '⚠️ Diagnostic Flag' : '✅ Routine Check'}
                        </span>
                        
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:translate-x-1 transition-transform">
                          View Timeline Detail <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Advisory / Disease Diagnosis Detailed Insights Card (4 Cols) */}
        <div className="lg:col-span-4">
          <div className="pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Advisory Insights</h3>
          </div>

          {selectedVisit ? (
            <div className={`p-5 rounded-xl border space-y-5 sticky top-6 animate-scale-in ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 border-slate-100">
                <div>
                  <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{selectedVisit.customerName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Visit Date: {selectedVisit.visitDate}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-bold font-mono">
                    {selectedVisit.cropName}
                  </span>
                </div>
              </div>

              {/* Observation Detail */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-blue-500" /> Site Field Observations
                </span>
                <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                  darkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-700'
                }`}>
                  {selectedVisit.observation}
                </div>
              </div>

              {/* Diagnostics Detail */}
              {selectedVisit.diseaseDetails && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Disease & Pest Diagnostic Info
                  </span>
                  <div className="p-3 rounded-lg text-xs leading-relaxed bg-amber-500/5 border border-amber-500/10 text-amber-800 dark:text-amber-300 font-medium">
                    {selectedVisit.diseaseDetails}
                  </div>
                </div>
              )}

              {/* Recommendations Advisory */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Advisory & Chemical Recommendations
                </span>
                <div className={`p-3 rounded-lg text-xs leading-relaxed border border-emerald-500/10 ${
                  darkMode ? 'bg-slate-950/50 text-emerald-100' : 'bg-emerald-50/20 text-slate-800'
                }`}>
                  {selectedVisit.recommendations}
                </div>
              </div>

              {/* Bottom Metadata Blocks */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t dark:border-slate-800 border-slate-100">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Next Advisory Date</span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedVisit.nextVisitDate || 'As needed'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Advisor Remarks</span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block">
                    {selectedVisit.remarks || 'No remarks'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-8 text-center rounded-xl border border-dashed ${
              darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Select a Timeline Log</p>
              <p className="text-[10px] text-slate-400 mt-1">Select an advisory card to view agronomic diagnostic details, recommendation actions, and next visit dates.</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Visit Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl relative border animate-scale-in ${
            darkMode ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-800 border-slate-100'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b dark:border-slate-800 border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-500" /> Log Field Agronomy Advisory
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">Customer *</label>
                  <select
                    required
                    value={agCustId}
                    onChange={(e) => setAgCustId(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none focus:border-emerald-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- Select --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">Crop Type *</label>
                  <input
                    type="text"
                    required
                    value={agCrop}
                    onChange={(e) => setAgCrop(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none focus:border-emerald-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                    placeholder="e.g. Cherry Tomato"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">Observations *</label>
                <textarea
                  rows={2}
                  required
                  value={agObservation}
                  onChange={(e) => setAgObservation(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none focus:border-emerald-500 ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  placeholder="Sticky trap checks, micro-nutrient status, leaf roll observations..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">Disease / Pest Flag (If detected)</label>
                <input
                  type="text"
                  value={agDiseaseDetails}
                  onChange={(e) => setAgDiseaseDetails(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none focus:border-emerald-500 ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  placeholder="e.g. Mild powdery mildew infestation, Whitefly counts &gt; 10 / plant"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">Agronomist Recommendation *</label>
                <textarea
                  rows={2}
                  required
                  value={agRecommendation}
                  onChange={(e) => setAgRecommendation(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none focus:border-emerald-500 ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  placeholder="Recommended fertilizers, Neem spray ratios, microclimate humidity settings..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">Next Scheduled Visit</label>
                  <input
                    type="date"
                    value={agNextVisitDate}
                    onChange={(e) => setAgNextVisitDate(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none focus:border-emerald-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">Remarks / Extra Notes</label>
                  <input
                    type="text"
                    value={agRemarks}
                    onChange={(e) => setAgRemarks(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none focus:border-emerald-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                    placeholder="Soil humidity normal, crop looks healthy"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border ${
                    darkMode 
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-800' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Save Advisory Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
