import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Server, Activity, Users, Store, DollarSign, LogOut, RefreshCw, AlertTriangle, CheckCircle, KeyRound, Plus, Copy, Check } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../../lib/apiConfig';

const PlatformDashboard = () => {
    const [data, setData] = useState<any>(null);
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dynamic Secret Key Generator state
    const [showKeyGenModal, setShowKeyGenModal] = useState(false);
    const [keyLabel, setKeyLabel] = useState('');
    const [isSingleUse, setIsSingleUse] = useState(false);
    const [customSecretInput, setCustomSecretInput] = useState('');
    const [genLoading, setGenLoading] = useState(false);
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState(false);

    const navigate = useNavigate();

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('platformToken');
            if (!token) {
                navigate('/platform/login');
                return;
            }
            const [statsRes, keysRes] = await Promise.all([
                axios.get(`${API_URL}/platform/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/platform/keys`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { keys: [] } }))
            ]);
            setData(statsRes.data);
            setKeys(keysRes.data.keys || []);
        } catch (err: any) {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                localStorage.removeItem('platformToken');
                navigate('/platform/login');
            } else {
                setError(err?.response?.data?.message || 'Failed to connect to Platform Control Tower API.');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleLogout = () => {
        localStorage.removeItem('platformToken');
        navigate('/platform/login');
    };

    const handleGenerateKey = async () => {
        setGenLoading(true);
        try {
            const token = localStorage.getItem('platformToken');
            const res = await axios.post(`${API_URL}/platform/keys/generate`, {
                label: keyLabel || 'System Admin Key',
                isSingleUse,
                customSecret: customSecretInput.trim() || undefined
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGeneratedKey(res.data.key.secretKey);
            fetchStats();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Failed to generate key');
        } finally {
            setGenLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
            {/* Top Persistent Warning Banner */}
            <div className="bg-red-600/90 text-white px-6 py-2.5 flex items-center justify-between text-xs font-black tracking-wider uppercase shadow-lg border-b border-red-500">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="animate-pulse" />
                    <span>SUPER ADMIN OVERRIDE ENGINE — PLATFORM CONTROL TOWER</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden sm:inline bg-black/20 px-3 py-1 rounded-full text-[10px]">GLOBAL SCOPE ACCESS</span>
                    <button
                        onClick={handleLogout}
                        className="hover:bg-black/30 p-1 px-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                        <LogOut size={14} /> Exit Tower
                    </button>
                </div>
            </div>

            {/* Header Nav */}
            <header className="px-8 py-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
                        <Shield className="text-red-500" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white leading-none">DeMega SaaS Control Tower</h1>
                        <span className="text-[10px] text-gray-500 font-mono">Master Orchestrator Engine</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setGeneratedKey(null);
                            setKeyLabel('');
                            setCustomSecretInput('');
                            setIsSingleUse(false);
                            setShowKeyGenModal(true);
                        }}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/50"
                    >
                        <Plus size={14} /> Generate Platform Secret Key
                    </button>

                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="p-2.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-white cursor-pointer"
                        title="Refresh Stats"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-900 border border-gray-800 rounded-2xl" />
                        ))}
                    </div>
                ) : data ? (
                    <>
                        {/* Global SaaS KPIs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 flex items-center gap-4 shadow-xl">
                                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                    <Store size={22} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Registered Tenants</p>
                                    <p className="text-2xl font-black text-white mt-0.5">{data.kpis.totalTenants}</p>
                                    <p className="text-[10px] text-green-400 font-bold mt-1">{data.kpis.activeTenants30d} Active (30d)</p>
                                </div>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 flex items-center gap-4 shadow-xl">
                                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                    <Users size={22} className="text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Platform Users</p>
                                    <p className="text-2xl font-black text-white mt-0.5">{data.kpis.totalUsers}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">{data.kpis.totalStores} Active Stores</p>
                                </div>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 flex items-center gap-4 shadow-xl">
                                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                    <DollarSign size={22} className="text-green-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Platform GMV</p>
                                    <p className="text-2xl font-black text-white mt-0.5">₦{Number(data.kpis.platformGMV).toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">{data.kpis.totalOrders} Successful Orders</p>
                                </div>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 flex items-center gap-4 shadow-xl">
                                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                    <Activity size={22} className="text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">DB Latency</p>
                                    <p className="text-2xl font-black text-white mt-0.5">{data.health.dbPingLatency} ms</p>
                                    <p className="text-[10px] text-green-400 font-bold mt-1">Status: Operational</p>
                                </div>
                            </div>
                        </div>

                        {/* Secret Key Manager & Server Health */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Platform Secret Keys Card */}
                            <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <KeyRound size={16} className="text-red-400" /> Platform Access Keys
                                    </h3>
                                    <span className="text-[10px] font-mono text-gray-500 bg-gray-950 px-2.5 py-1 rounded-full border border-gray-800">
                                        Env + DB Keys Active
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-between text-xs font-mono">
                                        <div>
                                            <span className="text-white font-bold block">Environment Secret Key</span>
                                            <span className="text-gray-500 text-[10px]">process.env.PLATFORM_SECRET</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                                            Permanent
                                        </span>
                                    </div>
                                    {keys.map((k: any) => (
                                        <div key={k.id} className="p-3 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-between text-xs font-mono">
                                            <div className="min-w-0 pr-2">
                                                <span className="text-white font-bold block truncate">{k.label}</span>
                                                <span className="text-gray-400 text-[10px] block truncate">{k.secretKey}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                                k.isUsed ? 'bg-gray-800 text-gray-400' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                                {k.isSingleUse ? (k.isUsed ? 'Used (Spent)' : 'Single-Use') : 'Reusable'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Engineering Health Monitor */}
                            <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Server size={16} className="text-red-400" /> Server Health Monitor
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                    <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                                        <span className="text-gray-500 block text-[9px]">ENVIRONMENT</span>
                                        <span className="text-white font-bold">{data.health.environment}</span>
                                    </div>
                                    <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                                        <span className="text-gray-500 block text-[9px]">UPTIME</span>
                                        <span className="text-white font-bold">{Math.round(data.health.uptime / 60)} mins</span>
                                    </div>
                                    <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                                        <span className="text-gray-500 block text-[9px]">NODE VERSION</span>
                                        <span className="text-white font-bold">{data.health.nodeVersion}</span>
                                    </div>
                                    <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                                        <span className="text-gray-500 block text-[9px]">DATABASE ENGINE</span>
                                        <span className="text-green-400 font-bold">PostgreSQL / Supabase</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Multi-Tenant Directory Table */}
                        <div className="bg-gray-900 border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-black text-white">Multi-Tenant Directory</h2>
                                    <p className="text-xs text-gray-500 font-medium">Global tenant breakdown & performance</p>
                                </div>
                                <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs font-mono font-bold">
                                    {data.tenantDirectory.length} Tenants
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-sans">
                                    <thead>
                                        <tr className="bg-gray-950 text-gray-500 uppercase tracking-widest font-black text-[9px] border-b border-gray-800">
                                            <th className="px-6 py-4">Tenant Name</th>
                                            <th className="px-6 py-4">Stores</th>
                                            <th className="px-6 py-4">Users</th>
                                            <th className="px-6 py-4">Completed Orders</th>
                                            <th className="px-6 py-4">Total Revenue</th>
                                            <th className="px-6 py-4">Activity (30d)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {data.tenantDirectory.map((tenant: any) => (
                                            <tr key={tenant.id} className="hover:bg-gray-850/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-white text-sm block">{tenant.name}</span>
                                                    <span className="font-mono text-[10px] text-gray-500">{tenant.id}</span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-300">{tenant.storeCount} stores</td>
                                                <td className="px-6 py-4 font-bold text-gray-300">{tenant.userCount} users</td>
                                                <td className="px-6 py-4 font-bold text-gray-300">{tenant.orderCount} orders</td>
                                                <td className="px-6 py-4 font-black text-green-400">₦{Number(tenant.revenue).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    {tenant.isActive30d ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase">
                                                            <CheckCircle size={12} /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700 text-[10px] font-black uppercase">
                                                            Dormant
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : null}
            </main>

            {/* Secret Key Generator Modal */}
            {showKeyGenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 sm:p-8 max-w-md w-full text-left space-y-6 relative shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                            <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider">
                                <KeyRound size={18} /> Platform Secret Key Generator
                            </div>
                            <button
                                onClick={() => setShowKeyGenModal(false)}
                                className="text-gray-400 hover:text-white font-bold text-xs bg-gray-800 px-2.5 py-1 rounded-lg"
                            >
                                Close
                            </button>
                        </div>

                        {generatedKey ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-xs font-bold flex items-center gap-2">
                                    <CheckCircle size={18} /> Platform Secret Key Created Successfully!
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Generated Key:</label>
                                    <div className="flex items-center justify-between bg-black px-4 py-3 rounded-xl border border-gray-800 font-mono text-sm text-amber-400 font-bold">
                                        <span>{generatedKey}</span>
                                        <button
                                            onClick={() => handleCopy(generatedKey)}
                                            className="text-gray-400 hover:text-white flex items-center gap-1 text-xs font-bold ml-2"
                                        >
                                            {copiedKey ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                            {copiedKey ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowKeyGenModal(false)}
                                    className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Key Label / Admin Description:</label>
                                    <input
                                        type="text"
                                        value={keyLabel}
                                        onChange={(e) => setKeyLabel(e.target.value)}
                                        placeholder="e.g. Lead Engineer Key / Emergency Key"
                                        className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-xs outline-none focus:border-red-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Custom Secret (Optional):</label>
                                    <input
                                        type="text"
                                        value={customSecretInput}
                                        onChange={(e) => setCustomSecretInput(e.target.value)}
                                        placeholder="Leave empty for auto random generation..."
                                        className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white font-mono text-xs outline-none focus:border-red-500"
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-950 border border-gray-800 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="singleUseCheck"
                                        checked={isSingleUse}
                                        onChange={(e) => setIsSingleUse(e.target.checked)}
                                        className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                                    />
                                    <label htmlFor="singleUseCheck" className="text-xs text-gray-300 font-bold cursor-pointer">
                                        Single-Use Key (Self-destructs after first login)
                                    </label>
                                </div>

                                <button
                                    onClick={handleGenerateKey}
                                    disabled={genLoading}
                                    className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-red-950/50"
                                >
                                    {genLoading ? 'Generating Key...' : 'Generate Platform Key'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformDashboard;
