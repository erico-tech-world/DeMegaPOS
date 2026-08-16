import { useState, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, Briefcase, Monitor, Hash, ShieldCheck, ShieldOff, Building2, KeyRound } from 'lucide-react';
import { API_URL } from '../../lib/apiConfig';

type AuthTab = 'owner' | 'staff';

const LoginPage = () => {
    const [tab, setTab] = useState<AuthTab>('owner');
    const [searchParams] = useSearchParams();
    const isRevoked = searchParams.get('revoked') === '1';

    // ── Owner Tab State ────────────────────────────────────────────────────────
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ── Staff Tab State (4 Credentials) ────────────────────────────────────────
    const [branchCode, setBranchCode] = useState(''); // e.g. BR-LAG-01 or DM-BIZ-9011
    const [staffIdentifier, setStaffIdentifier] = useState(''); // email or staffCode (EMP-2026-004)
    const [staffPassword, setStaffPassword] = useState('');
    const [showStaffPassword, setShowStaffPassword] = useState(false);
    const [staffPin, setStaffPin] = useState('');
    const [showPin, setShowPin] = useState(false);

    // ── Shared Notification & Error State ──────────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    // ── Owner Submit (Business Owner Sign-In) ──────────────────────────────────
    const handleOwnerSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setNotice(null);
        try {
            if (!API_URL && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                throw new Error('API_UNCONFIGURED');
            }
            const res = await axios.post(`${API_URL}/auth/login`, { identifier, password });
            login(res.data.user, res.data.accessToken);
            const role = res.data.user.role;
            if (role === 'CASHIER') navigate('/pos');
            else navigate('/dashboard');
        } catch (err: any) {
            const data = err.response?.data;
            // ── Portal Role Separation Guard: Staff trying to use Owner Tab ────────
            if (data?.accountType === 'STAFF_RESTRICTED' || data?.message?.includes('Staff Access Restricted')) {
                const redirectedId = data?.identifier || identifier;
                setStaffIdentifier(redirectedId);
                setTab('staff');
                setError('Staff Access Restricted: Please use the Staff Terminal Sign-In tab with your Branch Code, Password, and PIN.');
                return;
            }

            if (err.message === 'API_UNCONFIGURED' || !err.response || err.response.status === 404 || err.code === 'ERR_NETWORK') {
                setError('Our services are currently unavailable. Please try again shortly or contact your administrator if the issue persists.');
            } else {
                const msg = data?.message;
                if (msg?.includes('Access Revoked')) {
                    setError(msg);
                } else {
                    setError(msg || 'Invalid identifier or password. Please try again.');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ── Staff Submit (Staff Terminal Sign-In: Password + 4–6 Digit PIN) ─────────
    const handleStaffSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const cleanPin = staffPin.trim();
        if (cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin)) {
            setError('Terminal PIN must be 4–6 numeric digits.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setNotice(null);
        try {
            if (!API_URL && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                throw new Error('API_UNCONFIGURED');
            }
            const res = await axios.post(`${API_URL}/auth/staff-login`, {
                branchOrBusinessCode: branchCode.trim() || undefined,
                identifier: staffIdentifier.trim(),
                password: staffPassword,
                pin: cleanPin,
            });
            login(res.data.user, res.data.accessToken);
            // Staff always routes directly to POS terminal
            navigate('/pos');
        } catch (err: any) {
            const data = err.response?.data;
            // ── Portal Role Separation Guard: Owner trying to use Staff Tab ────────
            if (data?.accountType === 'OWNER_REQUIRED' || data?.message?.includes('Super Admin / Owner account detected')) {
                const ownerEmail = data?.email || staffIdentifier;
                setIdentifier(ownerEmail);
                setTab('owner');
                setNotice('Super Admin / Owner account detected. Please sign in via the Business Owner portal.');
                return;
            }

            if (err.message === 'API_UNCONFIGURED' || !err.response || err.response.status === 404 || err.code === 'ERR_NETWORK') {
                setError('Our services are currently unavailable. Please try again shortly or contact your administrator if the issue persists.');
            } else {
                const msg = data?.message;
                if (msg?.includes('Access Revoked')) {
                    setError(msg);
                } else {
                    setError(msg || 'Invalid Staff ID, Password, or PIN. Please verify your credentials.');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const TABS: { key: AuthTab; label: string; icon: typeof Briefcase }[] = [
        { key: 'owner', label: 'Business Owner Sign-In', icon: Briefcase },
        { key: 'staff', label: 'Staff Terminal Sign-In', icon: Monitor },
    ];

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Welcome Back</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Select your sign-in method below</p>
            </div>

            {/* ── Access Revocation Banner ── */}
            {isRevoked && (
                <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 rounded-2xl px-5 py-4 flex gap-3 animate-in slide-in-from-top-3">
                    <ShieldOff size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-black text-red-700 dark:text-red-400">Access Revoked</p>
                        <p className="text-xs text-red-600 dark:text-red-400/80 font-bold mt-0.5">Your account has been suspended or terminated. Please contact your administrator for further assistance.</p>
                    </div>
                </div>
            )}

            {/* ── Tab Switcher ── */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5 gap-1.5">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        id={`tab-${key}`}
                        onClick={() => { setTab(key); setError(null); setNotice(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all ${tab === key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        <Icon size={14} />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{key === 'owner' ? 'Owner' : 'Staff'}</span>
                    </button>
                ))}
            </div>

            {/* ── Cross-Tab Information Notice ── */}
            {notice && (
                <div className="bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3 text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 animate-in slide-in-from-top-2">
                    <ShieldCheck size={18} className="shrink-0 text-blue-600" />
                    <span>{notice}</span>
                </div>
            )}

            {/* ── Context Banner ── */}
            <div className={`rounded-2xl p-3 flex items-center gap-3 text-xs font-bold border ${tab === 'owner' ? 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-800/50 text-green-700 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800/50 text-blue-700 dark:text-blue-400'}`}>
                {tab === 'owner' ? (
                    <><ShieldCheck size={16} className="shrink-0" /> Full dashboard access for Business Owners, Admins &amp; Super Admins</>
                ) : (
                    <><Monitor size={16} className="shrink-0" /> POS Terminal access for Cashiers &amp; Staff (Password + 4–6 Digit PIN)</>
                )}
            </div>

            {/* ── Error Banner ── */}
            {error && (
                <div className={`border px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${error.includes('Access Revoked') ? 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400' : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400'}`}>
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* ── Owner Sign-In Form ── */}
            {tab === 'owner' && (
                <form onSubmit={handleOwnerSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Email or Phone</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                            <input
                                id="owner-identifier"
                                type="text"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 dark:text-white rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white dark:focus:bg-gray-700 focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                                placeholder="e.g. owner@demega.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between px-1">
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Password</label>
                            <Link to="/auth/forgot-password" className="text-xs font-bold text-[#2D7A3E] hover:underline">Forgot?</Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                            <input
                                id="owner-password"
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 dark:text-white rounded-2xl py-4 pl-12 pr-12 text-sm font-bold focus:bg-white dark:focus:bg-gray-700 focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                                placeholder="••••••••"
                            />
                            <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        id="owner-login-btn"
                        disabled={isLoading}
                        type="submit"
                        className="w-full bg-[#1A1A1A] dark:bg-[#2D7A3E] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#2D7A3E] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={16} /> Sign In to Dashboard</>}
                    </button>
                </form>
            )}

            {/* ── Staff Terminal Sign-In Form (4 Fields: Branch, Staff Code, Password, 4–6 Digit PIN) ── */}
            {tab === 'staff' && (
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                    {/* 1. Branch or Business Code (Optional helper) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Business / Branch Code (Optional)</label>
                        <div className="relative group">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                id="staff-branch-code"
                                type="text"
                                value={branchCode}
                                onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 dark:text-white rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all uppercase"
                                placeholder="e.g. BR-LAG-01 or DM-BIZ-9011"
                            />
                        </div>
                    </div>

                    {/* 2. Staff Code or Email */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Staff Code or Email</label>
                        <div className="relative group">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                id="staff-identifier"
                                type="text"
                                required
                                value={staffIdentifier}
                                onChange={(e) => setStaffIdentifier(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 dark:text-white rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                placeholder="e.g. EMP-2026-004 or cashier@demega.com"
                            />
                        </div>
                    </div>

                    {/* 3. Staff Account Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Staff Account Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                id="staff-password"
                                type={showStaffPassword ? "text" : "password"}
                                required
                                value={staffPassword}
                                onChange={(e) => setStaffPassword(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 dark:text-white rounded-2xl py-3.5 pl-11 pr-11 text-sm font-bold focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                placeholder="••••••••"
                            />
                            <button type="button" tabIndex={-1} onClick={() => setShowStaffPassword(!showStaffPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none">
                                {showStaffPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* 4. 4–6 Digit POS Terminal PIN */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between px-1">
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">4–6 Digit Terminal PIN</label>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Numeric PIN</span>
                        </div>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                id="staff-pin"
                                type={showPin ? "text" : "password"}
                                required
                                inputMode="numeric"
                                maxLength={6}
                                value={staffPin}
                                onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 dark:text-white rounded-2xl py-3.5 pl-11 pr-11 text-sm font-black font-mono tracking-[0.5em] focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                placeholder="● ● ● ●"
                            />
                            <button type="button" tabIndex={-1} onClick={() => setShowPin(!showPin)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none">
                                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        id="staff-login-btn"
                        disabled={isLoading}
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer mt-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Monitor size={16} /> Open POS Terminal</>}
                    </button>
                </form>
            )}

            <div className="text-center pt-2">
                <p className="text-gray-400 dark:text-gray-500 text-sm font-bold">
                    New to DeMega?
                    <Link to="/auth/register" className="text-[#2D7A3E] ml-2 hover:underline">Register Business</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;

