import { useState, useEffect } from 'react';
import { ShoppingCart, Search, LayoutGrid, User, Settings, LogOut, X, CreditCard, Banknote, History, Menu, Plus, Minus, Trash2 } from 'lucide-react';
import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const { protocol, hostname, port } = window.location;
    if (hostname.startsWith('pos.')) return `${protocol}//${hostname.replace(/^pos\./, 'api.')}`;
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }
  return 'http://localhost:3000';
};
const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  return getApiUrl().replace(/^http/, 'ws') + '/ws';
};
const API_URL = getApiUrl();
const WS_URL = getWsUrl();

const App = () => {
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ product: any, qty: number }[]>([]);
  const [search, setSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();

    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'PRODUCT_CREATED' || data.event === 'STOCK_UPDATED' || data.event === 'ORDER_CREATED') {
          fetchProducts();
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    };
    return () => ws.close();
  }, []);

  const fetchCustomers = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found. Fetch aborted.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/inventory/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products from live API:', err);
      // Removed hardcoded fallback to ensure data integrity is enforced
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string | number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQty = (productId: string | number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }).filter(item => item.qty > 0)); // Ensure we remove if qty drops to 0 just in case, though the above logic prevents it
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckoutProcessing(true);
    try {
      // Mocking order creation to backend
      const orderData = {
        items: cart.map(i => ({ productId: i.product.id, quantity: i.qty, price: selectedCustomer ? (i.product.vipPrice || i.product.price) : i.product.price })),
        totalAmount: total,
        paymentMethod: 'CASH',
        customerId: selectedCustomer?.id
      };
      await axios.post(`${API_URL}/orders`, orderData);
      alert('Order completed successfully!');
      setCart([]);
      setIsCartOpen(false);
      fetchProducts(); // Refresh stock
    } catch (err) {
      console.error('Checkout failed:', err);
      alert('Checkout failed. Please check backend connection.');
    } finally {
      setIsCheckoutProcessing(false);
    }
  };

  const total = cart.reduce((acc, item) => acc + (selectedCustomer ? (item.product.vipPrice || item.product.price) : item.product.price) * item.qty, 0);

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50 text-slate-900 font-inter overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-20 bg-white border-r border-gray-200 flex-col items-center py-6 gap-8 shadow-sm">
        <div className="flex items-center gap-2 px-2 py-4 border-b border-gray-100 w-full justify-center">
          <button onClick={() => setActiveTab('pos')} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm relative overflow-hidden group hover:scale-105 transition-transform duration-300">
            <img src="/logo.png" alt="DeMega Logo" className="w-10 h-10 object-contain" />
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-6">
          <button
            onClick={() => setActiveTab('pos')}
            className={`p-3 rounded-xl transition-all cursor-pointer ${activeTab === 'pos' ? 'bg-green-50 text-[#2D7A3E]' : 'text-gray-400 hover:text-[#2D7A3E] hover:bg-gray-50'}`}
          >
            <LayoutGrid size={24} />
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`p-3 rounded-xl transition-all cursor-pointer ${activeTab === 'orders' ? 'bg-green-50 text-[#2D7A3E]' : 'text-gray-400 hover:text-[#2D7A3E] hover:bg-gray-50'}`}
          >
            <History size={24} />
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`p-3 rounded-xl transition-all cursor-pointer ${activeTab === 'customers' ? 'bg-green-50 text-[#2D7A3E]' : 'text-gray-400 hover:text-[#2D7A3E] hover:bg-gray-50'}`}
          >
            <User size={24} />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-3 rounded-xl transition-all cursor-pointer ${activeTab === 'settings' ? 'bg-green-50 text-[#2D7A3E]' : 'text-gray-400 hover:text-[#2D7A3E] hover:bg-gray-50'}`}
          >
            <Settings size={24} />
          </button>
        </nav>
        <button className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"><LogOut size={24} /></button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-90 transition-transform"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <img src="/logo.png" alt="DeMega Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
            <h1 className="text-lg md:text-2xl font-black text-[#2D7A3E] truncate">DeMega POS</h1>
            <span className="hidden sm:inline-block px-2 md:px-3 py-0.5 md:py-1 bg-green-100 text-[#2D7A3E] text-[10px] md:text-xs font-bold rounded-full">LIVE</span>
          </div>

          {/* Add Customer Modal */}
          {isAddCustomerModalOpen && (
            <AddCustomerModal
              onClose={() => setIsAddCustomerModalOpen(false)}
              onSuccess={() => { fetchCustomers(); setIsAddCustomerModalOpen(false); }}
            />
          )}

          <div className="flex-1 max-w-sm md:max-w-md mx-2 md:mx-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full pl-9 pr-4 py-1.5 md:py-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-[#2D7A3E]/30 outline-none text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="md:hidden p-2 relative text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={() => setIsCartOpen(!isCartOpen)}
          >
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#8B1538] text-white text-[10px] font-bold px-1.5 rounded-full ring-2 ring-white">
                {cart.length}
              </span>
            )}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-2xl flex flex-col p-6 animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                  <span className="font-black text-[#2D7A3E]">DeMega POS</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <nav className="flex-1 flex flex-col gap-2">
                {[
                  { id: 'pos', label: 'Terminal', icon: LayoutGrid },
                  { id: 'orders', label: 'Sale History', icon: History },
                  { id: 'customers', label: 'Customers', icon: User },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-4 p-4 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-green-50 text-[#2D7A3E]' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <item.icon size={22} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <button className="flex items-center gap-4 p-4 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-all">
                <LogOut size={22} />
                <span>Sign Out</span>
              </button>
            </aside>
          </div>
        )}

        {activeTab === 'pos' ? (
          <div className="flex-1 p-4 md:p-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6 overflow-y-auto">
            {isLoading ? (
              <div className="col-span-full h-full flex items-center justify-center py-20 text-gray-400 italic">Syncing inventory...</div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 text-left hover:border-[#2D7A3E] hover:shadow-2xl hover:-translate-y-1.5 active:scale-95 transition-all duration-300 group flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-12 -mt-12 group-hover:bg-green-100 transition-colors opacity-50"></div>
                  <div className="flex justify-between items-start mb-2 md:mb-4">
                    <span className="px-1.5 py-0.5 bg-gray-100 text-[10px] font-bold rounded uppercase tracking-wider text-gray-500">{product.category?.name || product.categoryId || product.unit || 'Item'}</span>
                    <span className={`text-[10px] font-bold ${product.stock < 10 ? 'text-red-500' : 'text-slate-400'}`}>Qty: {product.stock}</span>
                  </div>
                  <h3 className="text-sm md:text-xl font-bold mb-0.5 md:mb-1 group-hover:text-[#2D7A3E] transition-colors line-clamp-1">{product.name}</h3>
                  <p className="text-lg md:text-2xl font-black text-slate-800 mt-auto">₦{product.price.toLocaleString()}</p>
                </button>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-gray-400">No products found matching "{search}"</div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <History size={32} className="text-gray-200" />
            </div>
            <h2 className="text-xl font-black capitalize">{activeTab} View</h2>
            <p className="text-sm">Real-time data synchronization in progress.</p>
            <button onClick={() => setActiveTab('pos')} className="mt-6 text-[#2D7A3E] font-bold hover:underline">Back to Terminal</button>
          </div>
        )}

        {/* Floating Cart Button for Mobile */}
        {!isCartOpen && cart.length > 0 && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="md:hidden fixed bottom-6 right-6 bg-[#2D7A3E] text-white p-4 rounded-full shadow-2xl flex items-center justify-center animate-bounce z-40"
          >
            <ShoppingCart size={24} />
          </button>
        )}
      </main>

      {/* Cart Sidebar */}
      <section className={`
        fixed inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-40 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 overflow-y-auto custom-scrollbar
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-4 md:p-8 border-b border-gray-200 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg md:text-2xl font-black flex items-center gap-2">
            <ShoppingCart className="text-[#2D7A3E]" size={20} /> Cart
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-[#2D7A3E] text-white px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold">{cart.length} items</span>
            <button className="md:hidden p-2 text-gray-400 hover:text-gray-600" onClick={() => setIsCartOpen(false)}><X size={20} /></button>
          </div>
        </div>

        <div className="p-4 md:p-6 bg-blue-50/30 border-b border-blue-50/50">
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

        <div className="p-4 md:p-6 space-y-3">
          {cart.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 opacity-50 px-4">
              <ShoppingCart size={48} className="mb-4" />
              <p className="font-bold text-center">Your cart is empty</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex flex-col group bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200 hover:border-[#2D7A3E]/30 transition-all">
                <div className="flex justify-between items-start w-full">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm truncate">{item.product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">₦{item.product.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <p className="font-black text-sm">₦{(item.product.price * item.qty).toLocaleString()}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 bg-white w-fit rounded-lg border border-gray-200 p-1">
                  <button onClick={() => updateCartQty(item.product.id, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors" disabled={item.qty <= 1}>
                    <Minus size={14} />
                  </button>
                  <span className="text-[10px] font-black w-6 text-center">{item.qty}</span>
                  <button onClick={() => updateCartQty(item.product.id, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 md:p-8 border-t border-gray-200 bg-slate-50 mt-auto">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <span className="text-gray-500 font-bold text-base md:text-lg tracking-tight">Total Payable</span>
            <span className="text-2xl md:text-4xl font-black text-[#8B1538] break-all">₦{total.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-200 rounded-xl hover:border-[#2D7A3E] hover:text-[#2D7A3E] transition-all">
              <Banknote size={20} />
              <span className="text-[10px] font-bold">CASH</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-200 rounded-xl hover:border-[#2D7A3E] hover:text-[#2D7A3E] transition-all">
              <CreditCard size={20} />
              <span className="text-[10px] font-bold">TRANSFER</span>
            </button>
          </div>

          <button
            disabled={cart.length === 0 || isCheckoutProcessing}
            onClick={handleCheckout}
            className={`w-full py-4 md:py-5 bg-[#2D7A3E] text-white rounded-xl md:rounded-2xl font-black text-base md:text-xl shadow-lg shadow-green-900/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${isCheckoutProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isCheckoutProcessing ? 'PROCESSING...' : 'COMPLETE SALE'}
          </button>
        </div>
      </section>
    </div>
  );
};

// --- AddCustomerModal Component ---
const AddCustomerModal = ({ onClose, onSuccess }: any) => {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/customers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error('Error creating customer:', err);
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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
            <input required type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
            <input type="email" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#2D7A3E] outline-none font-bold" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
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

export default App;
