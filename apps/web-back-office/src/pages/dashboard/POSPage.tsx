import { useLocation } from 'react-router-dom';
import { POSView } from '../../components/POSView';

interface POSPageProps {
    products: any[];
    customers: any[];
    onSubmitOrder: (orderData: any) => Promise<any>;
    createDraftOrder?: (orderData: any) => Promise<any>;
    draftOrders?: any[];
    fetchDraftOrders?: () => Promise<any>;
    cancelDraftOrder?: (id: string) => Promise<void>;
    lockDraftOrder?: (id: string) => Promise<any>;
    refresh: () => Promise<void>;
}

const POSPage = ({
    products,
    customers,
    onSubmitOrder,
    createDraftOrder,
    draftOrders = [],
    fetchDraftOrders,
    cancelDraftOrder,
    lockDraftOrder,
    refresh
}: POSPageProps) => {
    const location = useLocation();
    const resumedDraft = (location.state as any)?.resumedDraft;

    return (
        <div className="h-auto sm:h-[calc(100vh-140px)] min-h-[500px] flex flex-col">
            <POSView
                products={products}
                customers={customers}
                onSubmitOrder={onSubmitOrder}
                createDraftOrder={createDraftOrder}
                draftOrders={draftOrders}
                fetchDraftOrders={fetchDraftOrders}
                cancelDraftOrder={cancelDraftOrder}
                lockDraftOrder={lockDraftOrder}
                refresh={refresh}
                resumedDraft={resumedDraft}
            />
        </div>
    );
};

export default POSPage;
