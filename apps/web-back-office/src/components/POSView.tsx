import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Landmark, Split, History, Plus, X, Minus } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || (API_URL.replace(/^http/, 'ws') + '/ws');

export const POSView = ({ products, customers, onSubmitOrder, refresh }: any) => {
    const [cart, setCart] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [amountCash, setAmountCash] = useState(0);
    const [amountCard, setAmountCard] = useState(0);
    const [amountTransfer, setAmountTransfer] = useState(0);
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const [completedOrder, setCompletedOrder] = useState<any>(null);
    const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);
    const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
    
    // Terminal push states
    const [isCardTransferSelectorOpen, setIsCardTransferSelectorOpen] = useState(false);
    const [isWaitingForTerminal, setIsWaitingForTerminal] = useState(false);
    const [terminalReference, setTerminalReference] = useState('');
    const [pendingTerminalOrderId, setPendingTerminalOrderId] = useState<string | null>(null);
    const pendingTerminalOrderIdRef = useRef<string | null>(null);
    
    const { user } = useAuth();

    // Keep ref updated
    useEffect(() => {
        pendingTerminalOrderIdRef.current = pendingTerminalOrderId;
    }, [pendingTerminalOrderId]);

    // WebSocket listener for live stock updates and payment resolution
    useEffect(() => {
        console.log('POS Connecting to WebSocket at:', WS_URL);
        const socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.log('POS Connected to WebSocket Sync Engine');
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('POS received WS message:', message);

                if (message.event === 'ORDER_CREATED') {
                    if (refresh) {
                        console.log('Order created by other terminal. Refreshing local stock...');
                        refresh();
                    }
                } else if (message.event === 'PAYMENT_SUCCESS') {
                    const currentPendingId = pendingTerminalOrderIdRef.current;
                    if (currentPendingId && message.payload.id === currentPendingId) {
                        console.log('PAYMENT_SUCCESS match found! Resolving terminal standby.');
                        setIsWaitingForTerminal(false);
                        setCompletedOrder(message.payload);
                        setCart([]);
                        setSelectedCustomer(null);
                        setPaymentMethod('CASH');
                        setAmountCash(0);
                        setAmountCard(0);
                        setAmountTransfer(0);
                        setPendingTerminalOrderId(null);
                        if (refresh) refresh();
                    }
                }
            } catch (err) {
                console.error('Error parsing WS message in POS:', err);
            }
        };

        socket.onclose = () => {
            console.log('POS WebSocket closed');
        };

        return () => {
            socket.close();
        };
    }, [refresh]);

    const cancelTerminalWait = async () => {
        if (!pendingTerminalOrderId) return;

        setCustomConfirm({
            message: "Are you sure you want to bypass the terminal and mark this order as paid manually?",
            onConfirm: async () => {
                try {
                    const res = await axios.patch(`${API_URL}/orders/${pendingTerminalOrderId}/payment-status`, {
                        paymentStatus: 'SUCCESS'
                    });

                    setIsWaitingForTerminal(false);
                    setCompletedOrder(res.data);
                    setCart([]);
                    setSelectedCustomer(null);
                    setPaymentMethod('CASH');
                    setAmountCash(0);
                    setAmountCard(0);
                    setAmountTransfer(0);
                    setPendingTerminalOrderId(null);
                    if (refresh) refresh();
                } catch (err: any) {
                    console.error('Error bypassing terminal payment:', err);
                    setCustomAlert({
                        title: "Bypass Failed",
                        message: "Failed to mark order as paid manually."
                    });
                }
            }
        });
    };

    const total = cart.reduce((acc, item) => {
        const itemPrice = selectedCustomer ? (Number(item.vipPrice) || Number(item.price)) : Number(item.price);
        return acc + itemPrice * item.quantity;
    }, 0);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const incrementQuantity = (productId: string) => {
        setCart(prev => prev.map(i => i.id === productId ? { ...i, quantity: i.quantity + 1 } : i));
    };

    const decrementQuantity = (productId: string) => {
        setCart(prev => prev.map(i => i.id === productId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i));
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(i => i.id !== productId));
    };

    const handleCheckout = async () => {
        const proceedCheckout = async (initialPaymentStatus = 'SUCCESS') => {
            const splitPayments = [];
            if (paymentMethod === 'SPLIT') {
                const splitTotal = amountCash + amountCard + amountTransfer;
                if (splitTotal !== total) {
                    setCustomAlert({
                        title: "Split Balance Mismatch",
                        message: `Split payment sum (₦${splitTotal.toLocaleString()}) must match the grand total (₦${total.toLocaleString()}).`
                    });
                    return;
                }
                if (amountCash > 0) splitPayments.push({ method: 'CASH', amount: amountCash });
                if (amountCard > 0) splitPayments.push({ method: 'CARD', amount: amountCard });
                if (amountTransfer > 0) splitPayments.push({ method: 'TRANSFER', amount: amountTransfer });
            }

            if (paymentMethod === 'CREDIT' && !selectedCustomer) {
                setCustomAlert({
                    title: "Missing Customer",
                    message: "A customer must be assigned for Credit sales."
                });
                return;
            }

            const orderData = {
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: selectedCustomer ? (Number(item.vipPrice) || Number(item.price)) : Number(item.price)
                })),
                totalAmount: total,
                paymentMethod,
                paymentStatus: initialPaymentStatus,
                customerId: selectedCustomer?.id,
                cashierId: user?.id,
                amountCash: paymentMethod === 'CASH' ? total : (paymentMethod === 'SPLIT' ? amountCash : 0),
                amountTransfer: paymentMethod === 'TRANSFER' ? total : (paymentMethod === 'SPLIT' ? amountTransfer : 0),
                amountCard: paymentMethod === 'CARD' ? total : (paymentMethod === 'SPLIT' ? amountCard : 0),
                splitPayments: splitPayments.length > 0 ? splitPayments : undefined,
                storeId: 'test-store-1' // Default store ID
            };

            try {
                const res = await onSubmitOrder(orderData);
                
                if (initialPaymentStatus === 'PENDING') {
                    console.log('Initiating terminal payment for order:', res.id);
                    try {
                        const initRes = await axios.post(`${API_URL}/payments/initiate`, {
                            amount: total,
                            provider: 'MONNIFY',
                            orderId: res.id,
                            paymentType: paymentMethod
                        });

                        setTerminalReference(initRes.data.reference);
                        setPendingTerminalOrderId(res.id);
                        setIsWaitingForTerminal(true);
                    } catch (paymentErr: any) {
                        console.error('Failed to initiate terminal payment:', paymentErr);
                        setCustomAlert({
                            title: "Terminal Request Failed",
                            message: "Failed to connect to the card reader. Processing payment manually."
                        });
                        // Automatically bypass to SUCCESS
                        const bypassRes = await axios.patch(`${API_URL}/orders/${res.id}/payment-status`, {
                            paymentStatus: 'SUCCESS'
                        });
                        setCompletedOrder(bypassRes.data);
                        setCart([]);
                        setSelectedCustomer(null);
                        setPaymentMethod('CASH');
                        if (refresh) refresh();
                    }
                } else {
                    setCompletedOrder(res);
                    setCart([]);
                    setSelectedCustomer(null);
                    setPaymentMethod('CASH');
                    setAmountCash(0);
                    setAmountCard(0);
                    setAmountTransfer(0);
                    if (refresh) refresh();
                }
            } catch (err: any) {
                console.error('Error during checkout:', err);
                setCustomAlert({
                    title: "Checkout Failed",
                    message: err?.response?.data?.message || err?.message || "Order checkout encountered an error."
                });
            }
        };

        if (paymentMethod === 'CARD' || paymentMethod === 'TRANSFER') {
            setIsCardTransferSelectorOpen(true);
        } else {
            await proceedCheckout('SUCCESS');
        }
    };

    const handleCustomerAdded = async (newCustomer: any) => {
        if (refresh) {
            await refresh();
        }
        setSelectedCustomer(newCustomer);
        setIsAddCustomerModalOpen(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 relative">
            {/* Add Customer Modal */}
            {isAddCustomerModalOpen && (
                <AddCustomerModal
                    onClose={() => setIsAddCustomerModalOpen(false)}
                    onSuccess={handleCustomerAdded}
                />
            )}

            {/* Payment Mode Selector Modal (Terminal vs Manual) */}
            {isCardTransferSelectorOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsCardTransferSelectorOpen(false)} />
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-[111] overflow-hidden animate-in zoom-in-95 p-6 space-y-6">
                        <div className="text-center">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Select Payment Mode</h3>
                            <p className="text-sm text-gray-500 font-bold mt-1">Order Total: ₦{total.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setIsCardTransferSelectorOpen(false);
                                    handleCheckout().then(() => {}); // This will call proceedCheckout under the hood
                                    // Wait, let's call the helper directly since we can't call handleCheckout synchronously in self
                                }}
                                className="w-full bg-[#2D7A3E] text-white py-4 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all flex items-center justify-center gap-2"
                                style={{ display: 'none' /* We will call proceedCheckout directly */ }}
                            >
                                Pay via Monnify Terminal
                            </button>
                            {/* Let's fix the handlers to call proceedCheckout directly since it is in scope! */}
                            <button
                                onClick={() => {
                                    setIsCardTransferSelectorOpen(false);
                                    // @ts-ignore
                                    proceedCheckout('PENDING');
                                }}
                                className="w-full bg-[#2D7A3E] text-white py-4 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all flex items-center justify-center gap-2"
                            >
                                <CreditCard size={16} /> Pay via Monnify Terminal
                            </button>
                            <button
                                onClick={() => {
                                    setIsCardTransferSelectorOpen(false);
                                    // @ts-ignore
                                    proceedCheckout('SUCCESS');
                                }}
                                className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Banknote size={16} /> Process Manually (Offline)
                            </button>
                            <button
                                onClick={() => setIsCardTransferSelectorOpen(false)}
                                className="w-full bg-white border border-gray-200 text-gray-400 py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Waiting for Terminal standby loader */}
            {isWaitingForTerminal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full border border-gray-100 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 border-4 border-green-200 border-t-[#2D7A3E] rounded-full animate-spin mb-6"></div>
                        <h3 className="font-black text-gray-900 text-2xl mb-2">Awaiting Card Reader</h3>
                        <p className="text-gray-500 font-bold text-sm mb-6 leading-relaxed">
                            Push payment request sent to Monnify POS Terminal.<br/>
                            Please swipe, insert, or tap card on terminal to pay <strong>₦{total.toLocaleString()}</strong>.
                        </p>
                        {terminalReference && (
                            <div className="px-4 py-2 bg-gray-50 rounded-xl text-xs font-mono text-gray-400 font-bold mb-6 select-all">
                                REF: {terminalReference}
                            </div>
                        )}
                        <button
                            onClick={cancelTerminalWait}
                            className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-100 font-black rounded-xl text-sm transition-all active:scale-95"
                        >
                            Bypass Terminal & Pay Manually
                        </button>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {completedOrder && (
                <ReceiptModal
                    order={completedOrder}
                    onClose={() => setCompletedOrder(null)}
                />
            )}

            {/* Custom Alert Modal */}
            {customAlert && (
                <CustomAlertModal
                    title={customAlert.title}
                    message={customAlert.message}
                    onClose={() => setCustomAlert(null)}
                />
            )}

            {/* Custom Confirm Modal */}
            {customConfirm && (
                <CustomConfirmModal
                    message={customConfirm.message}
                    onConfirm={customConfirm.onConfirm}
                    onClose={() => setCustomConfirm(null)}
                />
            )}

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
                                    <div className="font-black text-[#2D7A3E] text-xl">₦{Number(p.price).toLocaleString()}</div>
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
            <div className="w-full lg:w-[400px] flex flex-col bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-900/5 h-full overflow-y-auto custom-scrollbar">
                {/* Header Section */}
                <div className="flex-none">
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
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest ml-1">Assign Customer</label>
                                <button
                                    onClick={() => setIsAddCustomerModalOpen(true)}
                                    className="p-1 px-2 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black hover:bg-blue-200 transition-colors flex items-center gap-1"
                                >
                                    <Plus size={10} strokeWidth={4} />
                                    NEW
                                </button>
                            </div>
                            <select
                                className="w-full p-3 bg-white border border-blue-100 rounded-2xl font-bold text-sm text-blue-900 outline-none focus:ring-4 focus:ring-blue-900/5 transition-all"
                                value={selectedCustomer?.id || ''}
                                onChange={(e) => setSelectedCustomer(customers.find((c: any) => c.id === e.target.value) || null)}
                            >
                                <option value="">Walk-in Customer</option>
                                {customers.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-none p-6 space-y-4">
                    {cart.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
                            <ShoppingCart size={48} strokeWidth={1} />
                            <p className="text-sm font-bold uppercase tracking-widest">Cart is Empty</p>
                        </div>
                    ) : cart.map(item => {
                        const itemPrice = selectedCustomer ? (Number(item.vipPrice) || Number(item.price)) : Number(item.price);
                        return (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 group animate-in slide-in-from-right-2 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all">
                                <div className="flex flex-col min-w-0 flex-1">
                                    <div className="font-black text-gray-900 text-sm truncate">{item.name}</div>
                                    <div className="text-[10px] text-[#2D7A3E] font-black mt-0.5">₦{itemPrice.toLocaleString()}</div>
                                </div>
                                
                                <div className="flex items-center gap-3 ml-2">
                                    <div className="flex items-center bg-gray-200/50 rounded-xl p-1">
                                        <button 
                                            onClick={() => decrementQuantity(item.id)}
                                            className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-gray-600 hover:bg-[#2D7A3E] hover:text-white transition-colors active:scale-95 shadow-sm"
                                        >
                                            <Minus size={12} strokeWidth={3} />
                                        </button>
                                        <span className="px-2 text-xs font-black text-gray-900 min-w-[20px] text-center">{item.quantity}</span>
                                        <button 
                                            onClick={() => incrementQuantity(item.id)}
                                            className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-gray-600 hover:bg-[#2D7A3E] hover:text-white transition-colors active:scale-95 shadow-sm"
                                        >
                                            <Plus size={12} strokeWidth={3} />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => removeFromCart(item.id)}
                                        className="p-2 hover:bg-red-50 rounded-xl text-red-500 hover:text-red-700 transition-colors active:scale-95"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Section */}
                <div className="flex-none p-6 bg-gray-50 border-t border-gray-100 space-y-6 mt-auto">
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
                                    <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Cash (₦)</label>
                                    <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black focus:border-[#2D7A3E] outline-none transition-all" value={amountCash} onChange={(e) => setAmountCash(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Card (₦)</label>
                                    <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black focus:border-[#2D7A3E] outline-none transition-all" value={amountCard} onChange={(e) => setAmountCard(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Transfer (₦)</label>
                                <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black focus:border-[#2D7A3E] outline-none transition-all" value={amountTransfer} onChange={(e) => setAmountTransfer(Number(e.target.value))} />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-end gap-4">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                            <span className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter truncate">₦{total.toLocaleString()}</span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0}
                            className="bg-[#2D7A3E] text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#235E30] disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-2xl shadow-green-900/10 active:scale-95 flex items-center space-x-2 flex-shrink-0"
                        >
                            <span>Checkout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- AddCustomerModal Component ---
export const AddCustomerModal = ({ onClose, onSuccess }: any) => {
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim() ? formData.email.trim() : null,
                phone: formData.phone.trim() ? formData.phone.trim() : null,
            };
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.post(`${API_URL}/customers`, payload, { headers });
            onSuccess(res.data);
            onClose();
        } catch (err: any) {
            console.error('Error creating customer:', err);
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to register customer.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Add Customer</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input required type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number (Optional)</label>
                        <input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                        <input type="email" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    {error && (
                        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
                            ⚠️ {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#2D7A3E] text-white py-5 rounded-2xl font-black uppercase tracking-wide shadow-xl shadow-green-900/10 hover:bg-[#20502E] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Registering...' : 'Complete Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Receipt Modal Component ---
export const ReceiptModal = ({ order, onClose }: any) => {
    const handlePrint = () => {
        window.print();
    };

    if (!order) return null;

    const formattedDate = new Date(order.createdAt).toLocaleString();
    const invoiceNumber = order.id.slice(-8).toUpperCase();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-none">
                    <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Transaction Invoice</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar" id="print-area">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">DEMEGA SUPERMARKET</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">POS TERMINAL RECEIPT</p>
                        <div className="border-b-2 border-dashed border-gray-200 my-4"></div>
                        <div className="text-left text-xs space-y-1 font-mono text-gray-600">
                            <div>INVOICE: #{invoiceNumber}</div>
                            <div>DATE: {formattedDate}</div>
                            {order.cashier && <div>CASHIER: {order.cashier.name}</div>}
                            {order.customer && <div>CUSTOMER: {order.customer.name}</div>}
                            <div>PAYMENT: {order.paymentMethod}</div>
                        </div>
                        <div className="border-b-2 border-dashed border-gray-200 my-4"></div>
                    </div>

                    <table className="w-full text-xs font-mono text-gray-800">
                        <thead>
                            <tr className="border-b border-gray-100 text-left font-black">
                                <th className="pb-2">ITEM</th>
                                <th className="pb-2 text-center">QTY</th>
                                <th className="pb-2 text-right">PRICE</th>
                                <th className="pb-2 text-right">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {order.items && order.items.map((item: any, idx: number) => (
                                <tr key={idx} className="py-2">
                                    <td className="py-2 max-w-[150px] truncate">{item.product?.name || 'Item'}</td>
                                    <td className="py-2 text-center">{item.quantity}</td>
                                    <td className="py-2 text-right">₦{Number(item.price).toLocaleString()}</td>
                                    <td className="py-2 text-right">₦{(Number(item.price) * item.quantity).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="border-b-2 border-dashed border-gray-200 my-4"></div>

                    <div className="space-y-1.5 font-mono text-sm text-gray-900">
                        <div className="flex justify-between font-black text-lg">
                            <span>TOTAL PAID</span>
                            <span>₦{Number(order.totalAmount).toLocaleString()}</span>
                        </div>
                        {order.splitPayments && order.splitPayments.length > 0 && (
                            <div className="pt-2 text-xs space-y-1 border-t border-gray-100 text-gray-500">
                                <div className="font-bold">SPLIT PAYMENT BREAKDOWN:</div>
                                {order.splitPayments.map((sp: any, idx: number) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>• {sp.method}</span>
                                        <span>₦{Number(sp.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-b-2 border-dashed border-gray-200 my-4"></div>
                    <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
                        Thank you for your patronage!
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4 flex-none">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-gray-100 active:scale-95 transition-all"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-4 bg-[#2D7A3E] text-white rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] active:scale-95 transition-all shadow-xl shadow-green-900/10"
                    >
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Custom Alert Modal ---
export const CustomAlertModal = ({ title = "Alert Notification", message, onClose }: any) => {
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

// --- Custom Confirm Modal ---
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
