import React from 'react';
import { 
  LayoutDashboard, Users, TrendingUp, GitBranch, Clock, 
  FileText, Box, DollarSign, ShieldAlert, Sprout, 
  BarChart3, Database, Settings, LogOut, Sun, Moon, Search,
  ShieldCheck
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  darkMode,
  setDarkMode,
  globalSearch,
  setGlobalSearch
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'leads', label: 'Leads', icon: TrendingUp },
    { id: 'projects', label: 'Projects & Stages', icon: GitBranch },
    { id: 'worklogs', label: 'Daily Work Logs', icon: Clock },
    { id: 'documents', label: 'Documents', icon: FileText },
    ...(user?.role === 'admin' ? [{ id: 'finance', label: 'Finance Ledgers', icon: DollarSign }] : []),
    { id: 'support', label: 'After-Sales Support', icon: ShieldAlert },
    { id: 'agronomy', label: 'Agronomy Visits', icon: Sprout },
    ...(user?.role === 'admin' ? [{ id: 'reports', label: 'Reports & Export', icon: BarChart3 }] : []),
    ...(user?.role === 'admin' ? [{ id: 'backup', label: 'Backup & Restore', icon: Database }] : []),
    ...(user?.role === 'admin' ? [{ id: 'auth-mgmt', label: 'Auth & Activity Logs', icon: ShieldCheck }] : []),
    ...(user?.role === 'admin' ? [{ id: 'settings', label: 'Company Settings', icon: Settings }] : []),
  ];

  return (
    <aside id="sidebar-navigation" className={`w-64 border-r flex flex-col h-screen shrink-0 transition-colors duration-200 ${
      darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Brand Logo Header */}
      <div className={`p-6 border-b flex flex-col gap-1 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            H
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-emerald-600 dark:text-emerald-500">
              HYDROGREEN
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Energy Pvt. Ltd.
            </p>
          </div>
        </div>
      </div>

      {/* Global Search Inside Sidebar */}
      <div className="px-4 py-3 border-b dark:border-slate-800 border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Global search..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-md border focus:outline-none transition-all ${
              darkMode 
                ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-600'
            }`}
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-2.5 top-2 text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav id="nav-menu" className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                  : darkMode 
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User and Controls Bottom Bar */}
      <div className={`p-4 border-t flex flex-col gap-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        {/* User profile row */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-slate-800 flex items-center justify-center text-emerald-800 dark:text-emerald-400 font-semibold text-sm border border-emerald-200 dark:border-slate-700">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase font-mono">{user.role}</p>
            </div>
          </div>
        )}

        {/* Action controls */}
        <div className="flex items-center justify-between pt-1 border-t dark:border-slate-800 border-slate-100">
          <button
            id="toggle-theme-btn"
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle theme"
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="logout-button"
            onClick={onLogout}
            title="Sign out"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              darkMode 
                ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-red-400' 
                : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-red-600'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
