import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, X } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const InventoryView = ({ items, isLoading, searchQuery, setSearchQuery, onAddItem, onAdjustStock }: any) => {
    const filteredItems = items.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">Inventory Engine</h1>
                    <p className="text-gray-500 text-sm">Manage products, stock levels, and ordering</p>
                </div>
                <button
                    onClick={onAddItem}
                    className="bg-[#2D7A3E] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#20502E] active:scale-95 transition-all shadow-xl shadow-green-900/10 font-black uppercase tracking-wide"
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
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl hover:border-[#2D7A3E] hover:text-[#2D7A3E] transition-all font-black text-xs text-gray-500 uppercase tracking-widest shadow-sm">
                        <Filter size={18} />
                        <span>Advanced Filters</span>
                    </button>
                </div>

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
                                <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-6 py-6">
                                        <div className="font-black text-gray-900 text-sm leading-tight">{item.name}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{item.sku || 'N/A'}</div>
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
                                        <div className="text-sm font-black text-gray-900">{item.stock} Units</div>
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => onAdjustStock(item)}
                                                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                                            >
                                                Adjust
                                            </button>
                                            <button className="text-gray-300 hover:text-gray-900 transition-colors p-1"><MoreVertical size={20} /></button>
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
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        type: 'STANDARD',
        stock: 0,
        price: 0,
        costPrice: 0,
        vipPrice: 0,
        expiryDate: '',
        variantsInput: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload: any = {
                ...formData,
                stock: Number(formData.stock),
                price: Number(formData.price),
                costPrice: Number(formData.costPrice),
                vipPrice: Number(formData.vipPrice),
                expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
            };

            if (formData.type === 'VARIANT' && formData.variantsInput) {
                payload.variants = formData.variantsInput.split(',').map((v: string) => ({
                    name: v.trim(),
                    price: Number(formData.price),
                    vipPrice: Number(formData.vipPrice),
                    stock: 0
                }));
            }

            await axios.post(`${API_URL}/inventory/products`, payload);
            onSuccess();
            onClose();
            setFormData({ name: '', sku: '', type: 'STANDARD', stock: 0, price: 0, costPrice: 0, vipPrice: 0, expiryDate: '', variantsInput: '' });
        } catch (err) {
            console.error('Error adding item:', err);
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
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cost (₦)</label>
                            <input required type="number" className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-black text-sm" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#2D7A3E] uppercase tracking-widest ml-1">Retail (₦)</label>
                            <input required type="number" className="w-full px-4 py-4 bg-green-50/30 border border-green-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-black text-sm" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">VIP (₦)</label>
                            <input required type="number" className="w-full px-4 py-4 bg-amber-50/30 border border-amber-100 rounded-2xl focus:border-amber-400 outline-none font-black text-sm" value={formData.vipPrice} onChange={(e) => setFormData({ ...formData, vipPrice: Number(e.target.value) })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Reserve</label>
                            <input required type="number" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lifespan Endpoint</label>
                            <input type="date" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
                        </div>
                    </div>
                </form>
                <div className="p-8 border-t border-gray-50 bg-gray-50/30">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-[#2D7A3E] text-white py-5 rounded-2xl font-black uppercase tracking-wide shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Initializing...' : 'Deploy Product'}
                    </button>
                </div>
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

    if (!isOpen || !product) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post(`${API_URL}/inventory/stock-adjustments`, {
                productId: product.id,
                variantId: formData.variantId || undefined,
                type: formData.type,
                quantity: Number(formData.quantity),
                reason: formData.reason
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error adjusting stock:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Adjust Systems</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#2D7A3E]/60 mb-1">Target Module</p>
                        <p className="font-black text-gray-900">{product.name} <span className="text-[#2D7A3E]">({product.sku || 'N/A'})</span></p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Regulation Type</label>
                            <select
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-xs appearance-none"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="IN">Inward (+)</option>
                                <option value="OUT">Outward (-)</option>
                                <option value="ADJUST">Override (=)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Magnitude</label>
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
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Adjustment Logic (Optional)</label>
                        <textarea
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none min-h-[100px] font-bold text-sm"
                            placeholder="e.g. Reconciliation after audit"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-[#2D7A3E] text-white py-5 rounded-2xl font-black uppercase tracking-wide shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Applying...' : 'Authorize Adjustment'}
                    </button>
                </form>
            </div>
        </div>
    );
};
