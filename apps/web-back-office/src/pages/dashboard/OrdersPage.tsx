import { OrdersView } from '../../components/DashboardComponents';

interface OrdersPageProps {
    orders: any[];
    isLoading: boolean;
}

const OrdersPage = ({ orders, isLoading }: OrdersPageProps) => {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Transaction Archives</h3>
                <OrdersView orders={orders} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default OrdersPage;
