import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound, ArrowRight, AlertTriangle, Info, Copy, Check, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PlatformLoginPage = () => {
    const [secretKey, setSecretKey] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [copiedHelp, setCopiedHelp] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await axios.post(`${API_URL}/platform/auth`, { secretKey });
            localStorage.setItem('platformToken', res.data.token);
            navigate('/platform/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Invalid secret key. Access denied.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyDefault = () => {
        navigator.clipboard.writeText('demega-platform-secret-2026');
        setCopiedHelp(true);
        setTimeout(() => setCopiedHelp(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans text-gray-100">
            {/* Background Glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2.5rem] shadow-2xl p-8 sm:p-10 relative z-10">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-950/50">
                        <Shield className="text-red-500" size={32} />
                    </div>
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-1">
                        Control Tower Auth
                    </span>
                    <h1 className="text-2xl font-black text-white tracking-tight">Platform Control Tower</h1>
                    <p className="text-xs text-gray-400 font-medium mt-1">System Owner & Master Engineer Layer</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <KeyRound size={12} className="text-red-400" /> Platform Secret Key
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(true)}
                                className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition-colors"
                            >
                                <Info size={11} /> Key Guidance
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type={showSecret ? 'text' : 'password'}
                                required
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                placeholder="Enter secret key..."
                                className="w-full px-5 py-4 pr-12 bg-gray-950 border border-gray-800 text-white rounded-2xl focus:border-red-500 outline-none font-mono text-sm transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold animate-in fade-in">
                            <AlertTriangle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !secretKey.trim()}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-red-950/50 transition-all active:scale-95 cursor-pointer"
                    >
                        {loading ? 'Authenticating...' : (
                            <>
                                <span>Access Control Tower</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-800/60 text-center">
                    <button
                        onClick={() => navigate('/auth/login')}
                        className="text-xs text-gray-500 hover:text-gray-400 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                        ← Return to Tenant Staff Login
                    </button>
                </div>
            </div>

            {/* Secret Key Guidance & Recovery Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 sm:p-8 max-w-md w-full text-left space-y-5 relative shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                            <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider">
                                <KeyRound size={18} /> Platform Secret Key Guide
                            </div>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="text-gray-400 hover:text-white font-bold text-xs bg-gray-800 px-2.5 py-1 rounded-lg"
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-gray-300 leading-relaxed font-medium">
                            <p>
                                The <span className="text-white font-bold">Platform Control Tower</span> uses system-level authentication isolated from all tenant users.
                            </p>

                            <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">1. Default Built-in Environment Key:</span>
                                <div className="flex items-center justify-between bg-black px-3 py-2 rounded-lg font-mono text-xs text-amber-400">
                                    <span>demega-platform-secret-2026</span>
                                    <button
                                        onClick={handleCopyDefault}
                                        className="text-gray-400 hover:text-white flex items-center gap-1 text-[10px] font-bold"
                                    >
                                        {copiedHelp ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                        {copiedHelp ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">2. Custom Environment Secret:</span>
                                <p className="text-gray-400">
                                    Set <code className="text-red-400 bg-black px-1.5 py-0.5 rounded">PLATFORM_SECRET</code> in your backend <code className="text-gray-300">apps/backend/.env</code> file.
                                </p>
                            </div>

                            <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">3. Dynamic Generated Keys:</span>
                                <p className="text-gray-400">
                                    Once logged in, system engineers can generate dynamic single-use or fixed reusable secret keys straight from the Control Tower dashboard.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setSecretKey('demega-platform-secret-2026');
                                setShowHelpModal(false);
                            }}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                            Use Default Key & Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformLoginPage;
