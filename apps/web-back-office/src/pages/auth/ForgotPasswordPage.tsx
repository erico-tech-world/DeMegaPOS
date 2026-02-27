import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ForgotPasswordPage = () => {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();

    const API_URL = 'http://localhost:3000'; // Should be from env

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await axios.post(`${API_URL}/auth/forgot-password`, { identifier });
            setIsSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Unable to process request. Please check your email or phone number.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center py-10 space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-50 text-[#2D7A3E] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={48} />
                </div>
                <h1 className="text-2xl font-black text-gray-900">Recovery Link Sent</h1>
                <p className="text-gray-500 font-medium max-w-xs mx-auto">
                    We've sent a password reset link to <strong>{identifier}</strong>. Please check your inbox or messages.
                </p>
                <div className="pt-4">
                    <button
                        onClick={() => navigate('/auth/login')}
                        className="text-[#2D7A3E] font-black uppercase tracking-widest text-xs flex items-center justify-center mx-auto space-x-2 hover:underline"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Sign In</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-black text-gray-900 mb-2">Recover Access</h1>
                <p className="text-gray-500 text-sm font-medium">We'll help you regain control of your engine</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center space-x-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Email or Phone</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type="text"
                            required
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="e.g. henry@demega.com"
                        />
                    </div>
                </div>

                <button
                    disabled={isLoading}
                    type="submit"
                    className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#2D7A3E] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Request Access Link</span>}
                </button>
            </form>

            <div className="text-center pt-4">
                <Link
                    to="/auth/login"
                    className="text-[#2D7A3E] font-black uppercase tracking-widest text-xs flex items-center justify-center mx-auto space-x-2 hover:underline"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Sign In</span>
                </Link>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
