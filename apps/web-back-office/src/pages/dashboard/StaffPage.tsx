import { useState, useEffect } from 'react';
import { StaffView, InviteStaffModal, EditStaffModal } from '../../components/PeopleComponents';
import { CustomConfirmModal, CustomAlertModal } from '../../components/InventoryComponents';
import { useAuth } from '../../context/AuthContext';
import {
    ShieldAlert, Key, Eye, EyeOff, Loader2, CheckCircle2,
    Users, UserX, Globe, Ban, AlertTriangle, X, BadgeCheck, Search
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../lib/apiConfig';

// ─── Omni-Branch Access Engine (read-only badge for Universal Access) ─────────

const OmniBranchAccessBadge = () => (
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 rounded-[2rem] border border-gray-800 shadow-2xl p-8 space-y-5 animate-in fade-in duration-500">
        <div className="flex items-start gap-4 border-b border-gray-800/60 pb-5">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shadow-xl shadow-indigo-500/5">
                <Globe size={24} className="animate-pulse" />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-tight">Omni-Branch Access Engine</h3>
                    <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-500/20">Enterprise SSO</span>
                </div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Status: Coming Soon</p>
            </div>
        </div>
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 flex gap-3 text-indigo-300">
            <BadgeCheck className="flex-shrink-0 mt-0.5" size={18} />
            <div className="text-xs space-y-1">
                <p className="font-black uppercase tracking-wider">Omni-Tenant Universal Access Engine</p>
                <p className="font-bold leading-relaxed text-indigo-300/80">
                    Under Construction — Enterprise Cross-Tenant SSO Coming Soon.<br />
                    Currently, staff assigned <span className="text-indigo-300 font-black">no branch</span> have Omni-Branch access across all branches under this tenant.
                </p>
            </div>
        </div>
    </div>
);

// ─── Universal Access Engine (password override) ───────────────────────────────

const UniversalAccessEngine = () => {
    const [isConfigured, setIsConfigured] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${API_URL}/tenants/settings/universal-password/status`, { headers });
            setIsConfigured(res.data.isConfigured);
        } catch (err) {
            console.error('Failed to fetch Universal Access Engine status:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        if (newPassword.length < 12) {
            setError('The universal password must be at least 12 characters for adequate strength.');
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await axios.patch(
                `${API_URL}/tenants/settings/universal-password`,
                { currentUniversalPassword: isConfigured ? currentPassword : undefined, newPassword },
                { headers }
            );
            setSuccessMessage(res.data.message || 'Universal Access Engine successfully updated.');
            setCurrentPassword('');
            setNewPassword('');
            fetchStatus();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update Universal Access Engine.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return (
        <div className="bg-gray-950 rounded-[2rem] border border-gray-900 p-8 flex items-center justify-center space-x-3 text-gray-400">
            <Loader2 className="animate-spin text-emerald-500" size={20} />
            <span className="font-bold text-xs uppercase tracking-widest">Initializing Core Security Engine...</span>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 rounded-[2rem] border border-gray-800 shadow-2xl p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800/60 pb-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shadow-xl shadow-emerald-500/5">
                        <Key size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-white tracking-tight">Universal Access Engine</h3>
                            <span className={`w-2 h-2 rounded-full relative ${isConfigured ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`}>
                                <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                            Status: {isConfigured ? 'Active / Configured' : 'Offline / Unconfigured'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-4 text-amber-300">
                <ShieldAlert className="flex-shrink-0 mt-0.5" size={20} />
                <div className="text-xs space-y-1">
                    <p className="font-black uppercase tracking-wider">CRITICAL SYSTEM DIRECTIVE</p>
                    <p className="font-bold leading-relaxed text-amber-300/80">
                        This bypass key grants absolute system override across all personnel profiles for auditing, transparency, and theft-prevention inspections. Keep this credentials file vault-safe.
                    </p>
                </div>
            </div>

            {successMessage && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-in slide-in-from-top-2">
                    <CheckCircle2 size={18} />
                    <span>{successMessage}</span>
                </div>
            )}
            {error && (
                <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-in slide-in-from-top-2">
                    <ShieldAlert size={18} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {isConfigured && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current Universal Password</label>
                        <input
                            required
                            type={showPasswords ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-gray-900/60 border border-gray-800 text-white rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-gray-900 focus:border-emerald-500 outline-none transition-all"
                            placeholder="Required to update"
                        />
                    </div>
                )}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                        {isConfigured ? 'New Universal Password' : 'Set Universal Password'}
                    </label>
                    <div className="relative">
                        <input
                            required
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-gray-900/60 border border-gray-800 text-white rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-gray-900 focus:border-emerald-500 outline-none transition-all pr-12"
                            placeholder="Minimum 12 secure characters"
                        />
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                    {isSubmitting ? (<><Loader2 className="animate-spin" size={16} /><span>Synchronizing Encryption...</span></>) : <span>Deploy System Override Code</span>}
                </button>
            </form>
        </div>
    );
};

// ─── Staff Suspend/Terminate Modal ────────────────────────────────────────────

interface ManageAccessModalProps {
    staff: any;
    onClose: () => void;
    onSuccess: () => void;
}

const ManageAccessModal = ({ staff, onClose, onSuccess }: ManageAccessModalProps) => {
    const [status, setStatus] = useState<'SUSPENDED' | 'TERMINATED'>('SUSPENDED');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!reason.trim()) { setError('Please provide an offboarding reason.'); return; }
        setIsSubmitting(true);
        try {
            await axios.patch(`${API_URL}/staff/${staff.id}/status`,
                { status, reason },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update staff access.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md mx-4 p-8 space-y-6 relative border border-gray-100 dark:border-gray-800">
                <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><X size={20} /></button>

                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 dark:bg-red-950/40 rounded-2xl flex items-center justify-center shrink-0">
                        <Ban size={26} className="text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Manage Staff Access</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Revoking access for <span className="font-black text-gray-900 dark:text-white">{staff?.name}</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {(['SUSPENDED', 'TERMINATED'] as const).map((s) => (
                        <button key={s} onClick={() => setStatus(s)}
                            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${status === s ? (s === 'TERMINATED' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500') : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}>
                            {s === 'SUSPENDED' ? '⏸ Suspend' : '🚫 Terminate'}
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Offboarding Note <span className="text-red-500">*</span></label>
                    <textarea
                        value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder={status === 'TERMINATED' ? 'e.g. Contract ended, misconduct, resignation...' : 'e.g. Pending investigation, temporary leave...'}
                        className="w-full border-2 border-gray-200 dark:border-gray-700 bg-transparent rounded-2xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:border-red-400 transition-colors resize-none"
                        rows={3}
                    />
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-3 text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-black text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Cancel</button>
                    <button onClick={handleSubmit} disabled={isSubmitting}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                        Revoke Access
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main StaffPage ───────────────────────────────────────────────────────────

interface StaffPageProps {
    staff: any[];
    isLoading: boolean;
    refresh: () => void;
}

const StaffPage = ({ staff, isLoading, refresh }: StaffPageProps) => {
    const [activeTab, setActiveTab] = useState<'active' | 'terminated'>('active');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [manageAccessStaff, setManageAccessStaff] = useState<any>(null);
    const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isManager = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'OWNER'].includes(user?.role || '');

    const [archiveSearch, setArchiveSearch] = useState('');

    const activeStaff = staff.filter((s: any) => s.status !== 'TERMINATED' && s.status !== 'SUSPENDED' && s.isActive !== false);
    const inactiveStaff = staff.filter((s: any) => s.status === 'TERMINATED' || s.status === 'SUSPENDED' || s.isActive === false);

    const filteredInactiveStaff = inactiveStaff.filter((s: any) => {
        if (!archiveSearch.trim()) return true;
        const q = archiveSearch.trim().toLowerCase();
        return (
            s.name?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.phone?.toLowerCase().includes(q) ||
            s.staffCode?.toLowerCase().includes(q) ||
            s.id?.toLowerCase().includes(q) ||
            s.status?.toLowerCase().includes(q)
        );
    });

    const handleEdit = (staffMember: any) => {
        setSelectedStaff(staffMember);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (staffId: string) => {
        setCustomConfirm({
            message: "Are you sure you want to permanently remove this staff member? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/staff/${staffId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    refresh();
                } catch (error: any) {
                    setCustomAlert({
                        title: "Deauthorization Error",
                        message: error?.response?.data?.message || "Failed to delete staff member. Please try again."
                    });
                }
            }
        });
    };

    const STATUS_COLORS: Record<string, string> = {
        ACTIVE: 'bg-green-50 text-green-700 border-green-200',
        PENDING_ACTIVATION: 'bg-amber-50 text-amber-700 border-amber-200',
        SUSPENDED: 'bg-orange-50 text-orange-700 border-orange-200',
        TERMINATED: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'active' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <Users size={16} />
                            Active Staff
                            <span className="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">{activeStaff.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('terminated')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'terminated' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <UserX size={16} />
                            Terminated / Suspended
                            {inactiveStaff.length > 0 && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">{inactiveStaff.length}</span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'active' ? (
                        <StaffView
                            staff={activeStaff}
                            isLoading={isLoading}
                            onInvite={() => setIsInviteModalOpen(true)}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            extraAction={isManager ? (s: any) => ({ label: 'Manage Access', onClick: () => setManageAccessStaff(s) }) : undefined}
                        />
                    ) : (
                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                                        Terminated &amp; Suspended Staff Archive
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold uppercase tracking-widest">Historical records preserved for audit trail</p>
                                </div>
                                <div className="relative group w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search archive..."
                                        className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-400 outline-none font-bold text-xs transition-all"
                                        value={archiveSearch}
                                        onChange={(e) => setArchiveSearch(e.target.value)}
                                    />
                                    {archiveSearch && (
                                        <button
                                            onClick={() => setArchiveSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-md"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {inactiveStaff.length === 0 ? (
                                <div className="p-12 text-center">
                                    <UserX size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400 font-bold">No terminated or suspended staff on record</p>
                                </div>
                            ) : filteredInactiveStaff.length === 0 ? (
                                <div className="p-12 text-center">
                                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">No archive records matching "{archiveSearch}"</p>
                                    <button
                                        onClick={() => setArchiveSearch('')}
                                        className="mt-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredInactiveStaff.map((s: any) => (
                                        <div key={s.id} className="flex items-center justify-between p-5 gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center font-black text-gray-400 dark:text-gray-500 text-sm">
                                                    {s.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900 dark:text-white text-sm">{s.name}</div>
                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">{s.email || s.phone}</div>
                                                    {s.staffCode && <div className="text-[9px] font-black text-gray-400 dark:text-gray-600 mt-0.5 font-mono">{s.staffCode}</div>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {s.terminatedAt && (
                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                                                        {new Date(s.terminatedAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${STATUS_COLORS[s.status] || STATUS_COLORS.TERMINATED}`}>
                                                    {s.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {isSuperAdmin && <UniversalAccessEngine />}
                    <OmniBranchAccessBadge />
                </div>
            </div>

            <InviteStaffModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={refresh}
            />

            <EditStaffModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setSelectedStaff(null); }}
                onSuccess={() => { refresh(); setIsEditModalOpen(false); setSelectedStaff(null); }}
                staffData={selectedStaff}
            />

            {manageAccessStaff && (
                <ManageAccessModal
                    staff={manageAccessStaff}
                    onClose={() => setManageAccessStaff(null)}
                    onSuccess={refresh}
                />
            )}

            {customConfirm && (
                <CustomConfirmModal
                    message={customConfirm.message}
                    onConfirm={customConfirm.onConfirm}
                    onClose={() => setCustomConfirm(null)}
                />
            )}
            {customAlert && (
                <CustomAlertModal
                    title={customAlert.title}
                    message={customAlert.message}
                    onClose={() => setCustomAlert(null)}
                />
            )}
        </div>
    );
};

export default StaffPage;
