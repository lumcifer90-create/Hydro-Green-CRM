import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserPlus, Users, Activity, FileJson, Trash2, Key, Mail, User, Clock, 
  Terminal, ShieldAlert, Monitor, Globe, Smartphone, HelpCircle, Check, AlertTriangle
} from 'lucide-react';

interface WhitelistedUser {
  email: string;
  name: string;
  role: 'admin' | 'employee';
  active: boolean;
  createdAt: string;
}

interface LoginLog {
  id: string;
  email: string;
  name: string;
  role: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
}

interface AuthManagementProps {
  darkMode: boolean;
}

export default function AuthManagement({ darkMode }: AuthManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'whitelist' | 'logs' | 'schema'>('whitelist');
  const [users, setUsers] = useState<WhitelistedUser[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New whitelisted employee state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'employee'>('employee');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth-mgmt/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching whitelisted users:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/auth-mgmt/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching activity logs:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth-mgmt/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to whitelist account.");
      }

      setSuccessMsg(`✓ Successfully whitelisted ${newName} (${newEmail})!`);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('employee');
      await fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email === 'admin@hydrogreen.com') {
      alert("The primary Admin account cannot be unwhitelisted.");
      return;
    }

    if (!confirm(`Are you sure you want to remove/un-whitelist "${email}"? They will instantly lose system access.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth-mgmt/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "User successfully unwhitelisted.");
        await fetchUsers();
      } else {
        alert(data.error || "Failed to delete user.");
      }
    } catch (err) {
      console.error("Error unwhitelisting user:", err);
      alert("Error processing deletion request.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-500" />
            <span>Authorized Access Whitelist & Audit logs</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain authorized corporate emails, register employee accounts, and monitor successful login activities with device security signatures.
          </p>
        </div>
        
        {/* Sub-navigation Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-lg border dark:border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('whitelist')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'whitelist' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employee Whitelist</span>
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'logs' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Trail Logs</span>
          </button>
          <button
            onClick={() => setActiveSubTab('schema')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'schema' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Database Schema Spec</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center font-mono text-xs text-slate-400">
          🔄 Fetching system access registers & activity databases...
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: EMPLOYEES WHITELIST MANAGEMENT */}
          {activeSubTab === 'whitelist' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Whitelisting Form Panel */}
              <div className={`p-6 rounded-xl border space-y-4 shadow-sm h-fit ${
                darkMode ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800/50">
                  <UserPlus className="w-4.5 h-4.5 text-emerald-500" />
                  <h3 className="font-bold text-sm tracking-tight text-slate-800 dark:text-white">
                    Register Whitelisted User
                  </h3>
                </div>

                <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Rajesh Kumar"
                        className={`w-full pl-9 pr-3 py-2 rounded border focus:outline-none focus:ring-1 ${
                          darkMode 
                            ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500' 
                            : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600 focus:ring-emerald-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. rajesh@hydrogreen.com"
                        className={`w-full pl-9 pr-3 py-2 rounded border focus:outline-none focus:ring-1 ${
                          darkMode 
                            ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500' 
                            : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600 focus:ring-emerald-600'
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Exact email needed for user authentication whitelist verification.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Initial Password *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className={`w-full pl-9 pr-3 py-2 rounded border focus:outline-none focus:ring-1 ${
                          darkMode 
                            ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500' 
                            : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600 focus:ring-emerald-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      System Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRole('employee')}
                        className={`py-1.5 rounded font-bold border transition-all cursor-pointer text-center ${
                          newRole === 'employee'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : darkMode
                              ? 'border-slate-800 hover:bg-slate-850 text-slate-300'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        Employee (Staff)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole('admin')}
                        className={`py-1.5 rounded font-bold border transition-all cursor-pointer text-center ${
                          newRole === 'admin'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : darkMode
                              ? 'border-slate-800 hover:bg-slate-850 text-slate-300'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        Admin (Manager)
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded bg-red-500/10 text-red-500 font-medium border border-red-500/20 text-[11px] flex gap-1.5 items-start">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 text-[11px] flex gap-1.5 items-start">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded font-bold shadow-md transition-all text-center cursor-pointer"
                  >
                    {actionLoading ? "Processing..." : "Whitelist & Register User"}
                  </button>
                </form>
              </div>

              {/* Whitelisted Users Database List */}
              <div className={`col-span-2 p-6 rounded-xl border shadow-sm ${
                darkMode ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800/50 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-emerald-500" />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                      Registered Whitelist Records ({users.length})
                    </h3>
                  </div>
                  <button 
                    onClick={fetchUsers}
                    className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    🔄 REFRESH
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border dark:border-slate-800/80 border-slate-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={darkMode ? 'bg-slate-850 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                      <tr>
                        <th className="p-3.5 font-bold">Name</th>
                        <th className="p-3.5 font-bold">Email (System ID)</th>
                        <th className="p-3.5 font-bold">Role</th>
                        <th className="p-3.5 font-bold">Whitelisted Date</th>
                        <th className="p-3.5 font-bold">Status</th>
                        <th className="p-3.5 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800/80 divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <div className="w-6.5 h-6.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-[10px] border border-emerald-500/15">
                              {u.name ? u.name[0].toUpperCase() : 'U'}
                            </div>
                            <span>{u.name}</span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">{u.email}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                              u.role === 'admin' 
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' 
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'System Seed'}
                          </td>
                          <td className="p-3.5">
                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleDeleteUser(u.email)}
                              disabled={u.email === 'admin@hydrogreen.com'}
                              title={u.email === 'admin@hydrogreen.com' ? "Primary Admin cannot be deleted" : "Remove user access"}
                              className={`p-1.5 rounded transition-all inline-flex items-center justify-center ${
                                u.email === 'admin@hydrogreen.com'
                                  ? 'text-slate-500 cursor-not-allowed opacity-40'
                                  : 'text-red-500 hover:bg-red-500/10'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 flex gap-2 text-[11px] leading-relaxed">
                  <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>
                    <b>Security Gate Policy:</b> Employee emails are matched exactly case-sensitively. When deleted/un-whitelisted from this control panel, the employee session will instantly fail and they will be blocked from logging into any platform terminals.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM LOGIN ACTIVITY AUDIT TRAILS */}
          {activeSubTab === 'logs' && (
            <div className={`p-6 rounded-xl border shadow-sm ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-emerald-500" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                    Employee Successful Login Audits & Security Logs
                  </h3>
                </div>
                <button 
                  onClick={fetchLogs}
                  className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  🔄 REFRESH SECURITY LOGS
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 font-mono">
                  ⚠️ No login activities logged yet. Logins are registered upon successful Employee authentication.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border dark:border-slate-800 border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={darkMode ? 'bg-slate-850 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                      <tr>
                        <th className="p-3.5 font-bold">Log ID</th>
                        <th className="p-3.5 font-bold">Name & Email</th>
                        <th className="p-3.5 font-bold">Role</th>
                        <th className="p-3.5 font-bold">Login Timestamp</th>
                        <th className="p-3.5 font-bold">IP Address</th>
                        <th className="p-3.5 font-bold">Browser & OS</th>
                        <th className="p-3.5 font-bold">User-Agent Signature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-3.5 font-mono text-[10px] text-slate-400">{log.id}</td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{log.name}</div>
                            <div className="font-mono text-[10px] text-slate-400">{log.email}</div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                              log.role === 'admin' 
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300' 
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}>
                              {log.role}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{log.ipAddress}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                                {log.browser}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                                {log.os}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[9px] text-slate-400 max-w-[200px] truncate" title={log.userAgent}>
                            {log.userAgent}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM DATABASE SCHEMA DELIVERABLE SPECIFICATION */}
          {activeSubTab === 'schema' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NoSQL Firestore Specifications */}
              <div className={`p-6 rounded-xl border space-y-4 shadow-sm ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800/60">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                    Deliverable 1: Firestore Database NoSQL Schemas
                  </h3>
                </div>

                <div className="space-y-4 text-xs leading-relaxed text-slate-500 dark:text-slate-300">
                  <p>
                    The system implements strict Role-Based Access Control (RBAC) and Audit logging leveraging Google Cloud Firestore. The two primary collections created are <b>app_users</b> (handling whitelisted access) and <b>login_logs</b> (monitoring successful authentications).
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-bold font-mono text-emerald-500 uppercase text-[10px] tracking-wider">
                      Collection A: app_users (System Account Whitelist)
                    </h4>
                    <p className="text-[11px] mb-1">
                      Contains documents mapped to the user email (lowercase) as the document ID, enabling instant, high-performance whitelisting verification queries before login access.
                    </p>
                    <pre className="p-3 rounded bg-slate-950 text-emerald-400 font-mono text-[10.5px] overflow-x-auto leading-normal border border-slate-800">
{`{
  "email": "employee@hydrogreen.com", // string (Lowercase Key)
  "name": "Rahul Kumar (Advisory Head)", // string
  "password": "employeepassword",      // string (Stored securely)
  "role": "employee",                  // string ("admin" | "employee")
  "active": true,                      // boolean (Status)
  "createdAt": "2026-07-12T10:15:30Z"  // string (ISO timestamp)
}`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold font-mono text-emerald-500 uppercase text-[10px] tracking-wider">
                      Collection B: login_logs (Employee Activity Audits)
                    </h4>
                    <p className="text-[11px] mb-1">
                      Contains append-only audit trail logs created automatically inside the server controllers upon every successful authentication event.
                    </p>
                    <pre className="p-3 rounded bg-slate-950 text-emerald-400 font-mono text-[10.5px] overflow-x-auto leading-normal border border-slate-800">
{`{
  "id": "LOG-178491829281-2810",       // string (Unique log identifier)
  "email": "employee@hydrogreen.com",   // string (Associated email)
  "name": "Rahul Kumar",               // string (User full name)
  "role": "employee",                  // string (Role)
  "timestamp": "2026-07-12T10:18:22Z", // string (Login ISO timestamp)
  "ipAddress": "184.23.119.5",         // string (Captured client IP)
  "userAgent": "Mozilla/5.0 (Mac...)", // string (Browser Signature)
  "browser": "Chrome",                 // string (Parsed browser name)
  "os": "macOS"                        // string (Parsed client OS)
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* SQL Relational Schema Alternative mapping */}
              <div className={`p-6 rounded-xl border space-y-4 shadow-sm ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800/60">
                  <FileJson className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                    Deliverable 2: Equivalent SQL Relational Schemas
                  </h3>
                </div>

                <div className="space-y-4 text-xs leading-relaxed text-slate-500 dark:text-slate-300">
                  <p>
                    For multi-tenant relational configurations (such as Cloud SQL, PostgreSQL, or MySQL databases), the systems are mapped cleanly to structured tables with unique index parameters.
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-bold font-mono text-emerald-500 uppercase text-[10px] tracking-wider">
                      Table structure: SQL Users
                    </h4>
                    <pre className="p-3 rounded bg-slate-950 text-emerald-400 font-mono text-[10px] overflow-x-auto leading-normal border border-slate-800">
{`CREATE TABLE app_users (
  email VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK (role IN ('admin', 'employee')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold font-mono text-emerald-500 uppercase text-[10px] tracking-wider">
                      Table structure: SQL Login Audit Logs
                    </h4>
                    <pre className="p-3 rounded bg-slate-950 text-emerald-400 font-mono text-[10px] overflow-x-auto leading-normal border border-slate-800">
{`CREATE TABLE login_logs (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) REFERENCES app_users(email) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(100) NOT NULL,
  user_agent TEXT NOT NULL,
  browser VARCHAR(100) NOT NULL,
  os VARCHAR(100) NOT NULL
);

-- Optimize audit search on user lookup
CREATE INDEX idx_login_logs_email ON login_logs(email);`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
