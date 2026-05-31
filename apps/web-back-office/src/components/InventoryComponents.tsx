import { useState, useEffect } from 'react';
import { Search, Plus, Filter, X, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const InventoryView = ({ items, isLoading, searchQuery, setSearchQuery, onAddItem, onAdjustStock, onEdit, onDelete, highlightId }: any) => {
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedType, setSelectedType] = useState('ALL');
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API_URL}/inventory/categories`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCategories(res.data);
            } catch (err) {
                console.error('Error fetching categories in filters:', err);
            }
        };
        fetchCategories();
    }, []);

    const filteredItems = (Array.isArray(items) ? items : []).filter((item: any) => {
        const matchesSearch = (item?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item?.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
        
        const matchesStatus = selectedStatus === 'ALL' ||
            (selectedStatus === 'SCARCITY' && item.stock < 10) ||
            (selectedStatus === 'OPERATIONAL' && item.stock >= 10);
            
        const matchesType = selectedType === 'ALL' || item.type === selectedType;
        
        return matchesSearch && matchesCategory && matchesStatus && matchesType;
    });

    const scrollRef = (el: HTMLTableRowElement | null, id: string) => {
        if (el && id === highlightId) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">Inventory Engine</h1>
                    <p className="text-gray-500 text-sm">Manage products, stock levels, and ordering</p>
                </div>
                <button
                    onClick={onAddItem}
                    className="bg-[#2D7A3E] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#20502E] active:scale-95 transition-all shadow-xl shadow-green-900/10 font-black uppercase tracking-wide cursor-pointer"
                >
                    <Plus size={18} strokeWidth={3} />
                    <span>Add New Item</span>
                </button>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/30">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, SKU..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-sm transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-6 py-3 border rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-sm cursor-pointer ${showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-100 hover:border-[#2D7A3E] hover:text-[#2D7A3E]'}`}
                    >
                        <Filter size={18} />
                        <span>Advanced Filters</span>
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showFilters && (
                    <div className="p-6 bg-gray-50/50 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-200">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filter by Category</label>
                            <select
                                className="w-full p-3 bg-white border border-gray-100 rounded-2xl font-bold text-sm text-gray-700 outline-none focus:ring-4 focus:ring-green-900/5 transition-all"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filter by Status</label>
                            <select
                                className="w-full p-3 bg-white border border-gray-100 rounded-2xl font-bold text-sm text-gray-700 outline-none focus:ring-4 focus:ring-green-900/5 transition-all"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="OPERATIONAL">Operational (In Stock)</option>
                                <option value="SCARCITY">Scarcity (Low Stock)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filter by Product Type</label>
                            <select
                                className="w-full p-3 bg-white border border-gray-100 rounded-2xl font-bold text-sm text-gray-700 outline-none focus:ring-4 focus:ring-green-900/5 transition-all"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="ALL">All Types</option>
                                <option value="STANDARD">Standard</option>
                                <option value="VARIANT">Multi-Variant</option>
                                <option value="BUNDLED">Bundle Package</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-100">
                                <th className="px-6 py-4 font-black">Item Details</th>
                                <th className="px-6 py-4 font-black">Prices (Retail/VIP)</th>
                                <th className="px-6 py-4 font-black">Status</th>
                                <th className="px-6 py-4 font-black">In Stock</th>
                                <th className="px-6 py-4 font-black text-right">Operation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold animate-pulse">Synchronizing inventory system...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold italic">No items identified in this sector.</td></tr>
                            ) : filteredItems.map((item: any) => (
                                <tr 
                                    key={item.id} 
                                    ref={(el) => scrollRef(el, item.id)}
                                    className={`transition-colors ${
                                        item.id === highlightId 
                                        ? 'bg-green-50 ring-2 ring-inset ring-[#2D7A3E]/30 animate-pulse-subtle' 
                                        : 'hover:bg-gray-50/30'
                                    }`}
                                >
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-4">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-2xl object-cover border border-gray-100 shadow-sm flex-shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#2D7A3E] font-black text-xs uppercase flex-shrink-0">
                                                    {item.name.slice(0, 2)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="font-black text-gray-900 text-sm leading-tight truncate">{item.name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{item.sku || 'N/A'} • {item.unit || 'PCS'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <div className="font-black text-[#2D7A3E]">₦{Number(item.price).toLocaleString()}</div>
                                            {item.vipPrice && (
                                                <div className="text-[10px] font-bold text-amber-600">VIP: ₦{Number(item.vipPrice).toLocaleString()}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border inline-flex items-center gap-1.5 ${item.stock < 10 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.stock < 10 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                            {item.stock < 10 ? 'Scarcity' : 'Operational'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="text-sm font-black text-gray-900">{item.stock} {item.unit || 'Units'}</div>
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => onAdjustStock(item)}
                                                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 active:scale-95 cursor-pointer"
                                            >
                                                Update Stock
                                            </button>
                                            <button onClick={() => onEdit(item)} className="text-blue-500 hover:text-blue-700 transition-colors p-1 ml-2 cursor-pointer" title="Edit"><Edit size={18} /></button>
                                            <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700 transition-colors p-1 cursor-pointer" title="Delete"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const AddItemModal = ({ isOpen, onClose, onSuccess }: any) => {
    const [formData, setFormData] = useState<any>({
        name: '',
        sku: '',
        imageUrl: '',
        type: 'STANDARD',
        stock: 0,
        price: 0,
        costPrice: '',
        vipPrice: '',
        expiryDate: '',
        unit: 'pcs',
        categoryId: '',
        variantsInput: '',
    });
    const [categories, setCategories] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const token = localStorage.getItem('token');
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API_URL}/inventory/categories`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCategories(res.data);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Not authenticated. Please log in again.');
            setIsSubmitting(false);
            return;
        }

        try {
            const payload: any = {
                ...formData,
                stock: Number(formData.stock),
                price: Number(formData.price),
                costPrice: formData.costPrice === '' || formData.costPrice === null || formData.costPrice === undefined ? null : Number(formData.costPrice),
                vipPrice: formData.vipPrice === '' || formData.vipPrice === null || formData.vipPrice === undefined ? null : Number(formData.vipPrice),
                imageUrl: formData.imageUrl || null,
                expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
                categoryId: formData.categoryId || undefined,
            };
            delete payload.variantsInput;

            if (formData.type === 'VARIANT' && formData.variantsInput) {
                payload.variants = formData.variantsInput.split(',').map((v: string) => ({
                    name: v.trim(),
                    price: Number(formData.price),
                    vipPrice: Number(formData.vipPrice),
                    unit: formData.unit,
                    stock: 0
                }));
            }

            await axios.post(`${API_URL}/inventory/products`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await onSuccess();
            onClose();
            setFormData({ name: '', sku: '', imageUrl: '', type: 'STANDARD', stock: 0, price: 0, costPrice: '', vipPrice: '', expiryDate: '', unit: 'pcs', categoryId: '', variantsInput: '' });
        } catch (err: any) {
            console.error('Error adding item:', err);
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to create product.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative z-[101] overflow-hidden animate-in zoom-in-95">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Initialize Product</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Descriptor</label>
                            <input
                                required
                                type="text"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                                placeholder="e.g. Premium Blend Coffee"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Sector</label>
                            <select
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all appearance-none"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Image URL (Optional)</label>
                        <input
                            type="text"
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                            placeholder="https://images.unsplash.com/photo-xxx"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU ID</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                                placeholder="PROD-XXX"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Standard Unit</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                                placeholder="e.g. pcs, kg, carton"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Market Strategy</label>
                            <select
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all appearance-none"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="STANDARD">Standard Unit</option>
                                <option value="VARIANT">Multi-Variant</option>
                                <option value="BUNDLED">Bundle Package</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lifespan Endpoint</label>
                            <input type="date" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cost (₦)</label>
                            <input type="number" className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-black text-sm" value={formData.costPrice ?? ''} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#2D7A3E] uppercase tracking-widest ml-1">Retail (₦)</label>
                            <input required type="number" className="w-full px-4 py-4 bg-green-50/30 border border-green-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-black text-sm" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">VIP (₦)</label>
                            <input type="number" className="w-full px-4 py-4 bg-amber-50/30 border border-amber-100 rounded-2xl focus:border-amber-400 outline-none font-black text-sm" value={formData.vipPrice ?? ''} onChange={(e) => setFormData({ ...formData, vipPrice: e.target.value })} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Reserve</label>
                        <input required type="number" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-center" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} />
                    </div>

                    {formData.type === 'VARIANT' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-[#2D7A3E] uppercase tracking-widest ml-1">Variants (Comma Separated)</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-green-50/30 border border-green-100 rounded-2xl outline-none font-bold"
                                placeholder="Red, Green, Blue or Small, Medium, Large"
                                value={formData.variantsInput}
                                onChange={(e) => setFormData({ ...formData, variantsInput: e.target.value })}
                            />
                        </div>
                    )}
                    {error && (
                        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
                            ⚠️ {error}
                        </div>
                    )}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#2D7A3E] text-white py-5 rounded-2xl font-black uppercase tracking-wide shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? 'Initializing...' : 'Deploy Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const EditItemModal = ({ isOpen, onClose, product, onSuccess }: any) => {
    const [formData, setFormData] = useState<any>({
        name: '',
        sku: '',
        imageUrl: '',
        type: 'STANDARD',
        stock: 0,
        price: 0,
        costPrice: '',
        vipPrice: '',
        expiryDate: '',
        unit: 'pcs',
        categoryId: '',
        variantsInput: '',
    });
    const [categories, setCategories] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const token = localStorage.getItem('token');
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API_URL}/inventory/categories`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCategories(res.data);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, [isOpen]);

    useEffect(() => {
        if (product && isOpen) {
            setFormData({
                name: product.name || '',
                sku: product.sku || '',
                imageUrl: product.imageUrl || '',
                type: product.type || 'STANDARD',
                stock: product.stock || 0,
                price: Number(product.price) || 0,
                costPrice: product.costPrice !== null && product.costPrice !== undefined ? Number(product.costPrice) : '',
                vipPrice: product.vipPrice !== null && product.vipPrice !== undefined ? Number(product.vipPrice) : '',
                expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
                unit: product.unit || 'pcs',
                categoryId: product.categoryId || '',
                variantsInput: '',
            });
        }
    }, [product, isOpen]);

    if (!isOpen || !product) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Not authenticated. Please log in again.');
            setIsSubmitting(false);
            return;
        }

        try {
            const payload: any = {
                ...formData,
                stock: Number(formData.stock),
                price: Number(formData.price),
                costPrice: formData.costPrice === '' || formData.costPrice === null || formData.costPrice === undefined ? null : Number(formData.costPrice),
                vipPrice: formData.vipPrice === '' || formData.vipPrice === null || formData.vipPrice === undefined ? null : Number(formData.vipPrice),
                imageUrl: formData.imageUrl || null,
                expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
                categoryId: formData.categoryId || null, // Clear category or set appropriately
            };
            delete payload.variantsInput;

            await axios.put(`${API_URL}/inventory/products/${product.id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating item:', err);
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to update product.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative z-[101] overflow-hidden animate-in zoom-in-95">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Edit Product</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Descriptor</label>
                            <input
                                required
                                type="text"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                                placeholder="e.g. Premium Blend Coffee"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Sector</label>
                            <select
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all appearance-none"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Image URL (Optional)</label>
                        <input
                            type="text"
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                            placeholder="https://images.unsplash.com/photo-xxx"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU ID</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                                placeholder="PROD-XXX"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Standard Unit</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                                placeholder="e.g. pcs, kg, carton"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cost (₦)</label>
                            <input type="number" className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-black text-sm" value={formData.costPrice ?? ''} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#2D7A3E] uppercase tracking-widest ml-1">Retail (₦)</label>
                            <input required type="number" className="w-full px-4 py-4 bg-green-50/30 border border-green-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-black text-sm" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">VIP (₦)</label>
                            <input type="number" className="w-full px-4 py-4 bg-amber-50/30 border border-amber-100 rounded-2xl focus:border-amber-400 outline-none font-black text-sm" value={formData.vipPrice ?? ''} onChange={(e) => setFormData({ ...formData, vipPrice: e.target.value })} />
                        </div>
                    </div>
                    {error && (
                        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
                            ⚠️ {error}
                        </div>
                    )}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#2D7A3E] text-white py-5 rounded-2xl font-black uppercase tracking-wide shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? 'Updating...' : 'Update Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const StockAdjustmentModal = ({ isOpen, onClose, product, onSuccess }: any) => {
    const [formData, setFormData] = useState({
        type: 'ADJUST',
        quantity: 0,
        reason: '',
        variantId: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !product) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_URL}/inventory/stock-adjustments`, {
                productId: product.id,
                variantId: formData.variantId || undefined,
                type: formData.type,
                quantity: Number(formData.quantity),
                reason: formData.reason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error adjusting stock:', err);
            setError(err?.response?.data?.message || err?.message || 'Stock adjustment failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Update Stock</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#2D7A3E]/60 mb-1">Product</p>
                        <p className="font-black text-gray-900">{product.name} <span className="text-[#2D7A3E]">({product.sku || 'N/A'})</span></p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Action</label>
                            <select
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-xs appearance-none"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="IN">Add Stock (+)</option>
                                <option value="OUT">Remove Stock (-)</option>
                                <option value="ADJUST">Set Exact Stock (=)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                            <input
                                required
                                type="number"
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-center"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason (Optional)</label>
                        <textarea
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none min-h-[100px] font-bold text-sm"
                            placeholder="e.g. Reconciliation after audit"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>

                    {error && (
                        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#2D7A3E] text-white py-5 rounded-2xl font-black uppercase tracking-wide shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {isSubmitting ? 'Updating...' : 'Update Stock'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Reusable Custom Alert Modal ---
export const CustomAlertModal = ({ title = "Notification Alert", message, onClose }: any) => {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-[111] overflow-hidden animate-in zoom-in-95 p-6 space-y-4">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">{title}</h3>
                <p className="text-sm text-gray-500 font-bold leading-relaxed">{message}</p>
                <button
                    onClick={onClose}
                    className="w-full bg-[#2D7A3E] text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all"
                >
                    Acknowledge
                </button>
            </div>
        </div>
    );
};

// --- Reusable Custom Confirm Modal ---
export const CustomConfirmModal = ({ message, onConfirm, onClose }: any) => {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-[111] overflow-hidden animate-in zoom-in-95 p-6 space-y-4">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Security Check</h3>
                <p className="text-sm text-gray-500 font-bold leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-gray-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 bg-[#2D7A3E] text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all shadow-lg shadow-green-900/10"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};
