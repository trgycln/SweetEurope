'use client';

import { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import { Tables } from '@/lib/supabase/database.types';
import { createDynamicSupabaseClient } from '@/lib/supabase/client'; // Client-seitigen Supabase Client
import Link from 'next/link';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config'; // Pfad ggf. anpassen
import { formatDate } from '@/lib/utils'; // formatDate importieren

type Bildirim = Tables<'bildirimler'>;

interface NotificationBellProps {
    initialNotifications: Bildirim[];
    initialUnreadCount: number;
    dictionary: Dictionary;
    locale: Locale;
}

export function NotificationBell({ initialNotifications, initialUnreadCount, dictionary, locale }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Bildirim[]>(initialNotifications);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const content = dictionary.notifications || {
        title: "Benachrichtigungen",
        markAllAsRead: "Alle als gelesen markieren",
        noNewNotifications: "Keine neuen Benachrichtigungen.",
        errorLoading: "Fehler beim Laden.",
        viewDetails: "Details ansehen",
    };

    // Klick außerhalb des Dropdowns schließt es
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    // Funktion zum Öffnen/Schließen und Laden (falls leer)
    const toggleDropdown = async () => {
        setIsOpen(!isOpen);
        // Wenn Dropdown geöffnet wird und initial leer war (oder nach Markierung), neu laden
        if (!isOpen && notifications.length === 0 && unreadCount > 0) {
            await fetchNotifications();
        }
    };

    // Funktion zum Nachladen der Benachrichtigungen
    const fetchNotifications = async () => {
        setIsLoading(true);
        const supabase = createDynamicSupabaseClient();
        const { data, error } = await supabase
            .from('bildirimler')
            .select('*')
            .eq('okundu_mu', false)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error("Fehler beim Nachladen:", error);
            toast.error(content.errorLoading);
        } else {
            setNotifications(data || []);
            // Zähler muss hier nicht aktualisiert werden, da nur Ungelesene geholt wurden
        }
        setIsLoading(false);
    };

    // Funktion zum Markieren aller als gelesen
    const markAllRead = async () => {
        if (unreadCount === 0) return; // Nichts zu tun

        setIsLoading(true);
        const supabase = createDynamicSupabaseClient();
        const notificationIds = notifications.map(n => n.id);

        const { error } = await supabase
            .from('bildirimler')
            .update({ okundu_mu: true })
            .eq('okundu_mu', false); // Nur die tatsächlich ungelesenen markieren
            // Optional: .in('id', notificationIds) -> Nur die angezeigten markieren

        if (error) {
            console.error("Fehler beim Markieren als gelesen:", error);
            toast.error("Fehler beim Aktualisieren.");
        } else {
            setNotifications([]); // Liste im Dropdown leeren
            setUnreadCount(0); // Zähler auf 0 setzen
            setIsOpen(false); // Dropdown schließen
        }
        setIsLoading(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                aria-label={content.title}
            >
                <FiBell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 transform -translate-y-1 translate-x-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown-Menü */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                        <div className="px-4 py-2 flex justify-between items-center border-b">
                            <h3 className="text-sm font-semibold text-gray-900">{content.title}</h3>
                            <button
                                onClick={markAllRead}
                                disabled={isLoading || unreadCount === 0}
                                className="text-xs text-accent hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {content.markAllAsRead}
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 text-center text-gray-500">Lade...</div>
                            ) : notifications.length > 0 ? (
                                notifications.map((noti) => (
                                    <div key={noti.id} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b last:border-b-0">
                                        <p className="font-medium">{noti.icerik}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-gray-500">
                                                {formatDate(noti.created_at, locale)}
                                            </span>
                                            {noti.link && (
                                                <Link href={noti.link} onClick={() => setIsOpen(false)} className="text-xs text-accent hover:underline">
                                                    {content.viewDetails}
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-500">{content.noNewNotifications}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
