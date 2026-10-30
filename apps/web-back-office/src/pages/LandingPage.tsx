import { useNavigate } from 'react-router-dom';
import {
    BarChart3,
    LayoutDashboard,
    Smartphone,
    Users,
    ShieldCheck,
    Zap,
    ArrowRight
} from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
                <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-[#2D7A3E] rounded-xl flex items-center justify-center">
                        <LayoutDashboard className="text-white" size={24} />
                    </div>
                    <span className="text-2xl font-black text-[#1A1A1A] tracking-tight">DeMega<span className="text-[#2D7A3E]">POS</span></span>
                </div>
                <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-600">
                    <a href="#features" className="hover:text-[#2D7A3E] transition-colors">Features</a>
                    <a href="#pricing" className="hover:text-[#2D7A3E] transition-colors">Pricing</a>
                    <a href="#contact" className="hover:text-[#2D7A3E] transition-colors">Support</a>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/auth/login')}
                        className="text-sm font-bold text-gray-700 hover:text-[#2D7A3E] transition-colors px-4 py-2"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => navigate('/auth/register')}
                        className="bg-[#2D7A3E] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-[#235E30] transition-all shadow-lg shadow-green-900/10"
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-20 pb-32 px-6 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center space-x-2 bg-green-50 text-[#2D7A3E] px-4 py-1.5 rounded-full text-xs font-bold mb-8 animate-bounce">
                    <Zap size={14} />
                    <span>v2.0 Now Live - Multi-Branch Support</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight mb-8">
                    The Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2D7A3E] to-blue-600">Operating System</span> <br />
                    for Modern Retail
                </h1>
                <p className="text-gray-500 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-12 font-medium">
                    DeMegaPOS combines powerful inventory management, real-time analytics, and seamless multi-channel payments into one beautiful interface. Built for businesses that scale.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <button
                        onClick={() => navigate('/auth/register')}
                        className="w-full sm:w-auto bg-[#2D7A3E] text-white text-lg font-bold px-10 py-4 rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-green-900/20 flex items-center justify-center space-x-3"
                    >
                        <span>Register Your Business</span>
                        <ArrowRight size={20} />
                    </button>
                    <button className="w-full sm:w-auto bg-white text-gray-900 text-lg font-bold px-10 py-4 rounded-2xl border-2 border-gray-100 hover:bg-gray-50 transition-all flex items-center justify-center space-x-3">
                        <Smartphone size={20} />
                        <span>Download App</span>
                    </button>
                </div>
            </section>

            {/* Stats/Logo Cloud Placeholder */}
            <section className="pb-32 px-6 max-w-7xl mx-auto">
                <div className="bg-gray-50 rounded-[3rem] p-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { label: 'Transactions', value: '1.2M+' },
                        { label: 'Active Stores', value: '500+' },
                        { label: 'Countries', value: '12+' },
                        { label: 'Uptime', value: '99.9%' }
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
                            <div className="text-xs font-bold text-[#2D7A3E] uppercase tracking-widest">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">Everything you need to <span className="text-[#2D7A3E]">Dominate</span></h2>
                    <p className="text-gray-500 max-w-2xl mx-auto font-medium">Powerful tools designed to simplify your daily operations and maximize profit.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: <LayoutDashboard size={24} />,
                            title: "Unified Dashboard",
                            desc: "Manage products, sales, and staff across all your branches from a single window."
                        },
                        {
                            icon: <BarChart3 size={24} />,
                            title: "Advanced Analytics",
                            desc: "Get deep insights into your business performance with real-time reporting and trends."
                        },
                        {
                            icon: <Smartphone size={24} />,
                            title: "Mobile POS",
                            desc: "Sell anywhere, any time with our robust mobile application that works offline."
                        },
                        {
                            icon: <Users size={24} />,
                            title: "Customer Loyalty",
                            desc: "Build lasting relationships with integrated wallet systems and VIP pricing."
                        },
                        {
                            icon: <ShieldCheck size={24} />,
                            title: "Secure & Reliable",
                            desc: "Bank-grade security ensures your data and transactions are protected 24/7."
                        },
                        {
                            icon: <Zap size={24} />,
                            title: "Lightning Fast",
                            desc: "Optimized for speed, so your staff can serve customers without delays."
                        }
                    ].map((feature, i) => (
                        <div key={i} className="group p-8 rounded-[2.5rem] bg-white border border-gray-100 hover:border-green-200 hover:shadow-2xl hover:shadow-green-900/5 transition-all duration-500">
                            <div className="w-14 h-14 bg-green-50 text-[#2D7A3E] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#2D7A3E] group-hover:text-white transition-all duration-500">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                            <p className="text-gray-500 leading-relaxed text-sm font-medium">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto bg-gray-900 rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#2D7A3E] rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-8 relative z-10 leading-tight">Ready to take your business <br />to the next level?</h2>
                    <button
                        onClick={() => navigate('/auth/register')}
                        className="bg-white text-gray-900 text-lg font-bold px-12 py-5 rounded-2xl hover:scale-105 transition-all shadow-xl relative z-10"
                    >
                        Get Started Now — It's Free
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-gray-100 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
                    <div className="flex items-center space-x-2 opacity-50 grayscale">
                        <LayoutDashboard size={20} />
                        <span className="text-lg font-black tracking-tight tracking-tighter">DeMega<span className="text-[#2D7A3E]">POS</span></span>
                    </div>
                    <div className="text-sm font-medium text-gray-400">
                        © {new Date().getFullYear()} DeMegaPOS Core Engines. All rights reserved.
                    </div>
                    <div className="flex items-center space-x-6">
                        <a href="#" className="text-gray-400 hover:text-[#2D7A3E] transition-colors"><Smartphone size={20} /></a>
                        <a href="#" className="text-gray-400 hover:text-[#2D7A3E] transition-colors"><BarChart3 size={20} /></a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
