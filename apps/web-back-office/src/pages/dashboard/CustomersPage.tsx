import React, { useState } from 'react';
import { CustomersView, EditCustomerModal } from '../../components/PeopleComponents';
import { AddCustomerModal } from '../../components/POSView';
import { CustomConfirmModal, CustomAlertModal } from '../../components/InventoryComponents';
import axios from 'axios';
import { API_URL } from '../../lib/apiConfig';




interface CustomersPageProps {
    customers: any[];
    isLoading: boolean;
    refresh: () => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ customers, isLoading, refresh }) => {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

    const handleEdit = (customer: any) => {
        setSelectedCustomer(customer);
        setIsEditOpen(true);
    };

    const handleDelete = async (customerId: string) => {
        setCustomConfirm({
            message: "Are you sure you want to remove this customer? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/customers/${customerId}`, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    refresh();
                } catch (error: any) {
                    console.error("Error deleting customer:", error);
                    setCustomAlert({
                        title: "Deauthorization Error",
                        message: error?.response?.data?.message || "Failed to delete customer. Please try again."
                    });
                }
            }
        });
    };

    return (
        <div className="animate-in fade-in duration-500 relative h-full">
            {isAddOpen && (
                <AddCustomerModal
                    onClose={() => setIsAddOpen(false)}
                    onSuccess={() => { setIsAddOpen(false); refresh(); }}
                />
            )}
            <CustomersView
                customers={customers}
                isLoading={isLoading}
                onAdd={() => setIsAddOpen(true)}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
            
            <EditCustomerModal
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false);
                    setSelectedCustomer(null);
                }}
                onSuccess={() => {
                    refresh();
                    setIsEditOpen(false);
                    setSelectedCustomer(null);
                }}
                customerData={selectedCustomer}
            />

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

export default CustomersPage;
