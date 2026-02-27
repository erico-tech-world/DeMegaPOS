import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const API_URL = 'http://localhost:3000'; // Should be from env

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { identifier, password });
            login(res.data.user, res.data.accessToken);

            // Role-based routing
            const role = res.data.user.role;
            if (role === 'CASHIER' || role === 'BRANCH_MANAGER') {
                navigate('/pos');
            } else {
                navigate('/inventory'); // Default for management
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-gray-500 text-sm font-medium">Continue to your business dashboard</p>
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

                <div className="space-y-2">
                    <div className="flex justify-between px-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Password</label>
                        <Link to="/auth/forgot-password" className="text-xs font-bold text-[#2D7A3E] hover:underline">Forgot?</Link>
                    </div>
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

                <button
                    disabled={isLoading}
                    type="submit"
                    className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#2D7A3E] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Sign In Engine</span>}
                </button>
            </form>

            <div className="text-center pt-4">
                <p className="text-gray-400 text-sm font-bold">
                    New to DeMega?
                    <Link to="/auth/register" className="text-[#2D7A3E] ml-2 hover:underline">Register Business</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
