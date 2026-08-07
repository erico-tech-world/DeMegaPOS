import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { InventoryView, AddItemModal, EditItemModal, StockAdjustmentModal, CustomAlertModal, CustomConfirmModal, CategoriesView } from '../../components/InventoryComponents';
import axios from 'axios';
import { API_URL } from '../../lib/apiConfig';
import { Package, Tag } from 'lucide-react';

interface InventoryPageProps {
    products: any[];
    isLoading: boolean;
    refresh: () => void;
}

const InventoryPage = ({ products, isLoading, refresh }: InventoryPageProps) => {
    const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const highlightId = queryParams.get('productId');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleAdjustStock = (product: any) => {
        setSelectedProduct(product);
        setIsAdjustModalOpen(true);
    };

    const handleEdit = (product: any) => {
        setSelectedProduct(product);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (productId: string) => {
        setCustomConfirm({
            message: 'Are you sure you want to delete this product? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/inventory/products/${productId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    refresh();
                } catch (error: any) {
                    console.error('Failed to delete product:', error);
                    setCustomAlert({
                        title: 'Delete Failed',
                        message: error?.response?.data?.message || 'Failed to delete product. It might be linked to existing sales orders.'
                    });
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 gap-2">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex items-center gap-2 px-6 py-3 font-black text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeTab === 'products'
                            ? 'border-[#2D7A3E] text-[#2D7A3E] dark:text-green-400 bg-green-50/50 dark:bg-green-950/30 rounded-t-2xl'
                            : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    <Package size={16} /> Products Directory
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`flex items-center gap-2 px-6 py-3 font-black text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeTab === 'categories'
                            ? 'border-[#2D7A3E] text-[#2D7A3E] dark:text-green-400 bg-green-50/50 dark:bg-green-950/30 rounded-t-2xl'
                            : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    <Tag size={16} /> Categories &amp; Tags
                </button>
            </div>

            {activeTab === 'products' ? (
                <>
                    <InventoryView
                        items={products}
                        isLoading={isLoading}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onAddItem={() => setIsAddModalOpen(true)}
                        onAdjustStock={handleAdjustStock}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        highlightId={highlightId}
                    />

                    <AddItemModal
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onSuccess={refresh}
                    />

                    <EditItemModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        product={selectedProduct}
                        onSuccess={refresh}
                    />

                    <StockAdjustmentModal
                        isOpen={isAdjustModalOpen}
                        onClose={() => setIsAdjustModalOpen(false)}
                        product={selectedProduct}
                        onSuccess={refresh}
                    />
                </>
            ) : (
                <CategoriesView products={products} refreshProducts={refresh} />
            )}

            {customConfirm && (
                <CustomConfirmModal
                    message={customConfirm.message}
                    onConfirm={customConfirm.onConfirm}
                    onClose={() => setCustomConfirm(null)}
                />
            )}

            {customAlert && (
                <CustomAlertModal
                    title={customAlert.title}
                    message={customAlert.message}
                    onClose={() => setCustomAlert(null)}
                />
            )}
        </div>
    );
};

export default InventoryPage;
