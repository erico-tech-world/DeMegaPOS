import { useState } from 'react';
import { InventoryView, AddItemModal, StockAdjustmentModal } from '../../components/InventoryComponents';

interface InventoryPageProps {
    products: any[];
    isLoading: boolean;
    refresh: () => void;
}

const InventoryPage = ({ products, isLoading, refresh }: InventoryPageProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const handleAdjustStock = (product: any) => {
        setSelectedProduct(product);
        setIsAdjustModalOpen(true);
    };

    return (
        <div className="animate-in fade-in duration-500">
            <InventoryView
                items={products}
                isLoading={isLoading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onAddItem={() => setIsAddModalOpen(true)}
                onAdjustStock={handleAdjustStock}
            />

            <AddItemModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={refresh}
            />

            <StockAdjustmentModal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
                product={selectedProduct}
                onSuccess={refresh}
            />
        </div>
    );
};

export default InventoryPage;
