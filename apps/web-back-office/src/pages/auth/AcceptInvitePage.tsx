import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AcceptInvitePage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();
    const { login } = useAuth();

    const [inviteDetails, setInviteDetails] = useState<{
        valid: boolean;
        email: string | null;
        phone: string | null;
        role: string;
        businessName: string;
    } | null>(null);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [isValidating, setIsValidating] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Validate the token on mount
    useEffect(() => {
        if (!token) {
            setValidationError('Invitation token is missing. Please check your invitation link.');
            setIsValidating(false);
            return;
        }

        const validateToken = async () => {
            try {
                const res = await axios.get(`${API_URL}/auth/accept-invite`, {
                    params: { token }
                });
                setInviteDetails(res.data);
            } catch (err: any) {
                setValidationError(
                    err.response?.data?.message || 
                    'This invitation link is invalid or has expired. Please ask your administrator to send a new invite.'
                );
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await axios.post(`${API_URL}/auth/accept-invite`, {
                token,
                name,
                password
            });

            // Log in the newly onboarded user
            login(res.data.user, res.data.accessToken);

            // Redirect based on role
            const role = res.data.user.role;
            if (role === 'CASHIER' || role === 'BRANCH_MANAGER') {
                navigate('/pos');
            } else {
                navigate('/inventory');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to complete onboarding. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isValidating) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="animate-spin text-[#2D7A3E]" size={40} />
                <p className="text-gray-500 text-sm font-black uppercase tracking-widest">Verifying invitation credentials...</p>
            </div>
        );
    }

    if (validationError) {
        return (
            <div className="space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 border border-red-100 shadow-xl shadow-red-500/5 animate-bounce">
                    <AlertCircle size={28} />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">Invitation Expired</h1>
                    <p className="text-gray-500 text-sm font-bold px-4 leading-relaxed">{validationError}</p>
                </div>
                <div className="pt-4">
                    <Link
                        to="/auth/login"
                        className="inline-block bg-[#1A1A1A] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#2D7A3E] active:scale-95 transition-all shadow-xl shadow-gray-900/10"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    const roleName = inviteDetails?.role.replace(/_/g, ' ') || '';

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center text-[#2D7A3E] border border-green-100 shadow-xl shadow-green-900/5 mb-4">
                    <ShieldCheck size={28} />
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Join {inviteDetails?.businessName}</h1>
                <p className="text-gray-500 text-sm font-medium">Activate your staff account and set your credentials</p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3.5 py-1.5 rounded-full border border-green-100 text-xs font-black uppercase tracking-wider">
                    Role: {roleName}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center space-x-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Your Full Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="e.g. Henry Erico"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Invited Via</label>
                    <input
                        type="text"
                        disabled
                        value={inviteDetails?.email || inviteDetails?.phone || ''}
                        className="w-full bg-gray-100 border border-gray-100 text-gray-400 rounded-2xl py-4 px-6 text-sm font-bold cursor-not-allowed outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Set Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Confirm Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#2D7A3E] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <span>Activate Account</span>}
                </button>
            </form>
        </div>
    );
};

export default AcceptInvitePage;
