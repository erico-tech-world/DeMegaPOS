import { useState, useEffect } from 'react';
import { StaffView, InviteStaffModal, EditStaffModal } from '../../components/PeopleComponents';
import { CustomConfirmModal, CustomAlertModal } from '../../components/InventoryComponents';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Key, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

    useEffect(() => {
        fetchStatus();
    }, []);

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
                {
                    currentUniversalPassword: isConfigured ? currentPassword : undefined,
                    newPassword
                },
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

    if (isLoading) {
        return (
            <div className="bg-gray-950 rounded-[2rem] border border-gray-900 p-8 flex items-center justify-center space-x-3 text-gray-400">
                <Loader2 className="animate-spin text-emerald-500" size={20} />
                <span className="font-bold text-xs uppercase tracking-widest">Initializing Core Security Engine...</span>
            </div>
        );
    }

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
                        <div className="relative group">
                            <input
                                required
                                type={showPasswords ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full bg-gray-900/60 border border-gray-800 text-white rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                                placeholder="Required to update"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                        {isConfigured ? 'New Universal Password' : 'Set Universal Password'}
                    </label>
                    <div className="relative group">
                        <input
                            required
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-gray-900/60 border border-gray-800 text-white rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all pr-12"
                            placeholder="Minimum 12 secure characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                        >
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-950/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                <span>Synchronizing Encryption...</span>
                            </>
                        ) : (
                            <span>Deploy System Override Code</span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

interface StaffPageProps {
    staff: any[];
    isLoading: boolean;
    refresh: () => void;
}

const StaffPage = ({ staff, isLoading, refresh }: StaffPageProps) => {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const handleEdit = (staffMember: any) => {
        setSelectedStaff(staffMember);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (staffId: string) => {
        setCustomConfirm({
            message: "Are you sure you want to remove this staff member? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/staff/${staffId}`, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    refresh();
                } catch (error: any) {
                    console.error("Error deleting staff:", error);
                    setCustomAlert({
                        title: "Deauthorization Error",
                        message: error?.response?.data?.message || "Failed to delete staff member. Please try again."
                    });
                }
            }
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <StaffView
                        staff={staff}
                        isLoading={isLoading}
                        onInvite={() => setIsInviteModalOpen(true)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>

                {isSuperAdmin && (
                    <div className="lg:col-span-1">
                        <UniversalAccessEngine />
                    </div>
                )}
            </div>

            <InviteStaffModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={refresh}
            />

            <EditStaffModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedStaff(null);
                }}
                onSuccess={() => {
                    refresh();
                    setIsEditModalOpen(false);
                    setSelectedStaff(null);
                }}
                staffData={selectedStaff}
            />

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
