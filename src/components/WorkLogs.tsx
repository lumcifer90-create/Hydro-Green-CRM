import React, { useState } from 'react';
import { Plus, Search, Calendar, Clipboard, Briefcase, Box, Trash2 } from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { WorkLog, Project, InventoryItem, WorkLogMaterial } from '../types';

interface WorkLogsProps {
  worklogs: WorkLog[];
  projects: Project[];
  inventory: InventoryItem[];
  darkMode: boolean;
  onRefresh: () => void;
}

export default function WorkLogs({
  worklogs,
  projects,
  inventory,
  darkMode,
  onRefresh
}: WorkLogsProps) {
  const savedUserStr = localStorage.getItem('hydrogreen_user');
  const userRole = savedUserStr ? JSON.parse(savedUserStr).role : 'employee';
  const isAdmin = userRole === 'admin';

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workCompleted, setWorkCompleted] = useState('');
  const [pendingWork, setPendingWork] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Selected material lists for this log entry
  const [materialsList, setMaterialsList] = useState<WorkLogMaterial[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductQty, setSelectedProductQty] = useState(1);

  // Set default project selection
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Filters logs based on active project
  const activeLogs = worklogs
    .filter(log => log.projectId === selectedProjectId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAddMaterial = () => {
    if (!selectedProductId) return;
    const item = inventory.find(i => i.id === selectedProductId);
    if (!item) return;

    // Check if already added
    const existing = materialsList.find(m => m.productId === selectedProductId);
    if (existing) {
      setMaterialsList(materialsList.map(m => 
        m.productId === selectedProductId ? { ...m, qty: m.qty + Number(selectedProductQty) } : m
      ));
    } else {
      setMaterialsList([...materialsList, {
        productId: selectedProductId,
        name: item.productName,
        qty: Number(selectedProductQty),
        unit: item.unit
      }]);
    }
    setSelectedProductQty(1);
  };

  const handleRemoveMaterial = (pId: string) => {
    setMaterialsList(materialsList.filter(m => m.productId !== pId));
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !workCompleted) return;

    const logId = 'LOG-' + Math.floor(100000 + Math.random() * 900000);

    try {
      const newLog: WorkLog = {
        id: logId,
        projectId: selectedProjectId,
        date,
        workCompleted,
        pendingWork: pendingWork || undefined,
        materialUsed: materialsList,
        expectedCompletionDate: expectedCompletionDate || undefined,
        remarks: remarks || undefined,
        createdAt: new Date().toISOString().split('T')[0]
      };

      // Save log
      await setDoc(doc(db, 'worklogs', logId), cleanUndefined(newLog));

      // Decrement used materials in inventory collection and append to purchaseHistory/consumption
      for (const mat of materialsList) {
        const invItem = inventory.find(i => i.id === mat.productId);
        if (invItem) {
          const newQty = Math.max(0, invItem.availableQty - mat.qty);
          const currentConsumption = invItem.consumption || [];
          
          await updateDoc(doc(db, 'inventory', invItem.id), {
            availableQty: newQty,
            consumption: [
              ...currentConsumption,
              {
                date,
                projectId: selectedProjectId,
                qty: mat.qty,
                remarks: `Consumed in Daily Work Log: ${logId}`
              }
            ]
          });
        }
      }

      setIsAddOpen(false);
      // Reset form
      setWorkCompleted('');
      setPendingWork('');
      setRemarks('');
      setMaterialsList([]);
      setExpectedCompletionDate('');
      onRefresh();
    } catch (err) {
      console.error("Error creating work log:", err);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm("Are you sure you want to delete this daily work log?")) return;
    try {
      await deleteDoc(doc(db, 'worklogs', logId));
      onRefresh();
    } catch (err) {
      console.error("Error deleting log:", err);
    }
  };

  const currentActiveProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header with Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-slate-800 border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Daily Project Work Logs</h2>
          <p className="text-xs text-slate-400 mt-1">Track day-to-day work records, site tasks completed, and logistics consumed</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className={`text-xs px-3 py-2 rounded border font-semibold focus:outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <option value="">-- Choose Project --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.projectName}</option>
            ))}
          </select>

          <button
            onClick={() => setIsAddOpen(true)}
            disabled={!selectedProjectId}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow shadow-emerald-600/10 disabled:opacity-50 transition-all"
          >
            <Plus className="w-4 h-4" /> Log Daily Activity
          </button>
        </div>
      </div>

      {/* Timeline Layout */}
      {selectedProjectId && currentActiveProject ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-mono text-slate-400">
              Activity History timeline for: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentActiveProject.projectName}</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Total logs: {activeLogs.length}</span>
          </div>

          {activeLogs.length > 0 ? (
            <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {activeLogs.map((log) => (
                <div key={log.id} className="relative pl-10 flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Circle dot marker */}
                  <div className="absolute left-1 top-1.5 w-6 h-6 rounded-full bg-emerald-50 dark:bg-slate-800 border border-emerald-500 flex items-center justify-center text-emerald-600 shadow">
                    <Clipboard className="w-3.5 h-3.5" />
                  </div>

                  {/* Main card panel */}
                  <div className={`p-5 rounded-xl border flex-1 space-y-4 ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-baseline justify-between gap-4 border-b dark:border-slate-800 border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{log.date}</span>
                        <span className="text-[10px] text-slate-400 font-mono">/ {log.id}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 text-xs leading-relaxed">
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Work Completed</p>
                        <p className="text-slate-800 dark:text-slate-200 font-medium mt-1 whitespace-pre-line">{log.workCompleted}</p>
                      </div>

                      {log.pendingWork && (
                        <div>
                          <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Pending & Blockers</p>
                          <p className="text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line">{log.pendingWork}</p>
                        </div>
                      )}

                      {/* Material consumed */}
                      {log.materialUsed && log.materialUsed.length > 0 && (
                        <div>
                          <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1.5">Materials Dispatched & Used</p>
                          <div className="flex flex-wrap gap-2">
                            {log.materialUsed.map((m, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                                <Box className="w-3 h-3 text-emerald-600" />
                                {m.name}: {m.qty} {m.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {log.remarks && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg italic">
                          "{log.remarks}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center border border-dashed rounded-xl text-slate-400 dark:border-slate-800 text-xs">
              📝 No work logs have been submitted for this project yet. Click "Log Daily Activity" to make your first entry.
            </div>
          )}
        </div>
      ) : (
        <div className="p-16 text-center border border-dashed rounded-xl text-slate-400 dark:border-slate-800 text-xs">
          👈 Please select a project from the top dropdown to view its timelines.
        </div>
      )}

      {/* Log Activity Dialogue */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-xl rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4">
              Submit Daily Progress Record
            </h3>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Date *</label>
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
                  <label className="block text-xs font-semibold mb-1">Expected Completion Date</label>
                  <input
                    type="date"
                    value={expectedCompletionDate}
                    onChange={(e) => setExpectedCompletionDate(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Work Completed Today *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize site tasks, foundation work, plastic clad progress..."
                  value={workCompleted}
                  onChange={(e) => setWorkCompleted(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Pending Work & Blockers</label>
                <textarea
                  rows={2}
                  placeholder="Record blockers or pending items for tomorrow..."
                  value={pendingWork}
                  onChange={(e) => setPendingWork(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              {/* Material Inventory Integration Selector */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 border border-dashed dark:border-slate-800 border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">Inventory Allocation</h4>
                
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className={`text-xs p-1.5 rounded border focus:outline-none flex-1 min-w-[150px] ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="">-- Choose Material Item --</option>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.productName} ({i.availableQty} {i.unit} left)
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={selectedProductQty}
                    onChange={(e) => setSelectedProductQty(Number(e.target.value))}
                    className={`text-xs p-1.5 rounded border focus:outline-none w-[60px] ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold shadow-sm"
                  >
                    Add
                  </button>
                </div>

                {/* Allocated list */}
                {materialsList.length > 0 ? (
                  <div className="space-y-1.5 pt-2">
                    {materialsList.map((m) => (
                      <div key={m.productId} className="flex items-center justify-between text-xs font-medium p-1.5 rounded bg-white dark:bg-slate-900 border dark:border-slate-800">
                        <span className="truncate">{m.name}</span>
                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          <span className="font-bold text-emerald-600">{m.qty} {m.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(m.productId)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No materials allocated to today's work.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Remarks & Field notes</label>
                <input
                  type="text"
                  placeholder="e.g. Completed foundation inspection"
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
                  Submit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
