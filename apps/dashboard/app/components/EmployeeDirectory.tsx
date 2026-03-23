'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UsersIcon, XMarkIcon } from './icons';

interface Employee {
    id: string;
    name: string;
    walletAddress: string;
    amount: number;
    token: string;
    note: string | null;
    department: string | null;
    role: string | null;
    status: string;
}

const DEPARTMENTS = ['Engineering', 'Marketing', 'Operations', 'Finance', 'Design', 'Legal', 'Sales', 'Contractor'];

interface EmployeeDirectoryProps {
    walletAddress: string | null;
    isAdmin: boolean;
    showToast: (type: 'success' | 'error', msg: string) => void;
    onPayEmployee?: (employees: Array<{ name: string; wallet: string; amount: number; token: string; note: string }>) => void;
}

function EmployeeDirectory({ walletAddress, isAdmin, showToast, onPayEmployee }: EmployeeDirectoryProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [newName, setNewName] = useState('');
    const [newWallet, setNewWallet] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newToken] = useState('AlphaUSD');
    const [newNote, setNewNote] = useState('');
    const [newDepartment, setNewDepartment] = useState('');
    const [newRole, setNewRole] = useState('');
    const [filterDept, setFilterDept] = useState('');

    const fetchEmployees = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const res = await fetch(`/api/employee-directory?wallet=${walletAddress}`);
            const data = await res.json();
            if (data.success) setEmployees(data.employees || []);
        } catch {} finally { setLoading(false); }
    }, [walletAddress]);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    const addEmployee = async () => {
        if (!newName.trim() || !newWallet.trim()) return showToast('error', 'Name and wallet required.');
        if (!/^0x[a-fA-F0-9]{40}$/.test(newWallet)) return showToast('error', 'Invalid wallet address.');
        try {
            const res = await fetch('/api/employee-directory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': walletAddress || '' },
                body: JSON.stringify({ employees: [{ name: newName.trim(), walletAddress: newWallet.trim(), amount: parseFloat(newAmount) || 0, token: newToken, note: newNote.trim() || null, department: newDepartment || null, role: newRole || null }] }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', `${newName} added to directory.`);
                setNewName(''); setNewWallet(''); setNewAmount(''); setNewNote('');
                setShowAddForm(false);
                fetchEmployees();
            } else showToast('error', data.error);
        } catch { showToast('error', 'Network error.'); }
    };

    const updateEmployee = async (id: string, updates: Partial<Employee>) => {
        try {
            const res = await fetch('/api/employee-directory', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': walletAddress || '' },
                body: JSON.stringify({ id, ...updates }),
            });
            if (res.ok) { showToast('success', 'Employee updated.'); setEditingId(null); fetchEmployees(); }
        } catch { showToast('error', 'Update failed.'); }
    };

    const deleteEmployee = async (id: string, name: string) => {
        if (!confirm(`Remove ${name} from directory?`)) return;
        try {
            const res = await fetch('/api/employee-directory', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': walletAddress || '' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) { showToast('success', `${name} removed.`); fetchEmployees(); }
        } catch { showToast('error', 'Delete failed.'); }
    };

    const payEmployee = (emp: Employee) => {
        onPayEmployee?.([{ name: emp.name, wallet: emp.walletAddress, amount: emp.amount, token: emp.token, note: emp.note || '' }]);
        showToast('success', `${emp.name} queued for payment.`);
    };

    const payAll = () => {
        if (employees.length === 0) return showToast('error', 'No employees to pay.');
        onPayEmployee?.(employees.map(e => ({ name: e.name, wallet: e.walletAddress, amount: e.amount, token: e.token, note: e.note || '' })));
        showToast('success', `${employees.length} employees queued for payment.`);
    };

    const filtered = employees.filter(e => {
        const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.walletAddress.toLowerCase().includes(search.toLowerCase());
        const matchDept = !filterDept || e.department === filterDept;
        return matchSearch && matchDept;
    });
    const totalSalary = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (!isAdmin) return null;

    return (
        <div className="agt-card agt-card-accent-blue p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="agt-icon-box agt-icon-box-blue">
                        <UsersIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-white">Employee Directory</h2>
                        <p className="text-[11px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{employees.length} employees &bull; {totalSalary.toLocaleString()} {newToken} total</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={payAll} disabled={employees.length === 0} className="agt-badge agt-badge-mint text-[11px] font-bold px-3 py-1.5 cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-30">
                        Pay All
                    </button>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="agt-badge agt-badge-blue text-[11px] font-bold px-3 py-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                        {showAddForm ? 'Cancel' : '+ Add'}
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="mb-5 p-4 rounded-xl border bg-white/[0.02] space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--agt-blue) 20%, transparent)' }}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white font-mono outline-none focus:border-[var(--agt-blue)] transition-colors" />
                        <input value={newWallet} onChange={e => setNewWallet(e.target.value)} placeholder="0x... wallet" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white font-mono outline-none focus:border-[var(--agt-blue)] transition-colors" />
                        <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Salary" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white font-mono outline-none focus:border-[var(--agt-blue)] transition-colors" />
                        <select value={newDepartment} onChange={e => setNewDepartment(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white font-mono outline-none focus:border-[var(--agt-blue)] transition-colors">
                            <option value="">Department</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Role (e.g. Developer)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white font-mono outline-none focus:border-[var(--agt-blue)] transition-colors" />
                        <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Note (optional)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white font-mono outline-none focus:border-[var(--agt-blue)] transition-colors" />
                    </div>
                    <button onClick={addEmployee} className="text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors" style={{ background: 'var(--agt-blue)', color: '#000' }}>
                        Add Employee
                    </button>
                </div>
            )}

            {/* Search + Department Filter */}
            <div className="mb-4 flex gap-2">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or wallet..." className="flex-1 bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white font-mono outline-none focus:border-[var(--agt-blue)]/50 placeholder:text-slate-600" />
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white font-mono outline-none focus:border-[var(--agt-blue)]/50 min-w-[140px]">
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg pp-skeleton" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-[11px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                    {search ? 'No employees match search.' : 'No employees yet. Click "+ Add" to start.'}
                </div>
            ) : (
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto cyber-scroll-y pr-1">
                    {filtered.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors group">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: 'color-mix(in srgb, var(--agt-blue) 10%, transparent)', color: 'var(--agt-blue)' }}>
                                {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-[11px] text-white font-medium truncate">{emp.name}</p>
                                    {emp.department && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ background: 'color-mix(in srgb, var(--agt-blue) 12%, transparent)', color: 'var(--agt-blue)' }}>{emp.department}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-mono truncate" style={{ color: 'var(--pp-text-muted)' }}>{emp.walletAddress.slice(0, 10)}...{emp.walletAddress.slice(-6)}</p>
                                    {emp.role && <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>&bull; {emp.role}</span>}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[11px] text-white font-bold font-mono tabular-nums">{emp.amount.toLocaleString()}</p>
                                <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>{emp.token}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => payEmployee(emp)} className="agt-badge agt-badge-mint text-[11px] px-2 py-1 cursor-pointer hover:opacity-80">Pay</button>
                                <button onClick={() => deleteEmployee(emp.id, emp.name)} className="agt-badge agt-badge-danger text-[11px] px-2 py-1 cursor-pointer hover:opacity-80">
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default React.memo(EmployeeDirectory);
