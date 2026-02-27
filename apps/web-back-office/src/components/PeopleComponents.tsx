import { useState } from 'react';
import { UserPlus, MoreVertical, Shield, X } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const CustomersView = ({ customers, isLoading, onAdd }: any) => {
    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/20">
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Customer Engagement</h3>
                    <p className="text-xs text-gray-500 font-medium">Manage loyalty and wallet balances</p>
                </div>
                <button
                    onClick={onAdd}
                    className="bg-[#2D7A3E] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#20502E] active:scale-95 transition-all shadow-xl shadow-green-900/10 font-black uppercase tracking-wide"
                >
                    <UserPlus size={18} strokeWidth={3} />
                    <span>Add Customer</span>
                </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-100">
                            <th className="px-8 py-5">Profile Details</th>
                            <th className="px-8 py-5">Contact Vector</th>
                            <th className="px-8 py-5">Wallet Engine</th>
                            <th className="px-8 py-5">Order Loop</th>
                            <th className="px-8 py-5 text-right">Operation</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td>
                                </tr>
                            ))
                        ) : customers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-bold italic uppercase tracking-widest">No customer data identified.</td>
                            </tr>
                        ) : customers.map((c: any) => (
                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="font-black text-gray-900 leading-tight">{c.name}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ID: {c.id.slice(-8)}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="text-sm text-gray-600 font-bold">{c.phone}</div>
                                    <div className="text-[10px] text-gray-400">{c.email}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-50 text-green-700 font-black text-xs border border-green-100 shadow-sm">
                                        ₦{c.walletBalance?.toLocaleString() || 0}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-xs font-black text-gray-500 uppercase tracking-widest">{c._count?.orders || 0} Total</td>
                                <td className="px-8 py-6 text-right">
                                    <button className="p-2.5 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all text-gray-400 hover:text-gray-900 shadow-sm hover:shadow-md"><MoreVertical size={20} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const StaffView = ({ staff, isLoading, onInvite }: any) => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center sm:items-end">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tighter">Staff Directory</h1>
                    <p className="text-gray-500 text-sm">Manage hierarchical roles and branch access</p>
                </div>
                <button
                    onClick={onInvite}
                    className="bg-[#2D7A3E] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#20502E] active:scale-95 transition-all shadow-xl shadow-green-900/10 font-black uppercase tracking-wide"
                >
                    <UserPlus size={18} strokeWidth={3} />
                    <span>Invite Agent</span>
                </button>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-100">
                                <th className="px-8 py-5">Personnel Detail</th>
                                <th className="px-8 py-5">Security Role</th>
                                <th className="px-8 py-5">Branch Sector</th>
                                <th className="px-8 py-5">System Status</th>
                                <th className="px-8 py-5 text-right">Operation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-8 py-24 text-center text-gray-400 font-black animate-pulse">Syncing staff database...</td></tr>
                            ) : staff.length === 0 ? (
                                <tr><td colSpan={5} className="px-8 py-24 text-center text-gray-400 font-bold italic">No active personnel identified.</td></tr>
                            ) : staff.map((member: any) => (
                                <tr key={member.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-900/5 rounded-2xl flex items-center justify-center font-black text-[#2D7A3E] border border-gray-100 uppercase text-lg">
                                                {member.name ? member.name.substring(0, 2) : '??'}
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900 text-sm">{member.name || 'Unnamed Agent'}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{member.email || member.phone || 'NO-VECTOR'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-black uppercase px-4 py-1.5 bg-gray-50 text-gray-600 rounded-full border border-gray-100 inline-flex items-center gap-2 group hover:bg-gray-900 hover:text-white transition-all">
                                            <Shield size={12} className="text-[#2D7A3E] group-hover:text-white" />
                                            {member.role?.replace('_', ' ') || 'CASHIER'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-xs font-black text-gray-500 uppercase tracking-widest">
                                        {member.branchId ? `Branch #${member.branchId.slice(-4)}` : 'Omni-Sector'}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Active</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="text-gray-300 hover:text-gray-900 transition-colors p-2"><MoreVertical size={20} /></button>
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post(`${API_URL}/staff/invite`, formData);
            onSuccess();
            onClose();
            setFormData({ identifier: '', role: 'CASHIER', branchId: '' });
        } catch (err) {
            console.error('Error inviting staff:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Invite Personnel</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email or Phone Vector</label>
                        <input
                            required
                            type="text"
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                            placeholder="staff@example.com or 080..."
                            value={formData.identifier}
                            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Security Clearance</label>
                        <select
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all appearance-none"
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
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Sector (Optional)</label>
                        <input
                            type="text"
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                            placeholder="Leave empty for Omni-Access"
                            value={formData.branchId}
                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        />
                    </div>
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
