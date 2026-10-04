import { FiLoader } from 'react-icons/fi';

export default function Loading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
            <FiLoader size={36} className="animate-spin text-accent" />
        </div>
    );
}
