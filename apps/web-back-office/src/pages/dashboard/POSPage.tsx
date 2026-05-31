import { POSView } from '../../components/POSView';

interface POSPageProps {
    products: any[];
    customers: any[];
    onSubmitOrder: (orderData: any) => Promise<any>;
    refresh: () => Promise<void>;
}

const POSPage = ({ products, customers, onSubmitOrder, refresh }: POSPageProps) => {
    return (
        <div className="h-[calc(100vh-160px)]">
            <POSView
                products={products}
                customers={customers}
                onSubmitOrder={onSubmitOrder}
                refresh={refresh}
            />
        </div>
    );
};

export default POSPage;
