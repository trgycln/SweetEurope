// src/components/portal/numune-button-client.tsx (Vollständig Aktualisiert)
'use client';
import { useTransition, useState } from "react";
import { createNumuneTalepAction } from "@/app/actions/numune-actions";
import { FiSend, FiCheckCircle, FiLoader } from "react-icons/fi";
import { toast } from "sonner"; // Sonner für Feedback

interface NumuneButtonClientProps {
    urunId: string;
    firmaId: string; // Benötigt, um an die Action übergeben zu werden
    hatBereitsAngefragt: boolean;
    // Props für Texte aus dem Dictionary (wie von dir gewünscht)
    requestText: string;
    requestedText: string;
    sendingText?: string;
}

export function NumuneButtonClient({
    urunId,
    firmaId,
    hatBereitsAngefragt,
    requestText,
    requestedText,
    sendingText = "Wird gesendet..." // Fallback
}: NumuneButtonClientProps) {
    const [isPending, startTransition] = useTransition();
    const [submitted, setSubmitted] = useState(hatBereitsAngefragt);

    const handleClick = () => {
        startTransition(async () => {
            // KORREKTUR: firmaId an die Action übergeben
            const result = await createNumuneTalepAction(urunId, firmaId);
            
            if (result.success) {
                toast.success(result.message || "Anfrage erfolgreich gesendet!");
                setSubmitted(true);
            } else {
                // Zeige die Fehlermeldung vom Server
                toast.error(result.error || "Ein unbekannter Fehler ist aufgetreten.");
            }
        });
    };

    if (submitted) {
        return (
            // Bereits angefragt (kleiner, informativer Stil)
            <div className="flex items-center justify-center gap-2 p-3 bg-green-100 text-green-800 rounded-lg font-bold text-sm">
                <FiCheckCircle />
                {/* KORREKTUR: Text aus Props verwenden */}
                {requestedText}
            </div>
        );
    }

    return (
        // Button zum Anfragen (kleinerer Stil)
        <button
            onClick={handleClick}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent border-2 border-accent text-accent rounded-lg shadow-sm hover:bg-accent hover:text-white transition-all font-bold text-sm w-full disabled:opacity-50"
        >
            {isPending ? <FiLoader className="animate-spin" /> : <FiSend />}
            {/* KORREKTUR: Text aus Props verwenden */}
            {isPending ? sendingText : requestText}
        </button>
    );
}