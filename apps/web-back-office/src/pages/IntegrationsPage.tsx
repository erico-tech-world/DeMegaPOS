import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, CheckCircle, ShieldCheck, Key, Settings, Server, RefreshCw, X } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../lib/apiConfig';
import { useAuth } from '../context/AuthContext';

export const IntegrationsPage = () => {
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        provider: 'MONNIFY',
        label: 'Main Store POS Terminal',
        apiKey: '',
        secretKey: '',
        contractCode: '',
        baseUrl: 'https://sandbox.monnify.com',
        isActive: true,
    });

    const { token } = useAuth();

    const fetchIntegrations = async () => {
        setIsLoading(true);
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`${API_URL}/integrations`, { headers });
            setIntegrations(res.data || []);
        } catch (err) {
            console.error('Failed to fetch integrations:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchIntegrations();
    }, [token]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post(`${API_URL}/integrations`, formData, { headers });
            setIsAddModalOpen(false);
            setFormData({
                provider: 'MONNIFY',
                label: 'Main Store POS Terminal',
                apiKey: '',
                secretKey: '',
                contractCode: '',
                baseUrl: 'https://sandbox.monnify.com',
                isActive: true,
            });
            fetchIntegrations();
        } catch (err: any) {
            console.error('Failed to create integration:', err);
            const msg = err?.response?.data?.message || err?.message || 'Failed to save integration.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this terminal integration?')) return;
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.delete(`${API_URL}/integrations/${id}`, { headers });
            fetchIntegrations();
        } catch (err) {
            console.error('Failed to delete integration:', err);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-900/5">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-[#2D7A3E]">
                            <CreditCard size={22} />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">POS Terminal Integrations</h1>
                    </div>
                    <p className="text-xs font-bold text-gray-400">
                        Connect and manage your Monnify and Moniepoint POS card terminals for automatic payment mapping.
                    </p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-5 py-3.5 bg-[#2D7A3E] text-white rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all shadow-xl shadow-green-900/10 active:scale-95 flex items-center gap-2"
                >
                    <Plus size={16} strokeWidth={3} />
                    Connect POS Terminal
                </button>
            </div>

            {/* Content List */}
            {isLoading ? (
                <div className="py-16 text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-green-200 border-t-[#2D7A3E] rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Integrations...</p>
                </div>
            ) : integrations.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-3xl flex items-center justify-center mx-auto border border-gray-100">
                        <Server size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-black text-gray-900">No Terminal Devices Connected</h3>
                        <p className="text-xs font-bold text-gray-400 max-w-md mx-auto">
                            Connect your Monnify or Moniepoint terminal API keys to enable live payment mapping during cashier checkout.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
                    >
                        Connect Your First Device
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {integrations.map((item) => (
                        <div key={item.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-900/5 p-6 space-y-5 hover:border-[#2D7A3E] transition-all">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className="px-3 py-1 bg-green-50 text-[#2D7A3E] border border-green-100 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                                        <CheckCircle size={12} />
                                        {item.provider}
                                    </span>
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight pt-1">{item.label || 'POS Terminal'}</h3>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                                    title="Delete Integration"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="space-y-2 text-xs font-mono text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                {item.contractCode && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 font-bold font-sans text-[10px] uppercase">Contract Code</span>
                                        <span className="font-bold text-gray-800">{item.contractCode}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold font-sans text-[10px] uppercase">Base Environment</span>
                                    <span className="font-bold text-gray-800 truncate max-w-[160px]">{item.baseUrl || 'Sandbox'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold font-sans text-[10px] uppercase">Status</span>
                                    <span className={`font-black uppercase text-[10px] ${item.isActive ? 'text-green-600' : 'text-amber-600'}`}>
                                        {item.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                            </div>

                            <div className="text-[10px] text-gray-400 font-bold flex justify-between items-center pt-1">
                                <span>Connected: {new Date(item.createdAt).toLocaleDateString()}</span>
                                <span className="text-[#2D7A3E] font-black flex items-center gap-1">
                                    <ShieldCheck size={12} /> Verified
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Integration Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative z-[101] overflow-hidden animate-in zoom-in-95 p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Connect POS Terminal</h2>
                                <p className="text-xs font-bold text-gray-400">Add API credentials for Monnify / Moniepoint terminal</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Terminal Provider</label>
                                <select
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm text-gray-900 outline-none focus:border-[#2D7A3E]"
                                    value={formData.provider}
                                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                >
                                    <option value="MONNIFY">Monnify (Moniepoint POS Gateway)</option>
                                    <option value="INTERSWITCH">Interswitch POS (Coming Soon)</option>
                                    <option value="PAYSTACK">Paystack Terminal (Coming Soon)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Label / Store Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Main Checkout POS"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:border-[#2D7A3E]"
                                    value={formData.label}
                                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">API Key</label>
                                <input
                                    type="text"
                                    placeholder="MK_PROD_..."
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:border-[#2D7A3E] font-mono text-xs"
                                    value={formData.apiKey}
                                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secret Key</label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:border-[#2D7A3E] font-mono text-xs"
                                    value={formData.secretKey}
                                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contract Code (Monnify)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 8492048123"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:border-[#2D7A3E] font-mono text-xs"
                                    value={formData.contractCode}
                                    onChange={(e) => setFormData({ ...formData, contractCode: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Base URL</label>
                                <select
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm text-gray-900 outline-none focus:border-[#2D7A3E]"
                                    value={formData.baseUrl}
                                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                >
                                    <option value="https://sandbox.monnify.com">Sandbox (Testing: https://sandbox.monnify.com)</option>
                                    <option value="https://api.monnify.com">Production (Live: https://api.monnify.com)</option>
                                </select>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
                                    ⚠️ {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-[#2D7A3E] text-white rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all shadow-xl shadow-green-900/10 active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Connecting...' : 'Save Integration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
