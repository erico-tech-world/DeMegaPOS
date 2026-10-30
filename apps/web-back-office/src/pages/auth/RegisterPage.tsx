import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Building2, User, Mail, Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../../lib/apiConfig';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        businessName: '',
        name: '',
        identifier: '', // Flexible Email or Phone
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();


    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Basic validation for Email or Phone
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.identifier);
        const isPhone = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(formData.identifier);

        if (!isEmail && !isPhone) {
            setError('Please enter a valid email address or phone number.');
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        try {
            const registrationData = {
                ...formData,
                email: isEmail ? formData.identifier : undefined,
                phone: isPhone ? formData.identifier : undefined,
            };
            const res = await axios.post(`${API_URL}/auth/business-register`, registrationData);
            setIsSuccess(true);

            // Auto-login after short delay to show success
            setTimeout(() => {
                login(res.data.user, res.data.accessToken);
                navigate('/dashboard'); // Production-ready landing
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Check your details or name availability.');
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
                <h1 className="text-2xl font-black text-gray-900">Success!</h1>
                <p className="text-gray-500 font-medium">Your business <strong>{formData.businessName}</strong> has been registered. Redirecting to your dashboard...</p>
                <Loader2 className="animate-spin mx-auto text-[#2D7A3E]" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-black text-gray-900 mb-2">Register Business</h1>
                <p className="text-gray-500 text-sm font-medium">Start managing your retail empire today</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center space-x-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Business Name</label>
                    <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type="text"
                            name="businessName"
                            required
                            value={formData.businessName}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="e.g. DeMega Global Retail"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Your Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="e.g. Henry DeMega"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Email or Phone Number</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type="text"
                            name="identifier"
                            required
                            value={formData.identifier}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="e.g. henry@example.com or +234..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Secure Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="Minimum 6 characters"
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
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold focus:bg-white focus:border-[#2D7A3E] focus:ring-4 focus:ring-green-900/5 outline-none transition-all"
                            placeholder="Confirm your password"
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <button
                    disabled={isLoading}
                    type="submit"
                    className="w-full bg-[#2D7A3E] text-white py-4 rounded-2xl font-black uppercase tracking-wide hover:bg-[#20502E] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-green-900/10 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Launch My Business</span>}
                </button>
            </form>

            <div className="text-center pt-4">
                <p className="text-gray-400 text-sm font-bold">
                    Already have a business?
                    <Link to="/auth/login" className="text-[#2D7A3E] ml-2 hover:underline">Sign In</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
