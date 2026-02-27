import React from 'react';
import { CustomersView } from '../../components/PeopleComponents';

interface CustomersPageProps {
    customers: any[];
    isLoading: boolean;
    refresh: () => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ customers, isLoading }) => {
    return (
        <div className="animate-in fade-in duration-500">
            <CustomersView
                customers={customers}
                isLoading={isLoading}
                onAdd={() => alert('Add customer logic here')}
            />
        </div>
    );
};

export default CustomersPage;
