import { useState } from 'react';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Landmark, Split, History } from 'lucide-react';

export const POSView = ({ products, customers, onSubmitOrder }: any) => {
    const [cart, setCart] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [amountCash, setAmountCash] = useState(0);
    const [amountTransfer, setAmountTransfer] = useState(0);

    const total = cart.reduce((acc, item) => acc + (selectedCustomer ? (item.vipPrice || item.price) : item.price) * item.quantity, 0);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const handleCheckout = async () => {
        const orderData = {
            items: cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                price: selectedCustomer ? (item.vipPrice || item.price) : item.price
            })),
            totalAmount: total,
            paymentMethod,
            customerId: selectedCustomer?.id,
            amountCash,
            amountTransfer,
            amountCard: 0,
            storeId: 'test-store-1'
        };

        if (paymentMethod === 'CARD' || paymentMethod === 'TRANSFER') {
            const confirm = window.confirm(`Simulate ${paymentMethod} verification via external terminal/app?`);
            if (!confirm) return;
        }

        try {
            await onSubmitOrder(orderData);
            setCart([]);
            setSelectedCustomer(null);
            setPaymentMethod('CASH');
            setAmountCash(0);
            setAmountTransfer(0);
        } catch (err) {
            console.error('Error during checkout:', err);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
            {/* Products Side */}
            <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-0">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search products by name or SKU..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-sm transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 custom-scrollbar">
                    {products.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase())).map((p: any) => (
                        <button
                            key={p.id}
                            onClick={() => addToCart(p)}
                            className="p-6 bg-gray-50 rounded-[2rem] border border-gray-50 hover:border-[#2D7A3E] hover:bg-white hover:shadow-xl hover:shadow-green-900/5 transition-all text-left flex flex-col justify-between group"
                        >
                            <div>
                                <div className="font-black text-gray-900 group-hover:text-[#2D7A3E] text-lg leading-tight transition-colors">{p.name}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{p.sku || 'NO-SKU'}</div>
                            </div>
                            <div className="mt-8 flex justify-between items-end">
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Price</div>
                                    <div className="font-black text-[#2D7A3E] text-xl">₦{p.price.toLocaleString()}</div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${p.stock < 10 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                    {p.stock} IN STOCK
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cart Side */}
            <div className="w-full lg:w-[400px] flex flex-col bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-900/5 overflow-hidden min-h-0">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                            <ShoppingCart size={18} className="text-[#2D7A3E]" />
                        </div>
                        Active Cart
                    </h3>
                    <button onClick={() => setCart([])} className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>

                <div className="p-6 bg-blue-50/30 border-b border-blue-50">
                    <div className="flex flex-col space-y-3">
                        <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest ml-1">Assign Customer</label>
                        <select
                            className="w-full p-3 bg-white border border-blue-100 rounded-2xl font-bold text-sm text-blue-900 outline-none focus:ring-4 focus:ring-blue-900/5 transition-all"
                            value={selectedCustomer?.id || ''}
                            onChange={(e) => setSelectedCustomer(customers.find((c: any) => c.id === e.target.value))}
                        >
                            <option value="">Walk-in Customer</option>
                            {customers.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                            ))}
                        </select>
                    </div>
                    {selectedCustomer && (
                        <div className="mt-4 p-3 bg-white rounded-xl border border-blue-100 flex justify-between animate-in slide-in-from-top-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-500 uppercase">VIP Tier</span>
                                <span className="text-xs font-black text-gray-900">Active Pricing</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] font-black text-blue-500 uppercase">Wallet</span>
                                <span className="text-xs font-black text-gray-900">₦{selectedCustomer.walletBalance?.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
                            <ShoppingCart size={48} strokeWidth={1} />
                            <p className="text-sm font-bold uppercase tracking-widest">Cart is Empty</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center group">
                            <div className="flex flex-col min-w-0">
                                <div className="font-black text-gray-900 text-sm truncate">{item.name}</div>
                                <div className="text-[10px] text-gray-400 font-bold">₦{item.price.toLocaleString()} × {item.quantity}</div>
                            </div>
                            <div className="font-black text-gray-900 ml-4">₦{(item.price * item.quantity).toLocaleString()}</div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Engine</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'CASH', icon: Banknote },
                                { id: 'CARD', icon: CreditCard },
                                { id: 'TRANSFER', icon: Landmark },
                                { id: 'SPLIT', icon: Split },
                                { id: 'CREDIT', icon: History }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setPaymentMethod(m.id)}
                                    className={`flex flex-col items-center justify-center py-3 rounded-2xl border transition-all ${paymentMethod === m.id ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-900/20' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-white'}`}
                                >
                                    <m.icon size={18} className="mb-1" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">{m.id}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {paymentMethod === 'SPLIT' && (
                        <div className="space-y-3 p-4 bg-white rounded-2xl border border-gray-200 animate-in zoom-in-95">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Cash</label>
                                    <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black focus:border-[#2D7A3E] outline-none transition-all" value={amountCash} onChange={(e) => setAmountCash(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Card</label>
                                    <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black focus:border-[#2D7A3E] outline-none transition-all" placeholder="0" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Transfer</label>
                                <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black focus:border-[#2D7A3E] outline-none transition-all" value={amountTransfer} onChange={(e) => setAmountTransfer(Number(e.target.value))} />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                            <span className="text-3xl font-black text-gray-900 tracking-tighter">₦{total.toLocaleString()}</span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0}
                            className="bg-[#2D7A3E] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#235E30] disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-2xl shadow-green-900/10 active:scale-95 flex items-center space-x-2"
                        >
                            <span>Checkout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
