// src/components/portal/numune-button-client.tsx
'use client';
import { useTransition, useState } from "react";
import { createNumuneTalepAction } from "@/app/actions/numune-actions";
import { FiSend, FiCheckCircle } from "react-icons/fi";

export function NumuneButtonClient({ urunId, hatBereitsAngefragt }: { urunId: string, hatBereitsAngefragt: boolean }) {
    const [isPending, startTransition] = useTransition();
    const [submitted, setSubmitted] = useState(hatBereitsAngefragt);

    const handleClick = () => {
        startTransition(async () => {
            const result = await createNumuneTalepAction(urunId);
            if (result?.error) {
                alert(result.error);
            } else {
                setSubmitted(true);
            }
        });
    };

    if (submitted) {
        return (
            <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-lg font-bold">
                <FiCheckCircle /> Numune Talebi Alındı
            </div>
        );
    }

    return (
        <button onClick={handleClick} disabled={isPending} className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold w-full">
            <FiSend /> {isPending ? "Gönderiliyor..." : "Numune İste"}
        </button>
    );
}