import { POSView } from '../../components/POSView';

interface POSPageProps {
    products: any[];
    customers: any[];
    onSubmitOrder: (orderData: any) => Promise<boolean>;
}

const POSPage = ({ products, customers, onSubmitOrder }: POSPageProps) => {
    return (
        <div className="h-[calc(100vh-160px)]">
            <POSView
                products={products}
                customers={customers}
                onSubmitOrder={onSubmitOrder}
            />
        </div>
    );
};

export default POSPage;
