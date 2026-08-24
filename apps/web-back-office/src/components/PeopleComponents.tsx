import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Shield, X, Edit, Trash2, Search, Wallet, KeyRound } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../lib/apiConfig';

export const CustomersView = ({ customers, isLoading, onAdd, onEdit, onDelete }: any) => {
    const [search, setSearch] = useState('');
    const [walletFilter, setWalletFilter] = useState<'ALL' | 'POSITIVE' | 'ZERO'>('ALL');

    const filteredCustomers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (customers || []).filter((c: any) => {
            const matchesSearch = !q ||
                c.name?.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.id?.toLowerCase().includes(q) ||
                c.id?.slice(-8).toLowerCase().includes(q);

            const matchesWallet =
                walletFilter === 'ALL' ||
                (walletFilter === 'POSITIVE' && Number(c.walletBalance || 0) > 0) ||
                (walletFilter === 'ZERO' && Number(c.walletBalance || 0) <= 0);

            return matchesSearch && matchesWallet;
        });
    }, [customers, search, walletFilter]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm space-y-0">
            {/* Header & Actions */}
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/20 dark:bg-slate-800/40">
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Customer Engagement</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Manage loyalty profiles, contact details and wallet balances</p>
                </div>
                <button
                    onClick={onAdd}
                    className="bg-[#2D7A3E] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#20502E] active:scale-95 transition-all shadow-xl shadow-green-900/10 font-black uppercase tracking-wide flex-shrink-0"
                >
                    <UserPlus size={18} strokeWidth={3} />
                    <span>Add Customer</span>
                </button>
            </div>

            {/* Search & Filter Control Bar */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3 bg-gray-50/10 dark:bg-slate-800/20">
                <div className="relative group flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by customer name, phone, email, or ID..."
                        className="w-full pl-12 pr-10 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 dark:text-white dark:placeholder-slate-400 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-sm transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                            title="Clear search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Wallet Balance Filter Selector */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl">
                    <button
                        onClick={() => setWalletFilter('ALL')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            walletFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        All ({(customers || []).length})
                    </button>
                    <button
                        onClick={() => setWalletFilter('POSITIVE')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${
                            walletFilter === 'POSITIVE' ? 'bg-[#2D7A3E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <Wallet size={12} />
                        <span>Funded</span>
                    </button>
                    <button
                        onClick={() => setWalletFilter('ZERO')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            walletFilter === 'ZERO' ? 'bg-gray-800 text-white dark:bg-slate-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        ₦0 Balance
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black border-b border-gray-100 dark:border-gray-800">
                            <th className="px-8 py-5">Profile Details</th>
                            <th className="px-8 py-5">Contact Vector</th>
                            <th className="px-8 py-5">Wallet Engine</th>
                            <th className="px-8 py-5">Order Loop</th>
                            <th className="px-8 py-5 text-right">Operation</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-gray-100 dark:bg-slate-800 rounded-full w-full"></div></td>
                                </tr>
                            ))
                        ) : filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-bold italic">
                                    {search ? (
                                        <div className="space-y-2">
                                            <p className="text-sm font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">No customers found matching "{search}"</p>
                                            <button
                                                onClick={() => { setSearch(''); setWalletFilter('ALL'); }}
                                                className="px-4 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200"
                                            >
                                                Reset Filters
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="uppercase tracking-widest">No customer data identified.</span>
                                    )}
                                </td>
                            </tr>
                        ) : filteredCustomers.map((c: any) => (
                            <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="font-black text-gray-900 dark:text-white leading-tight">{c.name}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 font-mono">ID: #{c.id.slice(-8).toUpperCase()}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="text-sm text-gray-600 dark:text-gray-300 font-bold">{c.phone || 'No phone'}</div>
                                    <div className="text-[10px] text-gray-400">{c.email || 'No email'}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className={`inline-flex items-center px-4 py-1.5 rounded-full font-black text-xs border shadow-sm ${
                                        Number(c.walletBalance || 0) > 0
                                            ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800'
                                            : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700'
                                    }`}>
                                        ₦{Number(c.walletBalance || 0).toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{c._count?.orders || 0} Total</td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <button onClick={() => onEdit && onEdit(c)} className="text-blue-500 hover:text-blue-700 transition-colors p-1.5 cursor-pointer" title="Edit Customer"><Edit size={18} /></button>
                                        <button onClick={() => onDelete && onDelete(c.id)} className="text-red-500 hover:text-red-700 transition-colors p-1.5 cursor-pointer" title="Delete Customer"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const StaffView = ({ staff, isLoading, onInvite, onEdit, onDelete, extraAction }: any) => {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    const filteredStaff = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (staff || []).filter((member: any) => {
            const matchesSearch = !q ||
                member.name?.toLowerCase().includes(q) ||
                member.email?.toLowerCase().includes(q) ||
                member.phone?.toLowerCase().includes(q) ||
                member.staffCode?.toLowerCase().includes(q) ||
                member.id?.toLowerCase().includes(q) ||
                member.id?.slice(-8).toLowerCase().includes(q) ||
                member.branch?.name?.toLowerCase().includes(q) ||
                member.role?.toLowerCase().includes(q);

            const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [staff, search, roleFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Staff Directory</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage hierarchical roles, multi-vector search and branch access</p>
                </div>
                <button
                    onClick={onInvite}
                    className="bg-[#2D7A3E] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#20502E] active:scale-95 transition-all shadow-xl shadow-green-900/10 font-black uppercase tracking-wide flex-shrink-0"
                >
                    <UserPlus size={18} strokeWidth={3} />
                    <span>Invite Agent</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Search & Role Filter Control Bar */}
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3 bg-gray-50/20 dark:bg-slate-800/40">
                    <div className="relative group flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by staff name, email, phone, staff ID, branch..."
                            className="w-full pl-12 pr-10 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 dark:text-white dark:placeholder-slate-400 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-sm transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                                title="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full sm:w-auto px-4 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-xs text-gray-700 dark:text-gray-200 outline-none shadow-sm focus:border-[#2D7A3E]"
                    >
                        <option value="ALL">All Roles ({(staff || []).length})</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="BRANCH_MANAGER">Branch Manager</option>
                        <option value="INVENTORY_MANAGER">Inventory Manager</option>
                        <option value="CASHIER">Cashier</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black border-b border-gray-100 dark:border-gray-800">
                                <th className="px-8 py-5">Personnel Detail</th>
                                <th className="px-8 py-5">Security Role</th>
                                <th className="px-8 py-5">Branch Sector</th>
                                <th className="px-8 py-5">System Status</th>
                                <th className="px-8 py-5 text-right">Operation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-8 py-24 text-center text-gray-400 font-black animate-pulse">Syncing staff database...</td></tr>
                            ) : filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-bold italic">
                                        {search ? (
                                            <div className="space-y-2">
                                                <p className="text-sm font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">No personnel found matching "{search}"</p>
                                                <button
                                                    onClick={() => { setSearch(''); setRoleFilter('ALL'); }}
                                                    className="px-4 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200"
                                                >
                                                    Reset Filters
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="uppercase tracking-widest">No active personnel identified.</span>
                                        )}
                                    </td>
                                </tr>
                            ) : filteredStaff.map((member: any) => (
                                <tr key={member.id} className="hover:bg-gray-50/30 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-900/5 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-[#2D7A3E] border border-gray-100 dark:border-gray-700 uppercase text-lg flex-shrink-0">
                                                {member.name ? member.name.substring(0, 2) : '??'}
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900 dark:text-white text-sm">{member.name || 'Unnamed Agent'}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{member.email || member.phone || 'NO-VECTOR'}</div>
                                                {member.staffCode && (
                                                    <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 font-mono mt-0.5">ID: {member.staffCode}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-black uppercase px-4 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-full border border-gray-100 dark:border-gray-700 inline-flex items-center gap-2 group hover:bg-gray-900 dark:hover:bg-gray-100 dark:hover:text-gray-900 hover:text-white transition-all">
                                            <Shield size={12} className="text-[#2D7A3E] group-hover:text-white" />
                                            {member.role?.replace(/_/g, ' ') || 'CASHIER'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                        {member.branch?.name || (member.branchId ? `Branch #${member.branchId.slice(-4)}` : 'Omni-Sector')}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full shadow-lg ${
                                                member.status === 'SUSPENDED' ? 'bg-amber-500 shadow-amber-500/50' :
                                                member.status === 'TERMINATED' ? 'bg-red-500 shadow-red-500/50' :
                                                'bg-green-500 shadow-green-500/50'
                                            }`}></div>
                                            <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                                {member.status || 'Active'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {extraAction && extraAction(member) && (
                                                <button
                                                    onClick={extraAction(member).onClick}
                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider transition-all flex items-center gap-1"
                                                    title={extraAction(member).label}
                                                >
                                                    <KeyRound size={12} />
                                                    <span>Access</span>
                                                </button>
                                            )}
                                            <button onClick={() => onEdit && onEdit(member)} className="text-blue-500 hover:text-blue-700 transition-colors p-1.5 cursor-pointer" title="Edit Staff"><Edit size={18} /></button>
                                            <button onClick={() => onDelete && onDelete(member.id)} className="text-red-500 hover:text-red-700 transition-colors p-1.5 cursor-pointer" title="Delete Staff"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const InviteStaffModal = ({ isOpen, onClose, onSuccess }: any) => {
    const [formData, setFormData] = useState({
        identifier: '',
        role: 'CASHIER',
        branchId: ''
    });
    const [branches, setBranches] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const token = localStorage.getItem('token');
            axios.get(`${API_URL}/tenants/branches`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            }).then(res => setBranches(res.data)).catch(() => {});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);
        setWarning(null);
        try {
            const payload: any = {
                role: formData.role,
            };
            const identifier = formData.identifier.trim();
            if (identifier.includes('@')) {
                payload.email = identifier;
                payload.phone = null;
            } else {
                payload.phone = identifier;
                payload.email = null;
            }
            if (formData.branchId.trim()) {
                payload.branchId = formData.branchId.trim();
            } else {
                payload.branchId = null;
            }

            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.post(`${API_URL}/staff/invite`, payload, { headers });

            const data = res.data;
            if (payload.email && !data.emailSent) {
                setWarning('Personnel invitation was created in the database, but the notification email failed to send. Please check your SMTP configuration.');
                onSuccess();
            } else if (payload.phone && !data.smsSent) {
                setWarning('Personnel invitation was created in the database, but the SMS dispatch failed. Please check your SMS provider configuration.');
                onSuccess();
            } else {
                setSuccess('Invitation authorized and notification sent successfully!');
                setTimeout(() => {
                    onSuccess();
                    onClose();
                    setSuccess(null);
                    setFormData({ identifier: '', role: 'CASHIER', branchId: '' });
                }, 2000);
            }
        } catch (err: any) {
            console.error('Error inviting staff:', err);
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to send invite.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-gray-800">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Invite Personnel</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Email or Phone Vector</label>
                        <input
                            required
                            type="text"
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 transition-all"
                            placeholder="staff@example.com or 080..."
                            value={formData.identifier}
                            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Security Clearance</label>
                        <select
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white transition-all appearance-none"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="CASHIER">Cashier</option>
                            <option value="INVENTORY_MANAGER">Inventory Manager</option>
                            <option value="BRANCH_MANAGER">Branch Manager</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Assigned Sector / Branch</label>
                        <select
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white transition-all"
                            value={formData.branchId}
                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        >
                            <option value="">Omni-Access (All Branches)</option>
                            {branches.map((b: any) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    {error && (
                        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold animate-in fade-in duration-200">
                            ⚠️ {error}
                        </div>
                    )}
                    {success && (
                        <div className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-xs font-bold animate-in fade-in duration-200">
                            ✅ {success}
                        </div>
                    )}
                    {warning && (
                        <div className="w-full px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-2xl text-yellow-700 text-xs font-bold animate-in fade-in duration-200">
                            ⚠️ {warning}
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="w-full bg-[#2D7A3E] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Transmitting...' : 'Authorize Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const EditCustomerModal = ({ isOpen, onClose, onSuccess, customerData }: any) => {
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', walletBalance: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (customerData) {
            setFormData({
                name: customerData.name || '',
                phone: customerData.phone || '',
                email: customerData.email || '',
                walletBalance: Number(customerData.walletBalance) || 0
            });
        }
    }, [customerData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim() ? formData.email.trim() : null,
                phone: formData.phone.trim() ? formData.phone.trim() : null,
                walletBalance: Number(formData.walletBalance)
            };
            await axios.put(`${API_URL}/customers/${customerData.id}`, payload, { headers });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating customer:', err);
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to update customer.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-gray-800">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Edit Customer</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input required type="text" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Phone Number (Optional)</label>
                        <input type="text" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input type="email" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Wallet Balance (₦)</label>
                        <input type="number" step="0.01" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.walletBalance} onChange={(e) => setFormData({ ...formData, walletBalance: Number(e.target.value) })} />
                    </div>
                    {error && (
                        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold animate-in fade-in duration-200">
                            ⚠️ {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#2D7A3E] text-white py-5 rounded-2xl font-black uppercase tracking-wide shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export const EditStaffModal = ({ isOpen, onClose, onSuccess, staffData }: any) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: 'CASHIER', branchId: '' });
    const [permissions, setPermissions] = useState({
        canVoidOrders: false,
        canApplyDiscounts: false,
        canRefund: false,
        canEditPrices: false,
        canAccessReports: false,
    });
    const [branches, setBranches] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const token = localStorage.getItem('token');
            axios.get(`${API_URL}/tenants/branches`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            }).then(res => setBranches(res.data)).catch(() => {});
        }
    }, [isOpen]);

    useEffect(() => {
        if (staffData) {
            setFormData({
                name: staffData.name || '',
                email: staffData.email || '',
                phone: staffData.phone || '',
                role: staffData.role || 'CASHIER',
                branchId: staffData.branchId || ''
            });
            const p = staffData.permissions || {};
            setPermissions({
                canVoidOrders: !!p.canVoidOrders,
                canApplyDiscounts: !!p.canApplyDiscounts,
                canRefund: !!p.canRefund,
                canEditPrices: !!p.canEditPrices,
                canAccessReports: !!p.canAccessReports,
            });
        }
    }, [staffData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const payload: any = {
                name: formData.name.trim() || undefined,
                role: formData.role,
                branchId: formData.branchId.trim() ? formData.branchId.trim() : null
            };

            payload.email = formData.email.trim() ? formData.email.trim() : null;
            payload.phone = formData.phone.trim() ? formData.phone.trim() : null;

            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.put(`${API_URL}/staff/${staffData.id}`, payload, { headers });
            await axios.patch(`${API_URL}/tenants/staff/${staffData.id}/permissions`, permissions, { headers });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating staff:', err);
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to update staff.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Edit Personnel</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Name</label>
                        <input required type="text" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input type="email" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <input type="text" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Security Clearance</label>
                        <select
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white transition-all appearance-none"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="CASHIER">Cashier</option>
                            <option value="INVENTORY_MANAGER">Inventory Manager</option>
                            <option value="BRANCH_MANAGER">Branch Manager</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Assigned Sector / Branch</label>
                        <select
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white transition-all"
                            value={formData.branchId}
                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        >
                            <option value="">Omni-Access (All Branches)</option>
                            {branches.map((b: any) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Granular Privilege Delegation Toggles */}
                    <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Granular Privilege Delegation</label>
                        <div className="space-y-2 bg-gray-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                            {[
                                { key: 'canVoidOrders', label: 'Can Void Orders' },
                                { key: 'canApplyDiscounts', label: 'Can Apply Discounts' },
                                { key: 'canRefund', label: 'Can Refund Orders' },
                                { key: 'canEditPrices', label: 'Can Edit Prices' },
                                { key: 'canAccessReports', label: 'Can Access Reports' },
                            ].map((priv) => (
                                <label key={priv.key} className="flex items-center justify-between cursor-pointer py-1">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{priv.label}</span>
                                    <input
                                        type="checkbox"
                                        checked={(permissions as any)[priv.key]}
                                        onChange={(e) => setPermissions({ ...permissions, [priv.key]: e.target.checked })}
                                        className="w-4 h-4 text-[#2D7A3E] rounded border-gray-300 focus:ring-[#2D7A3E]"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold animate-in fade-in duration-200">
                            ⚠️ {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#2D7A3E] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};


