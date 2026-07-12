import React, { useState } from 'react';
import { Plus, Search, AlertTriangle, Box, DollarSign, Calendar, Edit2, Trash2, ArrowUpRight, TrendingDown } from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { InventoryItem } from '../types';

interface InventoryManagementProps {
  inventory: InventoryItem[];
  darkMode: boolean;
  onRefresh: () => void;
}

export default function InventoryManagement({
  inventory,
  darkMode,
  onRefresh
}: InventoryManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Single product detail logs drawer state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);

  // Forms state
  const [id, setId] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Irrigation');
  const [supplier, setSupplier] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [availableQty, setAvailableQty] = useState(0);
  const [minStockLevel, setMinStockLevel] = useState(0);

  // Restock action states
  const [restockQty, setRestockQty] = useState(1);
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockPrice, setRestockPrice] = useState(0);

  const currentItem = inventory.find(i => i.id === selectedProductId);

  const resetForm = () => {
    setId('');
    setProductName('');
    setCategory('Irrigation');
    setSupplier('');
    setUnit('Pcs');
    setPurchasePrice(0);
    setSellingPrice(0);
    setAvailableQty(0);
    setMinStockLevel(0);
  };

  const handleOpenAdd = () => {
    resetForm();
    setId('INV-' + Math.floor(100 + Math.random() * 900));
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !unit) return;

    try {
      const newItem: InventoryItem = {
        id,
        productName,
        category,
        supplier: supplier || undefined,
        unit,
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        availableQty: Number(availableQty),
        minStockLevel: Number(minStockLevel),
        purchaseHistory: availableQty > 0 ? [{
          date: new Date().toISOString().split('T')[0],
          qty: Number(availableQty),
          price: Number(purchasePrice),
          supplier: supplier || 'Initial Stock'
        }] : [],
        consumption: [],
        createdAt: new Date().toISOString().split('T')[0]
      };

      await setDoc(doc(db, 'inventory', id), cleanUndefined(newItem));
      setIsAddOpen(false);
      resetForm();
      onRefresh();
    } catch (err) {
      console.error("Error writing inventory:", err);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !currentItem) return;

    try {
      const updatedQty = currentItem.availableQty + Number(restockQty);
      const purchaseItem = {
        date: new Date().toISOString().split('T')[0],
        qty: Number(restockQty),
        price: Number(restockPrice) || currentItem.purchasePrice,
        supplier: restockSupplier || currentItem.supplier || 'Vendor'
      };

      const updatedHistory = [...(currentItem.purchaseHistory || []), purchaseItem];

      await updateDoc(doc(db, 'inventory', selectedProductId), {
        availableQty: updatedQty,
        purchaseHistory: updatedHistory,
        purchasePrice: Number(restockPrice) || currentItem.purchasePrice
      });

      setIsRestockOpen(false);
      setRestockQty(1);
      setRestockSupplier('');
      setRestockPrice(0);
      onRefresh();
    } catch (err) {
      console.error("Error restocking inventory:", err);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this product from inventory?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      if (selectedProductId === itemId) {
        setSelectedProductId(null);
      }
      onRefresh();
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  // Filters
  const filteredInventory = inventory.filter(i => {
    const matchesSearch = i.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (i.supplier && i.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory ? i.category === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Material Inventory Depot</h2>
          <p className="text-xs text-slate-400 mt-1">Manage industrial materials catalog, supplier parameters, and project dispatch consumption</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/15 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Product Item
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-lg border dark:border-slate-800 border-slate-100">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded border focus:outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={`text-xs px-3 py-2 rounded border focus:outline-none ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <option value="">All Catalog Categories</option>
          <option value="Irrigation">Irrigation Systems</option>
          <option value="Structure">Structures & Frames</option>
          <option value="Automation">Irrigation Automation</option>
          <option value="Electrical">Electrical Equipment</option>
          <option value="Solar">Solar Systems</option>
          <option value="Other">Other Materials</option>
        </select>

        <div className="text-right flex items-center justify-end text-xs text-slate-400 px-1 font-mono">
          Total Items: {inventory.length}
        </div>
      </div>

      {/* Main Stock Grid and Audit logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table list */}
        <div className="lg:col-span-2 border dark:border-slate-800 border-slate-200 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                <tr>
                  <th className="p-4 font-semibold">Code</th>
                  <th className="p-4 font-semibold">Material / Supplier</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Available Qty</th>
                  <th className="p-4 font-semibold">Price (Buy/Sell)</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                {filteredInventory.map((item) => {
                  const isLow = item.availableQty <= item.minStockLevel;
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedProductId(item.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedProductId === item.id 
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10' 
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      <td className="p-4 font-mono text-[11px] text-slate-400">{item.id}</td>
                      <td className="p-4 leading-relaxed font-semibold text-slate-900 dark:text-slate-100">
                        {item.productName}
                        {item.supplier && <p className="text-[10px] text-slate-400 font-normal">{item.supplier}</p>}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-sm ${isLow ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                            {item.availableQty}
                          </span>
                          <span className="text-slate-400">{item.unit}</span>
                          {isLow && (
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" title="Low Stock Level!" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-medium">
                        <p>B: ₹{item.purchasePrice}</p>
                        <p className="text-slate-400">S: ₹{item.sellingPrice}</p>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setSelectedProductId(item.id); setIsRestockOpen(true); }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 text-white rounded text-[10px] font-semibold shadow-sm transition-all"
                        >
                          Restock
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product logs details drawer panel */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between h-fit ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          {selectedProductId && currentItem ? (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Item Audit trail</span>
                <h3 className="font-bold text-base mt-1 text-slate-800 dark:text-slate-100">{currentItem.productName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Code: {currentItem.id} • Unit: {currentItem.unit}</p>
              </div>

              {/* Purchase History */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> Purchase Receipts
                </h4>
                {currentItem.purchaseHistory && currentItem.purchaseHistory.length > 0 ? (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {currentItem.purchaseHistory.map((pur, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] leading-relaxed flex items-center justify-between border dark:border-slate-800">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">+{pur.qty} {currentItem.unit} from {pur.supplier}</p>
                          <p className="text-slate-400 font-mono text-[9px] mt-0.5">{pur.date}</p>
                        </div>
                        <span className="font-mono text-slate-500">₹{pur.price}/{currentItem.unit}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No purchase receipts recorded.</p>
                )}
              </div>

              {/* Consumption History */}
              <div className="space-y-2 border-t dark:border-slate-800 border-slate-100 pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" /> Project Dispatch logs
                </h4>
                {currentItem.consumption && currentItem.consumption.length > 0 ? (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {currentItem.consumption.map((con, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] leading-relaxed flex items-center justify-between border dark:border-slate-800">
                        <div>
                          <p className="font-semibold text-rose-600 dark:text-rose-400">-{con.qty} {currentItem.unit} sent to {con.projectId}</p>
                          <p className="text-slate-400 text-[10px] truncate max-w-[150px] mt-0.5">{con.remarks}</p>
                        </div>
                        <span className="font-mono text-slate-400 text-[10px]">{con.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No project consumption dispatches logged.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              👈 Click on any row item to inspect its historic purchase and project consumption audit records.
            </div>
          )}
        </div>
      </div>

      {/* Add Item Dialogue */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl p-6 shadow-2xl relative ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4">
              Add Catalog Material Item
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Item Code (Auto)</label>
                <input
                  type="text"
                  disabled
                  value={id}
                  className="w-full p-2 text-xs rounded border bg-slate-100 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drip Lateral 16mm"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Irrigation">Irrigation</option>
                    <option value="Structure">Structure</option>
                    <option value="Automation">Automation</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Solar">Solar</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Unit of Measurement</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Meters">Meters</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Nos">Nos</option>
                    <option value="Liters">Liters</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Initial Qty</label>
                  <input
                    type="number"
                    value={availableQty}
                    onChange={(e) => setAvailableQty(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Min Threshold Alert</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Primary Supplier Name</label>
                <input
                  type="text"
                  placeholder="Tata, Finolex Plasson, Netafim..."
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
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
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock action dialogue */}
      {isRestockOpen && currentItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-xl p-6 shadow-2xl relative ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-2">
              Restock Material Batch
            </h3>
            <p className="text-xs text-slate-400 mb-4">{currentItem.productName} ({currentItem.availableQty} {currentItem.unit} in depot)</p>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Restock Batch Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Purchase Price per Unit (₹)</label>
                <input
                  type="number"
                  placeholder={`Default: ₹${currentItem.purchasePrice}`}
                  value={restockPrice}
                  onChange={(e) => setRestockPrice(Number(e.target.value))}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Restock Supplier</label>
                <input
                  type="text"
                  placeholder={`Default: ${currentItem.supplier || 'Tata Structura'}`}
                  value={restockSupplier}
                  onChange={(e) => setRestockSupplier(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold border ${
                    darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow"
                >
                  Apply Stock Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
