'use client';

import { useOrderSelection } from './OrderSelectionContext';

interface OrderCheckboxProps {
    orderId: string;
}

export default function OrderCheckbox({ orderId }: OrderCheckboxProps) {
    const { isOrderSelected, toggleOrderSelection } = useOrderSelection();
    const isSelected = isOrderSelected(orderId);

    return (
        <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleOrderSelection(orderId)}
            className="w-4 h-4 cursor-pointer rounded border-gray-300 text-accent focus:ring-accent"
        />
    );
}
