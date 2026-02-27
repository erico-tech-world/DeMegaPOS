import { useState } from 'react';
import { StaffView, InviteStaffModal } from '../../components/PeopleComponents';

interface StaffPageProps {
    staff: any[];
    isLoading: boolean;
    refresh: () => void;
}

const StaffPage = ({ staff, isLoading, refresh }: StaffPageProps) => {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    return (
        <div className="animate-in fade-in duration-500">
            <StaffView
                staff={staff}
                isLoading={isLoading}
                onInvite={() => setIsInviteModalOpen(true)}
            />

            <InviteStaffModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={refresh}
            />
        </div>
    );
};

export default StaffPage;
