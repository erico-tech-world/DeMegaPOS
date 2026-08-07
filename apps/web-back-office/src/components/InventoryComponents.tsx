import { useState, useEffect } from 'react';
import { Search, Plus, Filter, X, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../lib/apiConfig';


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
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Inventory Engine</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage products, stock levels, and ordering</p>
                </div>
                <button
                    onClick={onAddItem}
                    className="bg-[#2D7A3E] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#20502E] active:scale-95 transition-all shadow-xl shadow-green-900/10 font-black uppercase tracking-wide cursor-pointer"
                >
                    <Plus size={18} strokeWidth={3} />
                    <span>Add New Item</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/30 dark:bg-slate-800/40">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, SKU..."
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 dark:text-white dark:placeholder-slate-400 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-sm transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-6 py-3 border rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-sm cursor-pointer ${showFilters ? 'bg-gray-900 dark:bg-slate-700 text-white border-gray-900 dark:border-slate-700' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:border-[#2D7A3E] hover:text-[#2D7A3E]'}`}
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
                        <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                            <tr className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-4 font-black">Item Details</th>
                                <th className="px-6 py-4 font-black">Prices (Retail/VIP)</th>
                                <th className="px-6 py-4 font-black">Status</th>
                                <th className="px-6 py-4 font-black">In Stock</th>
                                <th className="px-6 py-4 font-black text-right">Operation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
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
    const [imageUploadMode, setImageUploadMode] = useState<'url' | 'file'>('url');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image file is too large (max 5MB)');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setImagePreview(base64String);
            setFormData((prev: any) => ({ ...prev, imageUrl: base64String }));
        };
        reader.readAsDataURL(file);
    };

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
            setImageUploadMode('url');
            setImagePreview(null);
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

                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Image</label>
                            <div className="flex gap-2 bg-gray-100 p-0.5 rounded-lg text-[9px] font-black uppercase">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageUploadMode('url');
                                        setFormData((prev: any) => ({ ...prev, imageUrl: '' }));
                                        setImagePreview(null);
                                    }}
                                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${imageUploadMode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Image URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageUploadMode('file');
                                        setFormData((prev: any) => ({ ...prev, imageUrl: '' }));
                                        setImagePreview(null);
                                    }}
                                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${imageUploadMode === 'file' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Upload File
                                </button>
                            </div>
                        </div>

                        {imageUploadMode === 'url' ? (
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                                placeholder="https://images.unsplash.com/photo-xxx"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            />
                        ) : (
                            <div className="space-y-4">
                                <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#2D7A3E] transition-colors cursor-pointer group bg-gray-50/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-600 group-hover:text-[#2D7A3E] transition-colors">
                                            {imagePreview ? 'Change Image' : 'Select Image File'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">PNG, JPG or WEBP (Max 5MB)</p>
                                    </div>
                                </div>
                                {imagePreview && (
                                    <div className="flex items-center gap-4 bg-green-50/30 border border-green-100 p-4 rounded-2xl animate-in slide-in-from-top-2">
                                        <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-green-200 shadow-sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-gray-700">Image Loaded Successfully</p>
                                            <p className="text-[10px] font-bold text-[#2D7A3E] truncate">Ready to deploy</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImagePreview(null);
                                                setFormData((prev: any) => ({ ...prev, imageUrl: '' }));
                                            }}
                                            className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
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
    const [imageUploadMode, setImageUploadMode] = useState<'url' | 'file'>('url');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image file is too large (max 5MB)');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setImagePreview(base64String);
            setFormData((prev: any) => ({ ...prev, imageUrl: base64String }));
        };
        reader.readAsDataURL(file);
    };

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
            const isBase64 = product.imageUrl && product.imageUrl.startsWith('data:image/');
            setImageUploadMode(isBase64 ? 'file' : 'url');
            setImagePreview(isBase64 ? product.imageUrl : null);
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
            setImageUploadMode('url');
            setImagePreview(null);
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

                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Image</label>
                            <div className="flex gap-2 bg-gray-100 p-0.5 rounded-lg text-[9px] font-black uppercase">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageUploadMode('url');
                                        setFormData((prev: any) => ({ ...prev, imageUrl: '' }));
                                        setImagePreview(null);
                                    }}
                                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${imageUploadMode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Image URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageUploadMode('file');
                                        setFormData((prev: any) => ({ ...prev, imageUrl: '' }));
                                        setImagePreview(null);
                                    }}
                                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${imageUploadMode === 'file' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Upload File
                                </button>
                            </div>
                        </div>

                        {imageUploadMode === 'url' ? (
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold transition-all"
                                placeholder="https://images.unsplash.com/photo-xxx"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            />
                        ) : (
                            <div className="space-y-4">
                                <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#2D7A3E] transition-colors cursor-pointer group bg-gray-50/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-600 group-hover:text-[#2D7A3E] transition-colors">
                                            {imagePreview ? 'Change Image' : 'Select Image File'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">PNG, JPG or WEBP (Max 5MB)</p>
                                    </div>
                                </div>
                                {imagePreview && (
                                    <div className="flex items-center gap-4 bg-green-50/30 border border-green-100 p-4 rounded-2xl animate-in slide-in-from-top-2">
                                        <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-green-200 shadow-sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-gray-700">Image Loaded Successfully</p>
                                            <p className="text-[10px] font-bold text-[#2D7A3E] truncate">Ready to deploy</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImagePreview(null);
                                                setFormData((prev: any) => ({ ...prev, imageUrl: '' }));
                                            }}
                                            className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
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
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm relative z-[111] overflow-hidden animate-in zoom-in-95 p-6 space-y-4 border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Security Check</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
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

// ─── Inline Add Category Sub-Modal ───────────────────────────────────────────
export const InlineAddCategoryModal = ({ isOpen, onClose, onSuccess }: any) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/inventory/categories`, { name, description }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess(res.data);
            setName('');
            setDescription('');
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to create category.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md relative z-[121] overflow-hidden p-8 space-y-5 border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Add New Category</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Beverages, Electronics, Dairy"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                        <textarea
                            placeholder="Brief description of items under this category..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E] resize-none"
                            rows={3}
                        />
                    </div>
                    {error && <div className="text-xs font-bold text-red-500">{error}</div>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-xs text-gray-600 dark:text-gray-300 uppercase">Cancel</button>
                        <button type="submit" disabled={isSubmitting || !name.trim()} className="flex-1 py-3.5 bg-[#2D7A3E] text-white rounded-2xl font-black text-xs uppercase shadow-md hover:bg-[#20502E] disabled:opacity-50">
                            {isSubmitting ? 'Creating...' : 'Save Category'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Categories & Tags Management Component ──────────────────────────────────
export const CategoriesView = ({ products, refreshProducts }: any) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInlineAddOpen, setIsInlineAddOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [transferCategory, setTransferCategory] = useState<any>(null);
    const [deletingCategory, setDeletingCategory] = useState<any>(null);
    const [targetCategoryId, setTargetCategoryId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertMsg, setAlertMsg] = useState<string | null>(null);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/inventory/categories`, { headers });
            setCategories(res.data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const handleEditCategory = async (e: any) => {
        e.preventDefault();
        if (!editingCategory?.name?.trim()) return;
        setIsSubmitting(true);
        try {
            await axios.put(`${API_URL}/inventory/categories/${editingCategory.id}`, {
                name: editingCategory.name,
                description: editingCategory.description
            }, { headers });
            setEditingCategory(null);
            fetchCategories();
            refreshProducts?.();
        } catch {
            setAlertMsg('Failed to update category.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTransfer = async (e: any) => {
        e.preventDefault();
        if (!targetCategoryId || !transferCategory) return;
        setIsSubmitting(true);
        try {
            const itemsToTransfer = products.filter((p: any) => p.categoryId === transferCategory.id).map((p: any) => p.id);
            if (itemsToTransfer.length > 0) {
                await axios.patch(`${API_URL}/inventory/categories/transfer`, {
                    productIds: itemsToTransfer,
                    targetCategoryId
                }, { headers });
            }
            setTransferCategory(null);
            fetchCategories();
            refreshProducts?.();
            setAlertMsg(`Successfully transferred items to new category.`);
        } catch {
            setAlertMsg('Failed to transfer category products.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (e: any) => {
        e.preventDefault();
        if (!deletingCategory) return;
        setIsSubmitting(true);
        try {
            await axios.delete(`${API_URL}/inventory/categories/${deletingCategory.id}`, {
                params: { reassignToCategoryId: targetCategoryId || undefined },
                headers
            });
            setDeletingCategory(null);
            fetchCategories();
            refreshProducts?.();
            setAlertMsg('Category deleted successfully.');
        } catch {
            setAlertMsg('Failed to delete category.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Categories &amp; Item Classifications</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">Manage standalone categories, item mappings &amp; batch category transfers</p>
                </div>
                <button
                    onClick={() => setIsInlineAddOpen(true)}
                    className="px-6 py-3.5 bg-[#2D7A3E] hover:bg-[#20502E] text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 transition-all cursor-pointer"
                >
                    <Plus size={16} /> Create New Category
                </button>
            </div>

            {alertMsg && (
                <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-2xl text-xs font-black flex items-center justify-between">
                    <span>{alertMsg}</span>
                    <button onClick={() => setAlertMsg(null)} className="text-green-600 dark:text-green-300 font-black"><X size={16} /></button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">Active Tenant Categories ({categories.length})</h3>
                </div>
                {isLoading ? (
                    <div className="p-12 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">Loading categories...</div>
                ) : categories.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">No categories created yet. Click "Create New Category" to start.</div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {categories.map((c: any) => (
                            <div key={c.id} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="space-y-1">
                                    <div className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                        <span>{c.name}</span>
                                        <span className="text-[9px] font-black bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full uppercase">
                                            {c.productCount || 0} Products
                                        </span>
                                    </div>
                                    {c.description && <p className="text-xs text-gray-400 font-medium">{c.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingCategory(c)}
                                        className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl font-black text-xs uppercase transition-all"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { setTransferCategory(c); setTargetCategoryId(''); }}
                                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-400 rounded-xl font-black text-xs uppercase transition-all"
                                    >
                                        Transfer Items
                                    </button>
                                    <button
                                        onClick={() => { setDeletingCategory(c); setTargetCategoryId(''); }}
                                        className="px-3 py-1.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-xl font-black text-xs uppercase transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <InlineAddCategoryModal
                isOpen={isInlineAddOpen}
                onClose={() => setIsInlineAddOpen(false)}
                onSuccess={() => { fetchCategories(); refreshProducts?.(); }}
            />

            {/* Edit Category Modal */}
            {editingCategory && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingCategory(null)} />
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md relative z-[121] p-8 space-y-5 border border-gray-100 dark:border-gray-800">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase">Edit Category</h3>
                        <form onSubmit={handleEditCategory} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingCategory.name}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                                <textarea
                                    value={editingCategory.description || ''}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E] resize-none"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-black uppercase text-gray-600 dark:text-gray-300">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#2D7A3E] text-white rounded-2xl text-xs font-black uppercase shadow-md hover:bg-[#20502E]">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Items Modal */}
            {transferCategory && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setTransferCategory(null)} />
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md relative z-[121] p-8 space-y-5 border border-gray-100 dark:border-gray-800">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase">Transfer Products from "{transferCategory.name}"</h3>
                        <p className="text-xs text-gray-500 font-bold">Select target category to batch re-assign all {transferCategory.productCount || 0} products currently in this category.</p>
                        <form onSubmit={handleTransfer} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Category</label>
                                <select
                                    required
                                    value={targetCategoryId}
                                    onChange={(e) => setTargetCategoryId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                >
                                    <option value="">-- Select Target Category --</option>
                                    {categories.filter((c: any) => c.id !== transferCategory.id).map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setTransferCategory(null)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-black uppercase text-gray-600 dark:text-gray-300">Cancel</button>
                                <button type="submit" disabled={isSubmitting || !targetCategoryId} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-md hover:bg-blue-700 disabled:opacity-50">Transfer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Safe Delete Modal */}
            {deletingCategory && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingCategory(null)} />
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md relative z-[121] p-8 space-y-5 border border-gray-100 dark:border-gray-800">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase">Delete Category "{deletingCategory.name}"</h3>
                        {deletingCategory.productCount > 0 ? (
                            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl space-y-2">
                                <p className="text-xs font-black text-amber-800 dark:text-amber-400">⚠️ Action Required: Reassign {deletingCategory.productCount} Products</p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-400/80 font-bold">This category contains active products. Please select a fallback category to reassign these products before completing deletion.</p>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 font-bold">Are you sure you want to delete this category? This action cannot be undone.</p>
                        )}
                        <form onSubmit={handleDelete} className="space-y-4">
                            {deletingCategory.productCount > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reassign Products To</label>
                                    <select
                                        value={targetCategoryId}
                                        onChange={(e) => setTargetCategoryId(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl text-sm font-bold outline-none focus:border-[#2D7A3E]"
                                    >
                                        <option value="">System Default: Uncategorized</option>
                                        {categories.filter((c: any) => c.id !== deletingCategory.id).map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setDeletingCategory(null)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-black uppercase text-gray-600 dark:text-gray-300">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-xs font-black uppercase shadow-md hover:bg-red-700">Delete Category</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
