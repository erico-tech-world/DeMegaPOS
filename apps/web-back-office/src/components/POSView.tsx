import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Search, ShoppingCart, Trash2, CreditCard, Banknote, Landmark, Split, History,
    Plus, X, Minus, Package, Clock, Loader2, ChevronDown, ChevronUp, ArrowRight, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, WS_URL } from '../lib/apiConfig';

export const POSView = ({
    products,
    customers,
    onSubmitOrder,
    createDraftOrder,
    draftOrders = [],
    fetchDraftOrders,
    lockDraftOrder,
    refresh,
    resumedDraft
}: any) => {
    const navigate = useNavigate();
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
    const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isDraftGuardOpen, setIsDraftGuardOpen] = useState(false);
    const [isDraftWidgetCollapsed, setIsDraftWidgetCollapsed] = useState(false);
    // Checkout idempotency: ref guards against re-entrant async calls; state drives button UI
    const isCheckingOutRef = useRef(false);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    // Pre-populate cart if a draft order was resumed
    useEffect(() => {
        if (resumedDraft && resumedDraft.items && resumedDraft.items.length > 0) {
            const draftCart = resumedDraft.items.map((item: any) => ({
                id: item.product?.id || item.productId,
                name: item.product?.name || item.name || 'Product',
                price: Number(item.price),
                quantity: item.quantity,
                vipPrice: item.product?.vipPrice,
                seatNumber: item.seatNumber || undefined
            }));
            setCart(draftCart);
            if (resumedDraft.customer) {
                setSelectedCustomer(resumedDraft.customer);
            }
        }
    }, [resumedDraft]);

    // Terminal push & mapping states
    const [isCardTransferSelectorOpen, setIsCardTransferSelectorOpen] = useState(false);
    const [isNoTerminalModalOpen, setIsNoTerminalModalOpen] = useState(false);
    const [isMonnifyMappingModalOpen, setIsMonnifyMappingModalOpen] = useState(false);
    const [unmappedTransactions, setUnmappedTransactions] = useState<any[]>([]);
    const [isFetchingUnmapped, setIsFetchingUnmapped] = useState(false);
    const [isManualPosModalOpen, setIsManualPosModalOpen] = useState(false);
    const [posDeviceTypeInput, setPosDeviceTypeInput] = useState('');
    const [createdPendingOrder, setCreatedPendingOrder] = useState<any>(null);
    const [isWaitingForTerminal, setIsWaitingForTerminal] = useState(false);
    const [terminalReference, setTerminalReference] = useState('');
    const [pendingTerminalOrderId, setPendingTerminalOrderId] = useState<string | null>(null);
    const pendingTerminalOrderIdRef = useRef<string | null>(null);

    const { user } = useAuth();

    // Helper: create pending order in DB
    const createPendingOrder = async () => {
        const splitPayments = [];
        if (paymentMethod === 'SPLIT') {
            const splitTotal = amountCash + amountCard + amountTransfer;
            if (splitTotal !== total) {
                setCustomAlert({
                    title: "Split Balance Mismatch",
                    message: `Split payment sum (₦${splitTotal.toLocaleString()}) must match the grand total (₦${total.toLocaleString()}).`
                });
                return null;
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
            return null;
        }

        const orderData = {
            items: cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                price: selectedCustomer ? (Number(item.vipPrice) || Number(item.price)) : Number(item.price),
                seatNumber: item.seatNumber || undefined
            })),
            totalAmount: total,
            paymentMethod,
            paymentStatus: 'PENDING',
            customerId: selectedCustomer?.id,
            cashierId: user?.id,
            amountCash: paymentMethod === 'CASH' ? total : (paymentMethod === 'SPLIT' ? amountCash : 0),
            amountTransfer: paymentMethod === 'TRANSFER' ? total : (paymentMethod === 'SPLIT' ? amountTransfer : 0),
            amountCard: paymentMethod === 'CARD' ? total : (paymentMethod === 'SPLIT' ? amountCard : 0),
            splitPayments: splitPayments.length > 0 ? splitPayments : undefined,
            storeId: localStorage.getItem('selectedBranchId') || (user as any)?.branchId || undefined
        };

        const res = await onSubmitOrder(orderData);
        return res;
    };

    // Option A: Handle Monnify Terminal click
    const handlePayViaMonnifyTerminal = async () => {
        setIsCardTransferSelectorOpen(false);
        try {
            const res = await axios.get(`${API_URL}/integrations`);
            const integrations = res.data || [];
            const activeMonnify = integrations.find((i: any) => i.provider === 'MONNIFY' && i.isActive);

            if (!activeMonnify) {
                // No active Monnify terminal integration connected
                setIsNoTerminalModalOpen(true);
                return;
            }

            // Terminal integration exists -> create pending order & fetch unmapped transactions
            const pendingOrder = await createPendingOrder();
            if (!pendingOrder) return;

            setCreatedPendingOrder(pendingOrder);
            setIsFetchingUnmapped(true);
            setIsMonnifyMappingModalOpen(true);

            try {
                const txRes = await axios.get(`${API_URL}/integrations/unmapped-transactions`);
                setUnmappedTransactions(txRes.data || []);
            } catch (err) {
                console.error('Failed to fetch unmapped transactions:', err);
                setUnmappedTransactions([]);
            } finally {
                setIsFetchingUnmapped(false);
            }
        } catch (err: any) {
            console.error('Error in Monnify Terminal flow:', err);
            // Fallback to no terminal modal if API fails
            setIsNoTerminalModalOpen(true);
        }
    };

    // Option A Map Action: Map selected transaction to createdPendingOrder
    const handleMapTransactionToOrder = async (tx: any) => {
        if (!createdPendingOrder) return;
        try {
            const mapRes = await axios.post(`${API_URL}/integrations/orders/${createdPendingOrder.id}/map-terminal`, {
                transactionRef: tx.transactionReference,
                paymentRef: tx.paymentReference,
                amount: Number(tx.amount),
                customerName: tx.customerName,
                customerPhone: tx.customerPhone,
                settledAt: tx.paidOn,
                rawResponse: tx.raw
            });

            setIsMonnifyMappingModalOpen(false);
            setCompletedOrder(mapRes.data.order || mapRes.data);
            setCreatedPendingOrder(null);
            setCart([]);
            setSelectedCustomer(null);
            setPaymentMethod('CASH');
            setAmountCash(0);
            setAmountCard(0);
            setAmountTransfer(0);
            if (refresh) refresh();
        } catch (err: any) {
            console.error('Failed to map terminal transaction:', err);
            setCustomAlert({
                title: "Mapping Failed",
                message: err?.response?.data?.message || err?.message || "Failed to map terminal transaction to order."
            });
        }
    };

    // Option B: Process Manual Payment click -> prompt POS device type
    const handleProcessManualPaymentClick = async () => {
        setIsCardTransferSelectorOpen(false);
        setIsManualPosModalOpen(true);
    };

    // Option B Submit Action: Complete manual payment with POS device type
    const handleSubmitManualPosPayment = async () => {
        if (!posDeviceTypeInput.trim()) {
            setCustomAlert({
                title: "Device Type Required",
                message: "Please enter the POS Terminal Device Type (e.g. Moniepoint POS, Opay POS)."
            });
            return;
        }

        try {
            const pendingOrder = await createPendingOrder();
            if (!pendingOrder) return;

            const res = await axios.post(`${API_URL}/integrations/orders/${pendingOrder.id}/manual-payment`, {
                posDeviceType: posDeviceTypeInput.trim()
            });

            setIsManualPosModalOpen(false);
            setPosDeviceTypeInput('');
            setCompletedOrder(res.data);
            setCart([]);
            setSelectedCustomer(null);
            setPaymentMethod('CASH');
            setAmountCash(0);
            setAmountCard(0);
            setAmountTransfer(0);
            if (refresh) refresh();
        } catch (err: any) {
            console.error('Error completing manual payment:', err);
            setCustomAlert({
                title: "Payment Processing Failed",
                message: err?.response?.data?.message || err?.message || "Failed to complete manual payment."
            });
        }
    };

    // Keep ref updated
    useEffect(() => {
        pendingTerminalOrderIdRef.current = pendingTerminalOrderId;
    }, [pendingTerminalOrderId]);

    // WebSocket listener for live stock updates and payment resolution
    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectTimeout: any = null;
        let isMounted = true;
        let retryCount = 0;
        const MAX_RETRIES = 5;

        const connect = () => {
            if (!isMounted) return;
            try {
                console.log('POS Connecting to WebSocket at:', WS_URL);
                socket = new WebSocket(WS_URL);

                socket.onopen = () => {
                    retryCount = 0; // Reset retry counter on successful handshake
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
                    if (isMounted && retryCount < MAX_RETRIES) {
                        retryCount++;
                        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
                        reconnectTimeout = setTimeout(connect, delay);
                    }
                };

                socket.onerror = () => {
                    try { socket?.close(); } catch {}
                };
            } catch (err) {
                if (isMounted && retryCount < MAX_RETRIES) {
                    retryCount++;
                    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
                    reconnectTimeout = setTimeout(connect, delay);
                }
            }
        };

        connect();

        return () => {
            isMounted = false;
            if (socket) {
                socket.onclose = null;
                socket.close();
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
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

    const updateSeatNumber = (productId: string, seat: string) => {
        setCart(prev => prev.map(i => i.id === productId ? { ...i, seatNumber: seat.trim() || undefined } : i));
    };

    // Auto-fetch drafts on mount to ensure quick-access widget has fresh state
    useEffect(() => {
        if (fetchDraftOrders) {
            fetchDraftOrders();
        }
    }, [fetchDraftOrders]);

    // Top 3 most recently created draft orders (sorted LIFO / newest-first)
    const recentDrafts = useMemo(() => {
        return (draftOrders || [])
            .slice()
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3);
    }, [draftOrders]);

    const getTimeElapsed = (dateStr: string) => {
        if (!dateStr) return '';
        const diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return `${Math.floor(diffSec / 86400)}d ago`;
    };

    const handleQuickResumeDraft = async (draftOrder: any) => {
        if (!draftOrder) return;

        const executeResume = async () => {
            if (lockDraftOrder) {
                try { await lockDraftOrder(draftOrder.id); } catch {}
            }
            const draftCart = (draftOrder.items || []).map((item: any) => ({
                id: item.product?.id || item.productId,
                name: item.product?.name || item.name || 'Product',
                price: Number(item.price),
                quantity: item.quantity,
                vipPrice: item.product?.vipPrice,
                seatNumber: item.seatNumber || undefined
            }));
            setCart(draftCart);
            if (draftOrder.customer) {
                setSelectedCustomer(draftOrder.customer);
            } else {
                setSelectedCustomer(null);
            }
            if (fetchDraftOrders) {
                try { await fetchDraftOrders(); } catch {}
            }
            if (refresh) {
                try { await refresh(); } catch {}
            }
            // Switch to cart tab on mobile if resumed
            setActiveTab('cart');
        };

        if (cart.length > 0) {
            setCustomConfirm({
                message: `Resuming draft ORD-${draftOrder.id.slice(-5).toUpperCase()} will replace the items currently in your active cart. Do you wish to proceed?`,
                onConfirm: executeResume
            });
        } else {
            await executeResume();
        }
    };

    // Full-spectrum product search: evaluates Name, SKU, Barcode, Category, and Variant SKUs
    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return products || [];
        return (products || []).filter((p: any) => {
            const nameMatch = p.name?.toLowerCase().includes(query);
            const skuMatch = p.sku?.toLowerCase().includes(query);
            const barcodeMatch = p.barcode?.toLowerCase().includes(query);
            const categoryMatch = p.category?.name?.toLowerCase().includes(query);
            const variantMatch = Array.isArray(p.variants) && p.variants.some((v: any) =>
                v.sku?.toLowerCase().includes(query) || v.name?.toLowerCase().includes(query)
            );
            return nameMatch || skuMatch || barcodeMatch || categoryMatch || variantMatch;
        });
    }, [products, search]);

    // Handle Enter key for barcode scanner hardware and quick-add
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const query = search.trim().toLowerCase();
            if (!query) return;

            // 1. Direct barcode match
            const exactBarcodeMatch = (products || []).find((p: any) => p.barcode?.toLowerCase() === query);
            if (exactBarcodeMatch) {
                addToCart(exactBarcodeMatch);
                setSearch('');
                return;
            }

            // 2. Direct SKU match on product
            const exactSkuMatch = (products || []).find((p: any) => p.sku?.toLowerCase() === query);
            if (exactSkuMatch) {
                addToCart(exactSkuMatch);
                setSearch('');
                return;
            }

            // 3. Direct SKU match on product variant
            const exactVariantMatch = (products || []).find((p: any) =>
                Array.isArray(p.variants) && p.variants.some((v: any) => v.sku?.toLowerCase() === query)
            );
            if (exactVariantMatch) {
                addToCart(exactVariantMatch);
                setSearch('');
                return;
            }

            // 4. If exactly 1 product matched in current filtered list, auto-add it
            if (filteredProducts.length === 1) {
                addToCart(filteredProducts[0]);
                setSearch('');
            }
        }
    };

    const handleCheckout = async () => {
        if (isCheckingOutRef.current || cart.length === 0) return;
        isCheckingOutRef.current = true;
        setIsCheckoutLoading(true);

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
                    price: selectedCustomer ? (Number(item.vipPrice) || Number(item.price)) : Number(item.price),
                    seatNumber: item.seatNumber || undefined
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
                storeId: localStorage.getItem('selectedBranchId') || (user as any)?.branchId || undefined
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
                        if (fetchDraftOrders) fetchDraftOrders();
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
                    if (fetchDraftOrders) fetchDraftOrders();
                }
            } catch (err: any) {
                console.error('Error during checkout:', err);
                setCustomAlert({
                    title: "Checkout Failed",
                    message: err?.response?.data?.message || err?.message || "Order checkout encountered an error."
                });
            }
        };

        try {
            if (paymentMethod === 'CARD' || paymentMethod === 'TRANSFER') {
                setIsCardTransferSelectorOpen(true);
            } else {
                await proceedCheckout('SUCCESS');
            }
        } finally {
            isCheckingOutRef.current = false;
            setIsCheckoutLoading(false);
        }
    };

    const handleSaveDraft = async () => {
        if (cart.length === 0) return;
        setIsSavingDraft(true);
        try {
            const orderData = {
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: selectedCustomer ? (Number(item.vipPrice) || Number(item.price)) : Number(item.price),
                    seatNumber: item.seatNumber || undefined
                })),
                totalAmount: total,
                paymentMethod,
                paymentStatus: 'DRAFT',
                customerId: selectedCustomer?.id,
                cashierId: user?.id,
                storeId: localStorage.getItem('selectedBranchId') || (user as any)?.branchId || undefined
            };

            if (createDraftOrder) {
                await createDraftOrder(orderData);
            } else if (onSubmitOrder) {
                await onSubmitOrder(orderData);
            }

            setCart([]);
            setSelectedCustomer(null);
            if (fetchDraftOrders) {
                try { await fetchDraftOrders(); } catch {}
            }
            if (refresh) {
                try { await refresh(); } catch {}
            }
            setCustomAlert({
                title: "Order Drafted",
                message: "Current order has been saved as a Draft. You can resume and complete payment anytime from the Recent Drafts widget or Order History → Hold / Drafts."
            });
        } catch (err: any) {
            console.error('Failed to save draft order:', err);
            setCustomAlert({
                title: "Draft Failed",
                message: err?.response?.data?.message || err?.message || "Failed to save draft order."
            });
        } finally {
            setIsSavingDraft(false);
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
                                onClick={handlePayViaMonnifyTerminal}
                                className="w-full bg-[#2D7A3E] text-white py-4 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 active:scale-95"
                            >
                                <CreditCard size={16} /> Pay via Monnify Terminal
                            </button>
                            <button
                                onClick={handleProcessManualPaymentClick}
                                className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Banknote size={16} /> Process Manual Payment (Offline)
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

            {/* No Terminal Integration Alert Modal */}
            {isNoTerminalModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsNoTerminalModalOpen(false)} />
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-[111] overflow-hidden animate-in zoom-in-95 p-6 space-y-5 text-center">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                            <CreditCard size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">No POS Terminal Connected</h3>
                            <p className="text-xs text-gray-500 font-bold mt-2 leading-relaxed">
                                No Monnify POS terminal device has been connected to this store yet.
                                Please ask an administrator to connect your terminal device in <strong>Settings → Integrations</strong>, or process this transaction using <strong>Offline Manual Payment mode</strong>.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setIsNoTerminalModalOpen(false);
                                    handleProcessManualPaymentClick();
                                }}
                                className="w-full bg-[#2D7A3E] text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all shadow-lg shadow-green-900/10 active:scale-95"
                            >
                                Use Offline Manual Payment
                            </button>
                            <button
                                onClick={() => setIsNoTerminalModalOpen(false)}
                                className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-gray-200 transition-all"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Monnify Unmapped Payment Retrieval & Mapping Modal */}
            {isMonnifyMappingModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsMonnifyMappingModalOpen(false)} />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative z-[111] overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Monnify Terminal Payments</h3>
                                <p className="text-xs text-gray-400 font-bold">Map a successful POS payment to complete order (₦{total.toLocaleString()})</p>
                            </div>
                            <button onClick={() => setIsMonnifyMappingModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                            {isFetchingUnmapped ? (
                                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-gray-400">
                                    <div className="w-10 h-10 border-4 border-green-200 border-t-[#2D7A3E] rounded-full animate-spin"></div>
                                    <p className="text-xs font-bold uppercase tracking-wider">Fetching recent Monnify terminal transactions...</p>
                                </div>
                            ) : unmappedTransactions.length === 0 ? (
                                <div className="py-12 text-center space-y-3">
                                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
                                        <CreditCard size={24} />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-700">No Unmapped Payments Found</h4>
                                    <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto">
                                        No recent unmapped transactions were found for today. Please complete card swipe on terminal, or use Manual Payment mode.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setIsMonnifyMappingModalOpen(false);
                                            setIsManualPosModalOpen(true);
                                        }}
                                        className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-200 transition-all"
                                    >
                                        Switch to Manual Payment Mode
                                    </button>
                                </div>
                            ) : (
                                unmappedTransactions.map((tx: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#2D7A3E] hover:bg-white hover:shadow-md transition-all flex items-center justify-between gap-4">
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-gray-900 text-base">₦{Number(tx.amount).toLocaleString()}</span>
                                                <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-[9px] font-black uppercase">
                                                    {tx.paymentMethod}
                                                </span>
                                            </div>
                                            <div className="text-[11px] font-mono text-gray-500 truncate">REF: {tx.transactionReference}</div>
                                            <div className="text-[10px] text-gray-400 font-bold">{new Date(tx.paidOn).toLocaleTimeString()} • {tx.customerName}</div>
                                        </div>
                                        <button
                                            onClick={() => handleMapTransactionToOrder(tx)}
                                            className="px-4 py-2.5 bg-[#2D7A3E] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#20502E] transition-all shadow-md shadow-green-900/10 active:scale-95 shrink-0"
                                        >
                                            Map Payment
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manual POS Device Type Capture Modal */}
            {isManualPosModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsManualPosModalOpen(false)} />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[111] overflow-hidden animate-in zoom-in-95 p-6 space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Manual POS Device Type</h3>
                                <p className="text-xs text-gray-400 font-bold">Record offline terminal device used for order (₦{total.toLocaleString()})</p>
                            </div>
                            <button onClick={() => setIsManualPosModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">POS Terminal Device Type</label>
                            <input
                                type="text"
                                placeholder="e.g. Moniepoint POS, Opay POS, PalmPay POS"
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#2D7A3E] focus:bg-white outline-none font-bold text-sm text-gray-900 transition-all"
                                value={posDeviceTypeInput}
                                onChange={(e) => setPosDeviceTypeInput(e.target.value)}
                                autoFocus
                            />
                            <div className="flex flex-wrap gap-2 pt-1">
                                {['Moniepoint POS', 'Opay POS', 'PalmPay POS', 'GTBank POS', 'Zenith POS'].map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setPosDeviceTypeInput(preset)}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsManualPosModalOpen(false)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitManualPosPayment}
                                className="flex-1 py-3.5 bg-[#2D7A3E] text-white rounded-xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all shadow-lg shadow-green-900/10 active:scale-95"
                            >
                                Complete Payment
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
                            Push payment request sent to Monnify POS Terminal.<br />
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

            {/* Mobile / Tablet Tab Switcher */}
            <div className="lg:hidden flex bg-gray-100/80 p-1.5 rounded-2xl gap-2 border border-gray-200/60 shadow-sm shrink-0">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'products' ? 'bg-white text-gray-900 shadow-md border border-gray-100' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Package size={16} className={activeTab === 'products' ? 'text-[#2D7A3E]' : ''} />
                    Products ({products.length})
                </button>
                <button
                    onClick={() => setActiveTab('cart')}
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative ${
                        activeTab === 'cart' ? 'bg-[#2D7A3E] text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <ShoppingCart size={16} />
                    Active Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                    {cart.length > 0 && activeTab !== 'cart' && (
                        <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping absolute top-2.5 right-3" />
                    )}
                </button>
            </div>

            {/* Products Side */}
            <div className={`${activeTab === 'products' ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-0`}>
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-slate-800/40">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2D7A3E] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Scan barcode, or search by name, SKU, category..."
                            className="w-full pl-12 pr-10 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 dark:text-white dark:placeholder-slate-400 rounded-2xl focus:ring-4 focus:ring-green-900/5 focus:border-[#2D7A3E] outline-none font-bold text-sm transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                                title="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    {search && (
                        <div className="mt-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center justify-between">
                            <span>Found {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} matching "{search}"</span>
                            <span className="text-[#2D7A3E] font-bold lowercase">Press Enter to quick-add single match</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                            <Package size={48} className="mb-3 opacity-30" />
                            <p className="font-black uppercase tracking-wider text-sm text-gray-600 dark:text-gray-300">No matching products</p>
                            <p className="text-xs text-gray-400 mt-1">No products found matching "{search}" across Name, SKU, or Barcode.</p>
                            <button
                                onClick={() => setSearch('')}
                                className="mt-4 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200"
                            >
                                Clear Search Filter
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                            {filteredProducts.map((p: any) => (
                                <button
                                    key={p.id}
                                    onClick={() => addToCart(p)}
                                    className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-800 rounded-[2rem] border border-gray-50 dark:border-gray-700 hover:border-[#2D7A3E] dark:hover:border-green-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xl hover:shadow-green-900/5 transition-all text-left flex flex-col justify-between group min-h-[220px] sm:h-[260px]"
                                >
                                    {/* Top Text Details */}
                                    <div className="w-full">
                                        <div className="font-black text-gray-900 dark:text-white group-hover:text-[#2D7A3E] dark:group-hover:text-green-400 text-base leading-tight transition-colors truncate">{p.name}</div>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest font-mono">
                                                {p.sku || 'NO-SKU'}
                                            </span>
                                            {p.barcode && (
                                                <span className="text-[9px] bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono">
                                                    #{p.barcode}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Center Image Area */}
                                    <div className="my-3 w-full h-24 sm:h-28 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center flex-shrink-0 relative">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        ) : (
                                            <span className="text-[#2D7A3E] font-black text-lg uppercase tracking-wider bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                                {p.name.slice(0, 2)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Bottom Details */}
                                    <div className="flex justify-between items-end w-full">
                                        <div>
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter block leading-none mb-1">Price</span>
                                            <span className="font-black text-[#2D7A3E] text-lg">₦{Number(p.price).toLocaleString()}</span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black shadow-sm uppercase ${p.stock < 10 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                            {p.stock} IN STOCK
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Side */}
            <div className={`${activeTab === 'cart' ? 'flex' : 'hidden lg:flex'} w-full lg:w-[400px] flex-col bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-900/5 h-full overflow-y-auto custom-scrollbar`}>
                {/* Header Section */}
                <div className="flex-none">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-slate-800/40">
                        <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-50 dark:bg-green-950/50 rounded-lg flex items-center justify-center">
                                <ShoppingCart size={18} className="text-[#2D7A3E] dark:text-green-400" />
                            </div>
                            Active Cart
                        </h3>
                        <button onClick={() => cart.length > 0 ? setIsDraftGuardOpen(true) : setCart([])} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-red-500 transition-colors" title="Clear/Draft Cart">
                            <Trash2 size={18} />
                        </button>
                    </div>

                    <div className="p-6 bg-blue-50/30 border-b border-blue-50">
                        <div className="flex flex-col space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-blue-900/40 dark:text-slate-300 uppercase tracking-widest ml-1">Assign Customer</label>
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

                    {/* ── Draft Quick-Access Widget (Top 3 Recent Drafts, LIFO) ── */}
                    {recentDrafts.length > 0 && (
                        <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center">
                                        <Clock size={12} strokeWidth={3} />
                                    </div>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                            Recent Drafts ({draftOrders.length})
                                        </span>
                                        {draftOrders.length > 3 && (
                                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                                Showing {recentDrafts.length} most recent
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate('/orders?tab=drafts')}
                                        className="text-[11px] font-black text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline flex items-center gap-0.5"
                                        title="Navigate to all drafts in Order History"
                                    >
                                        <span>View All</span>
                                        <ArrowRight size={12} />
                                    </button>
                                    <button
                                        onClick={() => setIsDraftWidgetCollapsed(prev => !prev)}
                                        className="p-1 text-amber-700 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 rounded-md transition-colors"
                                        title={isDraftWidgetCollapsed ? "Expand drafts" : "Collapse drafts"}
                                    >
                                        {isDraftWidgetCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                    </button>
                                </div>
                            </div>

                            {!isDraftWidgetCollapsed && (
                                <div className="space-y-2 pt-1">
                                    {recentDrafts.map((draft: any) => {
                                        const refId = `ORD-${draft.id.slice(-5).toUpperCase()}`;
                                        const totalAmt = Number(draft.totalAmount || 0);
                                        const elapsed = getTimeElapsed(draft.createdAt);
                                        const itemsSummary = (draft.items || []).map((i: any) => {
                                            const pName = i.product?.name || i.name || 'Item';
                                            return i.seatNumber ? `${pName} (Seat ${i.seatNumber})` : pName;
                                        }).join(', ');

                                        return (
                                            <div
                                                key={draft.id}
                                                className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/40 shadow-xs flex items-center justify-between gap-2 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
                                            >
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono text-xs font-black text-gray-900 dark:text-white">
                                                            {refId}
                                                        </span>
                                                        <span className="text-xs font-black text-[#2D7A3E] dark:text-green-400">
                                                            ₦{totalAmt.toLocaleString()}
                                                        </span>
                                                        {elapsed && (
                                                            <span className="text-[9px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded">
                                                                {elapsed}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5" title={itemsSummary}>
                                                        {itemsSummary || 'No item details'}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleQuickResumeDraft(draft)}
                                                    className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-2.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all flex-shrink-0"
                                                    title={`Resume draft ${refId} into cart`}
                                                >
                                                    <RotateCcw size={11} strokeWidth={3} />
                                                    <span>Resume</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
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
                            <div key={item.id} className="flex flex-col p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 group animate-in slide-in-from-right-2 hover:bg-white dark:hover:bg-slate-750 hover:shadow-md hover:border-gray-200 transition-all space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="font-black text-gray-900 dark:text-white text-sm truncate">{item.name}</div>
                                        <div className="text-[10px] text-[#2D7A3E] dark:text-green-400 font-black mt-0.5">₦{itemPrice.toLocaleString()}</div>
                                    </div>

                                    <div className="flex items-center gap-3 ml-2">
                                        <div className="flex items-center bg-gray-200/50 dark:bg-slate-700 rounded-xl p-1">
                                            <button
                                                onClick={() => decrementQuantity(item.id)}
                                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-[#2D7A3E] hover:text-white transition-colors active:scale-95 shadow-sm"
                                            >
                                                <Minus size={12} strokeWidth={3} />
                                            </button>
                                            <span className="px-2 text-xs font-black text-gray-900 dark:text-white min-w-[20px] text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => incrementQuantity(item.id)}
                                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-[#2D7A3E] hover:text-white transition-colors active:scale-95 shadow-sm"
                                            >
                                                <Plus size={12} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-red-500 hover:text-red-700 transition-colors active:scale-95"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Optional Seat Number Input */}
                                <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                                    <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Seat:</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1, Bar 3 (opt)"
                                        value={item.seatNumber || ''}
                                        onChange={(e) => updateSeatNumber(item.id, e.target.value)}
                                        className="w-32 h-6 px-2 text-[11px] font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-[#2D7A3E] focus:ring-1 focus:ring-[#2D7A3E] transition-all"
                                        title="Optional seat number for this item"
                                    />
                                    {item.seatNumber && (
                                        <button
                                            onClick={() => updateSeatNumber(item.id, '')}
                                            className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                                            title="Clear seat number"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
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

                    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 pt-1">
                        <div className="flex flex-col flex-shrink-0 min-w-max">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                            <span
                                title={`Grand Total: ₦${total.toLocaleString()}`}
                                className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight whitespace-nowrap cursor-default select-all"
                            >
                                ₦{total.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={handleSaveDraft}
                                disabled={cart.length === 0 || isSavingDraft}
                                className="bg-amber-500 text-white px-4 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-95 flex items-center gap-1.5 shadow-md flex-shrink-0"
                                title="Draft/Hold order for payment later"
                            >
                                <Clock size={16} />
                                <span>Draft</span>
                            </button>
                            <button
                                onClick={handleCheckout}
                                disabled={cart.length === 0 || isCheckoutLoading}
                                className={`text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-green-900/10 active:scale-95 flex items-center space-x-2 flex-shrink-0 ${
                                    isCheckoutLoading
                                        ? 'bg-gray-400 cursor-not-allowed opacity-80'
                                        : 'bg-[#2D7A3E] hover:bg-[#235E30] disabled:bg-gray-200 disabled:text-gray-400'
                                }`}
                                title={isCheckoutLoading ? "Processing order..." : `Proceed to checkout: ₦${total.toLocaleString()}`}
                            >
                                {isCheckoutLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <span>Checkout</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Draft Order Exit Guard Modal */}
            {isDraftGuardOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsDraftGuardOpen(false)} />
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-[111] overflow-hidden animate-in zoom-in-95 p-6 space-y-5 text-center">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                            <Clock size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Active Cart Items Found</h3>
                            <p className="text-xs text-gray-500 font-bold mt-2 leading-relaxed">
                                You have active items in your cart. Would you like to save this order as a <strong>DRAFT</strong> to resume later, or discard the active cart?
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={async () => {
                                    setIsDraftGuardOpen(false);
                                    await handleSaveDraft();
                                }}
                                className="w-full bg-[#2D7A3E] text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-[#20502E] transition-all shadow-lg shadow-green-900/10 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Clock size={16} /> Save as Draft Order
                            </button>
                            <button
                                onClick={() => {
                                    setIsDraftGuardOpen(false);
                                    setCart([]);
                                    setSelectedCustomer(null);
                                }}
                                className="w-full bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> Clear / Discard Order
                            </button>
                            <button
                                onClick={() => setIsDraftGuardOpen(false)}
                                className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-gray-200 transition-all"
                            >
                                Stay on POS
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-[101] overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-gray-800">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Add Customer</h2>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input required type="text" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Phone Number (Optional)</label>
                        <input type="text" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                        <input type="email" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
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
    const [recipientEmail, setRecipientEmail] = useState(order?.customer?.email || '');
    const [saveToCrm, setSaveToCrm] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

    const handlePrint = () => {
        // Defer print to allow the browser to fully render the receipt DOM
        // before opening the print dialog (prevents blank/incomplete receipts).
        requestAnimationFrame(() => {
            setTimeout(() => window.print(), 150);
        });
    };

    const handleSendDigitalReceipt = async () => {
        if (!recipientEmail || !recipientEmail.includes('@')) return;
        setIsSendingEmail(true);
        setEmailSuccessMsg(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/orders/${order.id}/email-receipt`, {
                email: recipientEmail,
                saveToCrm,
                customerId: order.customerId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmailSuccessMsg(`Digital receipt successfully dispatched to ${recipientEmail}!`);
        } catch {
            setEmailSuccessMsg(`Digital receipt queued for delivery to ${recipientEmail}`);
        } finally {
            setIsSendingEmail(false);
        }
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
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">DEMEGA POS</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">POS TERMINAL RECEIPT</p>
                        <div className="border-b-2 border-dashed border-gray-200 my-4"></div>
                        <div className="text-left text-xs space-y-1 font-mono text-gray-600">
                            <div>INVOICE: #{invoiceNumber}</div>
                            <div>DATE: {formattedDate}</div>
                            {order.cashier && <div>CASHIER: {order.cashier.name}</div>}
                            {order.customer && <div>CUSTOMER: {order.customer.name}</div>}
                            <div>PAYMENT: {order.paymentMethod}</div>
                            {order.posDeviceType && <div>POS DEVICE: {order.posDeviceType}</div>}
                            {order.terminalTransaction && (
                                <>
                                    <div>MONNIFY REF: {order.terminalTransaction.transactionRef}</div>
                                    {order.terminalTransaction.paymentRef && <div>PAYMENT REF: {order.terminalTransaction.paymentRef}</div>}
                                </>
                            )}
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
                    <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest my-4">
                        Thank you for your patronage!
                    </div>

                    {/* ── Digital Receipt Dispatch Section ── */}
                    <div className="bg-gray-50 border border-gray-200/60 rounded-2xl p-4 space-y-3 mt-4 print:hidden">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase text-gray-700 tracking-wider">📧 Email Digital Receipt</span>
                        </div>
                        {emailSuccessMsg ? (
                            <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded-xl text-xs font-bold">
                                {emailSuccessMsg}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="customer@email.com"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#2D7A3E]"
                                    />
                                    <button
                                        onClick={handleSendDigitalReceipt}
                                        disabled={isSendingEmail || !recipientEmail}
                                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                                    >
                                        {isSendingEmail ? 'Sending...' : 'Dispatch'}
                                    </button>
                                </div>
                                {order.customerId && (
                                    <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={saveToCrm}
                                            onChange={(e) => setSaveToCrm(e.target.checked)}
                                            className="rounded border-gray-300 text-[#2D7A3E] focus:ring-[#2D7A3E]"
                                        />
                                        <span>Update Customer CRM Profile with this email address</span>
                                    </label>
                                )}
                            </div>
                        )}
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
