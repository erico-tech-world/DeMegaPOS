import { useState, useEffect } from 'react';
import { Store, Shield, CreditCard, Receipt, Building2, Plus, Upload, KeyRound, Lock, Eye, EyeOff, Sun, Moon, Mail, Phone, MapPin, FileText, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

import { API_URL } from '../lib/apiConfig';

const SettingsPage = () => {
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'terminal' | 'receipt' | 'branches'>('profile');

    // Business Profile State
    const [businessName, setBusinessName] = useState('DeMegaPOS');
    const [businessEmail, setBusinessEmail] = useState('contact@demegapos.com');
    const [businessPhone, setBusinessPhone] = useState('+234 800 000 0000');
    const [businessAddress, setBusinessAddress] = useState('123 Enterprise Way, Victoria Island, Lagos');
    const [taxId, setTaxId] = useState('TIN-987654321');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

    // Cashier Refund Policy State
    const [refundPolicy, setRefundPolicy] = useState<'ENABLED' | 'PIN_REQUIRED' | 'RESTRICTED'>('PIN_REQUIRED');

    // Universal Access Engine State
    const [currentUniversalPass, setCurrentUniversalPass] = useState('');
    const [newUniversalPass, setNewUniversalPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [universalStatus, setUniversalStatus] = useState<boolean | null>(null);
    const [universalMsg, setUniversalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [universalLoading, setUniversalLoading] = useState(false);

    // Account Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [changePwLoading, setChangePwLoading] = useState(false);
    const [changePwMsg, setChangePwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Receipt Settings State
    const [promptEmailReceipt, setPromptEmailReceipt] = useState<boolean>(() => {
        return localStorage.getItem('demega_prompt_email_receipt') !== 'false';
    });
    const [receiptHeader, setReceiptHeader] = useState('Enterprise Retail & POS Solutions');
    const [receiptFooter, setReceiptFooter] = useState('Thank you for shopping with us! Please come again.');
    const [receiptSavedMsg, setReceiptSavedMsg] = useState<string | null>(null);

    // Branches Tab State
    const [branches, setBranches] = useState<any[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [showAddBranchModal, setShowAddBranchModal] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [newBranchLocation, setNewBranchLocation] = useState('');
    const [newBranchPhone, setNewBranchPhone] = useState('');
    const [newBranchHeader, setNewBranchHeader] = useState('');
    const [newBranchFooter, setNewBranchFooter] = useState('');
    const [branchSubmitting, setBranchSubmitting] = useState(false);
    const [branchMsg, setBranchMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Edit Branch State
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [editBranchName, setEditBranchName] = useState('');
    const [editBranchLocation, setEditBranchLocation] = useState('');
    const [editBranchPhone, setEditBranchPhone] = useState('');
    const [editBranchHeader, setEditBranchHeader] = useState('');
    const [editBranchFooter, setEditBranchFooter] = useState('');

    // Deactivate Branch State
    const [deactivatingBranch, setDeactivatingBranch] = useState<any>(null);
    const [deactivateAlertMsg, setDeactivateAlertMsg] = useState<string | null>(null);

    // Fetch General Settings from DB
    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/tenants/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                if (res.data.businessName) setBusinessName(res.data.businessName);
                if (res.data.businessEmail) setBusinessEmail(res.data.businessEmail);
                if (res.data.businessPhone) setBusinessPhone(res.data.businessPhone);
                if (res.data.businessAddress) setBusinessAddress(res.data.businessAddress);
                if (res.data.taxId) setTaxId(res.data.taxId);
                if (res.data.logoUrl !== undefined) setLogoUrl(res.data.logoUrl);
                if (res.data.refundPolicy) setRefundPolicy(res.data.refundPolicy);
                if (res.data.promptEmailReceipt !== undefined) setPromptEmailReceipt(res.data.promptEmailReceipt);
                if (res.data.receiptHeader) setReceiptHeader(res.data.receiptHeader);
                if (res.data.receiptFooter) setReceiptFooter(res.data.receiptFooter);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    };

    // Fetch Universal Password Status
    const fetchUniversalStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/tenants/settings/universal-password/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUniversalStatus(res.data.isConfigured);
        } catch { }
    };

    // Fetch Branches
    const fetchBranches = async () => {
        setBranchesLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/tenants/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(res.data);
        } catch { } finally {
            setBranchesLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchUniversalStatus();
        fetchBranches();
    }, []);

    // Handle Logo Upload
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setLogoUrl(base64);
            try {
                const token = localStorage.getItem('token');
                await axios.patch(`${API_URL}/tenants/settings`, { logoUrl: base64 }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error('Failed to persist logo:', err);
            }
        };
        reader.readAsDataURL(file);
    };

    // Save Business Profile Credentials
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/tenants/settings`, {
                businessName,
                businessEmail,
                businessPhone,
                businessAddress,
                taxId,
                logoUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfileSuccessMsg('Business credentials & store profile updated successfully.');
            setTimeout(() => setProfileSuccessMsg(null), 4000);
        } catch (err: any) {
            setProfileSuccessMsg(err?.response?.data?.message || 'Failed to save business profile.');
        }
    };

    // Toggle Prompt Email Receipt
    const handleToggleEmailPrompt = async (val: boolean) => {
        setPromptEmailReceipt(val);
        localStorage.setItem('demega_prompt_email_receipt', String(val));
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/tenants/settings`, { promptEmailReceipt: val }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to update email prompt setting:', err);
        }
    };

    // Select Refund Policy
    const handleSelectRefundPolicy = async (val: 'ENABLED' | 'PIN_REQUIRED' | 'RESTRICTED') => {
        setRefundPolicy(val);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/tenants/settings`, { refundPolicy: val }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to update refund policy setting:', err);
        }
    };

    const handleSaveReceiptSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/tenants/settings`, {
                receiptHeader,
                receiptFooter
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReceiptSavedMsg('Receipt configuration & checkout prompts saved.');
            setTimeout(() => setReceiptSavedMsg(null), 4000);
        } catch (err: any) {
            setReceiptSavedMsg('Failed to save receipt settings.');
        }
    };

    // Update Universal Password
    const handleUpdateUniversalPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setUniversalLoading(true);
        setUniversalMsg(null);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/tenants/settings/universal-password`, {
                currentUniversalPassword: currentUniversalPass || undefined,
                newPassword: newUniversalPass
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUniversalMsg({ type: 'success', text: 'Universal Access Engine password updated successfully.' });
            setCurrentUniversalPass('');
            setNewUniversalPass('');
            fetchUniversalStatus();
        } catch (err: any) {
            setUniversalMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update universal password.' });
        } finally {
            setUniversalLoading(false);
        }
    };

    // Change User Account Password Handler
    const handleChangeAccountPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangePwMsg(null);

        if (!currentPassword) {
            setChangePwMsg({ type: 'error', text: 'Current password is required.' });
            return;
        }

        if (newPassword.length < 8) {
            setChangePwMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setChangePwMsg({ type: 'error', text: 'New passwords do not match. Please verify and retry.' });
            return;
        }

        if (currentPassword === newPassword) {
            setChangePwMsg({ type: 'error', text: 'New password must be different from your current password.' });
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setChangePwMsg({ type: 'error', text: 'Authentication session not found. Please log in again.' });
            return;
        }

        setChangePwLoading(true);
        try {
            const res = await axios.patch(`${API_URL}/auth/change-password`, {
                currentPassword,
                newPassword,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChangePwMsg({ type: 'success', text: res.data.message || 'Account password updated successfully.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const errorMsg = err?.response?.data?.message;
            if (err?.response?.status === 401 && errorMsg?.toLowerCase().includes('authentication required')) {
                setChangePwMsg({
                    type: 'error',
                    text: 'Your session has expired. Please log out and sign in again to change your password.'
                });
            } else {
                setChangePwMsg({
                    type: 'error',
                    text: errorMsg || 'Failed to update account password. Please verify your current password.'
                });
            }
        } finally {
            setChangePwLoading(false);
        }
    };

    // Add Branch Handler
    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBranchName.trim()) return;
        setBranchSubmitting(true);
        setBranchMsg(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/tenants/branches`, {
                name: newBranchName.trim(),
                location: newBranchLocation.trim() || undefined,
                phone: newBranchPhone.trim() || undefined,
                receiptHeader: newBranchHeader.trim() || undefined,
                receiptFooter: newBranchFooter.trim() || undefined,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(prev => [...prev, res.data]);
            setNewBranchName('');
            setNewBranchLocation('');
            setNewBranchPhone('');
            setNewBranchHeader('');
            setNewBranchFooter('');
            setShowAddBranchModal(false);
            setBranchMsg({ type: 'success', text: 'New branch created successfully.' });
        } catch (err: any) {
            setBranchMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create branch.' });
        } finally {
            setBranchSubmitting(false);
        }
    };

    // Open Edit Branch Modal
    const handleOpenEditBranch = (b: any) => {
        setEditingBranch(b);
        setEditBranchName(b.name || '');
        setEditBranchLocation(b.location || '');
        setEditBranchPhone(b.phone || '');
        setEditBranchHeader(b.branchSettings?.receiptHeader || '');
        setEditBranchFooter(b.branchSettings?.receiptFooter || '');
    };

    // Save Edited Branch
    const handleSaveEditedBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBranch || !editBranchName.trim()) return;
        setBranchSubmitting(true);
        setBranchMsg(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/tenants/branches/${editingBranch.id}`, {
                name: editBranchName.trim(),
                location: editBranchLocation.trim() || null,
                phone: editBranchPhone.trim() || null,
                receiptHeader: editBranchHeader.trim() || null,
                receiptFooter: editBranchFooter.trim() || null,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(prev => prev.map(b => b.id === editingBranch.id ? { ...b, ...res.data } : b));
            setEditingBranch(null);
            setBranchMsg({ type: 'success', text: `Branch configuration updated successfully.` });
        } catch (err: any) {
            setBranchMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update branch.' });
        } finally {
            setBranchSubmitting(false);
        }
    };

    // Soft-Delete / Deactivate Branch Handler
    const handleConfirmDeactivateBranch = async () => {
        if (!deactivatingBranch) return;
        setBranchSubmitting(true);
        setBranchMsg(null);
        setDeactivateAlertMsg(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`${API_URL}/tenants/branches/${deactivatingBranch.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(prev => prev.map(b => b.id === deactivatingBranch.id ? { ...b, isActive: false, status: 'DEACTIVATED' } : b));
            setBranchMsg({ type: 'success', text: res.data.message || `Branch "${deactivatingBranch.name}" deactivated.` });
            setDeactivatingBranch(null);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to deactivate branch.';
            setDeactivateAlertMsg(msg);
        } finally {
            setBranchSubmitting(false);
        }
    };

    // Re-activate Branch Handler
    const handleReactivateBranch = async (b: any) => {
        setBranchSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/tenants/branches/${b.id}`, {
                isActive: true,
                status: 'ACTIVE'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(prev => prev.map(item => item.id === b.id ? { ...item, ...res.data, isActive: true, status: 'ACTIVE' } : item));
            setBranchMsg({ type: 'success', text: `Branch "${b.name}" re-activated successfully.` });
        } catch (err: any) {
            setBranchMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to re-activate branch.' });
        } finally {
            setBranchSubmitting(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Business Profile', icon: Store },
        { id: 'security', label: 'Security & PINs', icon: Shield },
        { id: 'terminal', label: 'POS Terminal', icon: CreditCard },
        { id: 'receipt', label: 'Receipt & Printers', icon: Receipt },
        { id: 'branches', label: 'Branches & Sectors', icon: Building2 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Core Systems Configuration</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-1">Tenant settings, access controls & multi-branch configuration</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto custom-scrollbar gap-2">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`flex items-center gap-2 px-5 py-3 font-black text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${activeTab === t.id
                                ? 'border-[#2D7A3E] text-[#2D7A3E] bg-green-50/50 dark:bg-green-950/30 rounded-t-2xl'
                                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab 1: Business Profile */}
            {activeTab === 'profile' && (
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Business Profile &amp; Credentials</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">Manage store identity, contact info, tax ID &amp; branding</p>
                        </div>
                    </div>

                    {profileSuccessMsg && (
                        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-2xl text-xs font-black flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            <span>{profileSuccessMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Company Logo</label>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-center overflow-hidden">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <Store size={32} className="text-gray-300 dark:text-gray-600" />
                                    )}
                                </div>
                                <div>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md">
                                        <Upload size={14} /> Upload Logo
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    </label>
                                    <p className="text-[10px] text-gray-400 font-bold mt-2">PNG, JPG, SVG up to 2MB</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Store size={12} /> Business Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Mail size={12} /> Business Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={businessEmail}
                                    onChange={(e) => setBusinessEmail(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Phone size={12} /> Support Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={businessPhone}
                                    onChange={(e) => setBusinessPhone(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <FileText size={12} /> Tax Identification Number (TIN / VAT)
                                </label>
                                <input
                                    type="text"
                                    value={taxId}
                                    onChange={(e) => setTaxId(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <MapPin size={12} /> Physical Store Headquarters Address
                                </label>
                                <input
                                    type="text"
                                    value={businessAddress}
                                    onChange={(e) => setBusinessAddress(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="px-8 py-4 bg-[#2D7A3E] hover:bg-[#20502E] text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-green-900/10 active:scale-95 cursor-pointer"
                        >
                            Save Business Credentials
                        </button>
                    </form>
                </div>
            )}

            {/* Tab 2: Security & PINs */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    {/* Universal Access Engine */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-50 dark:bg-green-950/40 rounded-2xl flex items-center justify-center text-[#2D7A3E]">
                                    <KeyRound size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Universal Access Engine</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Super Admin master override password</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${universalStatus ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                {universalStatus ? 'Configured' : 'Not Configured'}
                            </span>
                        </div>

                        <form onSubmit={handleUpdateUniversalPassword} className="space-y-4 max-w-md">
                            {universalStatus && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Universal Password</label>
                                    <input
                                        type="password"
                                        value={currentUniversalPass}
                                        onChange={(e) => setCurrentUniversalPass(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Universal Password (Min 12 chars)</label>
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        required
                                        minLength={12}
                                        value={newUniversalPass}
                                        onChange={(e) => setNewUniversalPass(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E] pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {universalMsg && (
                                <p className={`text-xs font-bold p-3 rounded-xl ${universalMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {universalMsg.text}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={universalLoading || newUniversalPass.length < 12}
                                className="px-6 py-3.5 bg-[#2D7A3E] hover:bg-[#20502E] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md"
                            >
                                {universalLoading ? 'Saving...' : 'Set Universal Password'}
                            </button>
                        </form>
                    </div>

                    {/* Change Account Password */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Change Account Password</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Update your personal account sign-in password</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangeAccountPassword} className="space-y-4 max-w-md">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E] pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                    >
                                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Password (Min 8 characters)</label>
                                <div className="relative">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E] pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPw(!showNewPw)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                    >
                                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {newPassword.length > 0 && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    newPassword.length >= 12
                                                        ? 'w-full bg-green-500'
                                                        : newPassword.length >= 8
                                                        ? 'w-2/3 bg-amber-500'
                                                        : 'w-1/3 bg-red-500'
                                                }`}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-gray-400">
                                            {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Fair' : 'Weak'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPw ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E] pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                    >
                                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {changePwMsg && (
                                <div className={`p-4 rounded-2xl text-xs font-black flex items-center gap-2 ${
                                    changePwMsg.type === 'success'
                                        ? 'bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                        : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                }`}>
                                    {changePwMsg.type === 'success' ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                                    <span>{changePwMsg.text}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={changePwLoading || newPassword.length < 8 || !currentPassword || newPassword !== confirmPassword}
                                className="px-6 py-3.5 bg-[#2D7A3E] hover:bg-[#20502E] disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md cursor-pointer"
                            >
                                {changePwLoading ? 'Updating Password...' : 'Change Password'}
                            </button>
                        </form>
                    </div>

                    {/* Cashier Refund Security Policy */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 dark:bg-red-950/40 rounded-2xl flex items-center justify-center text-red-600">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Cashier Refund Security Policy</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Control cashier refund capabilities</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                            {[
                                { id: 'ENABLED', label: 'Full Access', desc: 'Cashiers can process refunds directly' },
                                { id: 'PIN_REQUIRED', label: 'Manager PIN Required', desc: 'Requires Manager PIN to authorize' },
                                { id: 'RESTRICTED', label: 'Restricted', desc: 'Only Managers/Admins can refund' },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelectRefundPolicy(p.id as any)}
                                    className={`p-5 rounded-2xl border-2 text-left transition-all ${refundPolicy === p.id
                                            ? 'border-[#2D7A3E] bg-green-50/40 dark:bg-green-950/30 shadow-sm'
                                            : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                                        }`}
                                >
                                    <span className="font-black text-sm text-gray-900 dark:text-white block">{p.label}</span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-1 block">{p.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Personal Theme & Interface Preference */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600">
                                <Sun size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Personal Visual Preference</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">User-scoped dark/light interface mode</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 max-w-md">
                            <button
                                onClick={toggleTheme}
                                className="px-6 py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                            >
                                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                                <span>Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
                            </button>
                            <span className="text-xs text-gray-400 font-bold">
                                Current Active: <strong className="text-gray-900 dark:text-white uppercase">{theme}</strong>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 3: POS Terminal */}
            {activeTab === 'terminal' && (
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-4 shadow-sm">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">POS Terminal Options</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Default device settings and hardware pairing</p>
                    <div className="p-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl text-center text-gray-400 font-black text-xs uppercase tracking-widest">
                        Monnify POS &amp; Manual Terminal Hardware Integration Synced
                    </div>
                </div>
            )}

            {/* Tab 4: Receipt & Printers */}
            {activeTab === 'receipt' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Left: Settings Form */}
                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-sm">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Receipt Configuration &amp; Checkout Prompts</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Customize printed invoice header, footer &amp; digital receipt options</p>
                            </div>

                            {receiptSavedMsg && (
                                <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-2xl text-xs font-black flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    <span>{receiptSavedMsg}</span>
                                </div>
                            )}

                            {/* Checkout Prompt Toggle */}
                            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-black text-sm text-gray-900 dark:text-white">Prompt to Email Digital Receipt at Checkout</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">Show receipt dispatch modal after cashier completes a transaction</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleToggleEmailPrompt(!promptEmailReceipt)}
                                    className={`w-14 h-8 rounded-full transition-colors relative p-1 cursor-pointer ${promptEmailReceipt ? 'bg-[#2D7A3E]' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full transition-transform ${promptEmailReceipt ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveReceiptSettings} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt Header Tagline</label>
                                    <input
                                        type="text"
                                        value={receiptHeader}
                                        onChange={(e) => setReceiptHeader(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt Footer Message</label>
                                    <input
                                        type="text"
                                        value={receiptFooter}
                                        onChange={(e) => setReceiptFooter(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="px-6 py-3.5 bg-[#2D7A3E] hover:bg-[#20502E] text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md cursor-pointer"
                                >
                                    Save Receipt Settings
                                </button>
                            </form>
                        </div>

                        {/* Right: Live Thermal Receipt Preview */}
                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm space-y-4">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <Receipt size={18} className="text-[#2D7A3E]" />
                                    Live Receipt Preview
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Updates in real-time as you edit the settings</p>
                            </div>

                            {/* Thermal Receipt Paper Simulation */}
                            <div className="flex justify-center">
                                <div
                                    className="w-full max-w-[280px] bg-white shadow-2xl shadow-gray-900/20 rounded-sm relative"
                                    style={{ fontFamily: "'Courier New', Courier, monospace" }}
                                >
                                    {/* Torn top edge simulation */}
                                    <div className="w-full h-3 bg-gray-100 relative overflow-hidden" style={{
                                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, #e5e7eb 8px, #e5e7eb 10px)',
                                    }} />

                                    <div className="px-5 py-4 space-y-3">
                                        {/* Store Logo / Name */}
                                        <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-3">
                                            {logoUrl ? (
                                                <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto rounded" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                                                    <Store size={20} className="text-gray-400" />
                                                </div>
                                            )}
                                            <p className="text-sm font-black text-gray-900 uppercase tracking-wide leading-tight">{businessName || 'Your Store Name'}</p>
                                            <p className="text-[9px] text-gray-500 leading-tight">{receiptHeader || 'Header tagline goes here'}</p>
                                            <p className="text-[9px] text-gray-400 leading-tight">{businessAddress || '123 Store Address, City'}</p>
                                            <p className="text-[9px] text-gray-400 leading-tight">{businessPhone || '+000 000 0000'}</p>
                                        </div>

                                        {/* Receipt Meta */}
                                        <div className="text-[9px] text-gray-500 space-y-0.5">
                                            <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString()}</span></div>
                                            <div className="flex justify-between"><span>Time:</span><span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                                            <div className="flex justify-between"><span>Receipt #:</span><span>ORD-00001</span></div>
                                            <div className="flex justify-between"><span>Cashier:</span><span>Staff Name</span></div>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-t border-dashed border-gray-300" />

                                        {/* Sample Items */}
                                        <div className="text-[9px] space-y-1">
                                            <div className="flex justify-between font-black text-gray-700 border-b border-gray-200 pb-1 text-[8px] uppercase">
                                                <span>Item</span><span>Qty</span><span>Price</span>
                                            </div>
                                            {[
                                                { name: 'Sample Product A', qty: 2, price: 1500 },
                                                { name: 'Sample Product B', qty: 1, price: 3200 },
                                                { name: 'Sample Product C', qty: 3, price: 800 },
                                            ].map((item, i) => (
                                                <div key={i} className="flex justify-between text-gray-600">
                                                    <span className="truncate max-w-[110px]">{item.name}</span>
                                                    <span>{item.qty}x</span>
                                                    <span>₦{(item.price * item.qty).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Divider */}
                                        <div className="border-t border-dashed border-gray-300" />

                                        {/* Totals */}
                                        <div className="text-[9px] space-y-0.5">
                                            <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>₦9,800</span></div>
                                            <div className="flex justify-between text-gray-600"><span>Tax (0%):</span><span>₦0</span></div>
                                            <div className="flex justify-between font-black text-gray-900 text-[11px] pt-1 border-t border-dashed border-gray-300">
                                                <span>TOTAL:</span><span>₦9,800</span>
                                            </div>
                                            <div className="flex justify-between text-gray-600 mt-0.5"><span>Payment:</span><span>CASH</span></div>
                                            <div className="flex justify-between text-green-700 font-black"><span>Status:</span><span>PAID ✓</span></div>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-t border-dashed border-gray-300" />

                                        {/* Footer */}
                                        <div className="text-center space-y-2 pt-1">
                                            {/* QR Code Placeholder */}
                                            <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded mx-auto flex items-center justify-center">
                                                <div className="grid grid-cols-3 gap-0.5">
                                                    {Array.from({ length: 9 }).map((_, i) => (
                                                        <div key={i} className={`w-2 h-2 rounded-[1px] ${Math.random() > 0.4 ? 'bg-gray-800' : 'bg-transparent'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-[8px] text-gray-400 italic leading-tight">{receiptFooter || 'Your footer message goes here'}</p>
                                            <p className="text-[7px] text-gray-300 uppercase tracking-widest">Powered by DeMegaPOS</p>
                                        </div>
                                    </div>

                                    {/* Torn bottom edge */}
                                    <div className="w-full h-3 bg-gray-100" style={{
                                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, #e5e7eb 8px, #e5e7eb 10px)',
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Tab 5: Branches & Sectors */}
            {activeTab === 'branches' && (
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Branches &amp; Sectors</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Manage physical stores and operational branch configurations</p>
                        </div>
                        <button
                            onClick={() => setShowAddBranchModal(true)}
                            className="px-5 py-3 bg-[#2D7A3E] hover:bg-[#20502E] text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                            <Plus size={16} /> Add New Branch
                        </button>
                    </div>

                    {branchMsg && (
                        <p className={`text-xs font-bold p-4 rounded-2xl ${branchMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'}`}>
                            {branchMsg.text}
                        </p>
                    )}

                    {branchesLoading ? (
                        <div className="space-y-3 animate-pulse">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                            ))}
                        </div>
                    ) : branches.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                            No branches configured yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {branches.map((b: any) => {
                                const isBranchActive = b.status !== 'DEACTIVATED' && b.isActive !== false;
                                return (
                                    <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-2xl gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl flex items-center justify-center font-bold text-gray-500 dark:text-gray-300 shadow-sm flex-shrink-0">
                                                <Building2 size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-black text-gray-900 dark:text-white text-sm">{b.name}</p>
                                                    <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md text-[10px] font-black uppercase tracking-wider">
                                                        CODE: {b.branchCode || 'BR-001'}
                                                    </span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isBranchActive ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                                                        {isBranchActive ? 'ACTIVE' : 'DEACTIVATED'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 mt-1">
                                                    {b.location || 'Omni-Location Store'} {b.phone ? `• Tel: ${b.phone}` : ''} {b._count?.users ? `• ${b._count.users} Staff` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <button
                                                onClick={() => handleOpenEditBranch(b)}
                                                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                                            >
                                                Edit Branch
                                            </button>
                                            {isBranchActive ? (
                                                <button
                                                    onClick={() => { setDeactivatingBranch(b); setDeactivateAlertMsg(null); }}
                                                    className="px-4 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                                >
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleReactivateBranch(b)}
                                                    className="px-4 py-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 hover:bg-green-100 text-green-700 dark:text-green-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                                >
                                                    Re-Activate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Create New Branch Modal */}
            {showAddBranchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-800">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Create New Branch</h2>
                        <form onSubmit={handleAddBranch} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Ikeja Superstore"
                                    value={newBranchName}
                                    onChange={(e) => setNewBranchName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Physical Address / Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
                                    value={newBranchLocation}
                                    onChange={(e) => setNewBranchLocation(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. +234 801 234 5678"
                                    value={newBranchPhone}
                                    onChange={(e) => setNewBranchPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch Receipt Header Tagline</label>
                                <input
                                    type="text"
                                    placeholder="e.g. DeMega POS - Ikeja Retail Hub"
                                    value={newBranchHeader}
                                    onChange={(e) => setNewBranchHeader(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch Receipt Footer Message</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Thank you for shopping with Ikeja Branch!"
                                    value={newBranchFooter}
                                    onChange={(e) => setNewBranchFooter(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddBranchModal(false)}
                                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 font-black rounded-2xl text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={branchSubmitting || !newBranchName.trim()}
                                    className="flex-1 py-3 bg-[#2D7A3E] hover:bg-[#20502E] text-white font-black rounded-2xl text-xs uppercase shadow-md disabled:bg-gray-200"
                                >
                                    {branchSubmitting ? 'Creating...' : 'Create Branch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Branch Modal (Super Admin Only) */}
            {editingBranch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Edit Branch Configuration</h2>
                            <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md text-[10px] font-black uppercase">
                                CODE: {editingBranch.branchCode || 'IMMUTABLE'}
                            </span>
                        </div>
                        <form onSubmit={handleSaveEditedBranch} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Public Branch Code (Immutable)</label>
                                <input
                                    type="text"
                                    disabled
                                    value={editingBranch.branchCode || 'BR-001'}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl text-sm font-bold cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editBranchName}
                                    onChange={(e) => setEditBranchName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Physical Address / Location</label>
                                <input
                                    type="text"
                                    value={editBranchLocation}
                                    onChange={(e) => setEditBranchLocation(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Contact</label>
                                <input
                                    type="text"
                                    value={editBranchPhone}
                                    onChange={(e) => setEditBranchPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt Header</label>
                                <input
                                    type="text"
                                    value={editBranchHeader}
                                    onChange={(e) => setEditBranchHeader(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt Footer</label>
                                <input
                                    type="text"
                                    value={editBranchFooter}
                                    onChange={(e) => setEditBranchFooter(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingBranch(null)}
                                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 font-black rounded-2xl text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={branchSubmitting || !editBranchName.trim()}
                                    className="flex-1 py-3 bg-[#2D7A3E] hover:bg-[#20502E] text-white font-black rounded-2xl text-xs uppercase shadow-md disabled:bg-gray-200"
                                >
                                    {branchSubmitting ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Soft-Delete Deactivation Modal */}
            {deactivatingBranch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8 space-y-6 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <div className="w-10 h-10 bg-red-50 dark:bg-red-950/40 rounded-xl flex items-center justify-center font-bold">
                                <Lock size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-tight">Deactivate Branch</h2>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-bold leading-relaxed">
                            Are you sure you want to deactivate <span className="text-gray-900 dark:text-white font-black">"{deactivatingBranch.name}" ({deactivatingBranch.branchCode || 'HQ'})</span>?
                            This soft-deletion preserves historical sales, shift logs, and receipt audit trails, but prevents active POS terminal login.
                        </p>

                        {deactivateAlertMsg && (
                            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-xs font-bold leading-relaxed animate-in fade-in">
                                ⚠️ {deactivateAlertMsg}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeactivatingBranch(null)}
                                className="flex-1 py-3.5 border border-gray-200 dark:border-gray-700 font-black rounded-2xl text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 uppercase"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeactivateBranch}
                                disabled={branchSubmitting}
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-xs uppercase shadow-md disabled:bg-gray-300 transition-all"
                            >
                                {branchSubmitting ? 'Deactivating...' : 'Confirm Deactivation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;

