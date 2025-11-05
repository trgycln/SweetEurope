'use client';

import { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import { Tables } from '@/lib/supabase/database.types';
import { createDynamicSupabaseClient } from '@/lib/supabase/client'; // Client-seitigen Supabase Client
import Link from 'next/link';
import { Dictionary } from '@/dictionaries';
import { formatDate, Locale as UtilLocale } from '@/lib/utils'; // formatDate importieren
import { toast } from 'sonner';

type Bildirim = Tables<'bildirimler'>;

interface NotificationBellProps {
    initialNotifications: Bildirim[];
    initialUnreadCount: number;
    dictionary: Dictionary;
    locale: UtilLocale;
}

export function NotificationBell({ initialNotifications, initialUnreadCount, dictionary, locale }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Bildirim[]>(initialNotifications);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Supabase client (persist session)
    const supabase = createDynamicSupabaseClient(true);

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

    // User ermitteln und Realtime-Subscription setzen
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;
        (async () => {
            const { data: auth } = await supabase.auth.getUser();
            const uid = auth.user?.id || null;
            setUserId(uid);
            if (!uid) return;

            // Realtime: nur eigene INSERTs dinle (alici_id == uid)
            channel = supabase
                .channel('realtime-bildirimler-admin')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bildirimler',
                    filter: `alici_id=eq.${uid}`
                }, (payload) => {
                    const yeni = payload.new as Bildirim;
                    setNotifications(prev => [yeni, ...prev].slice(0, 10));
                    setUnreadCount(prev => prev + 1);
                    toast.info(content.newNotification || 'Neue Benachrichtigung');
                })
                .subscribe();
        })();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Funktion zum Öffnen/Schließen und Laden (falls leer)
    const toggleDropdown = async () => {
        setIsOpen(!isOpen);
        // Wenn Dropdown geöffnet wird und initial leer war (oder nach Markierung), neu laden
        if (!isOpen && notifications.length === 0) {
            await fetchNotifications();
        }
    };

    // Funktion zum Nachladen der Benachrichtigungen
    const fetchNotifications = async () => {
        setIsLoading(true);
        let uid = userId;
        if (!uid) {
            // Falls Benutzer-ID noch nicht vorhanden ist, hole sie
            const { data: auth } = await supabase.auth.getUser();
            uid = auth.user?.id || null;
            setUserId(uid);
        }
        if (!uid) {
            setIsLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from('bildirimler')
            .select('*')
            .eq('alici_id', uid as string)
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
        let uid = userId;
        if (!uid) {
            const { data: auth } = await supabase.auth.getUser();
            uid = auth.user?.id || null;
            setUserId(uid);
        }
        if (!uid) {
            setIsLoading(false);
            return;
        }

        const { error } = await supabase
            .from('bildirimler')
            .update({ okundu_mu: true })
            .eq('alici_id', uid as string)
            .eq('okundu_mu', false); // Nur eigene ungelesene markieren

        if (error) {
            console.error("Fehler beim Markieren als gelesen:", error);
            toast.error("Fehler beim Aktualisieren.");
        } else {
            setNotifications(prev => prev.map(n => ({ ...n, okundu_mu: true }))); // Update UI
            setUnreadCount(0); // Zähler auf 0 setzen
        }
        setIsLoading(false);
    };

    // Funktion zum Markieren einzelner Benachrichtigung als gelesen
    const markAsRead = async (id: string) => {
        // Optimistic UI update
        setNotifications(prev => {
            const noti = prev.find(n => n.id === id && !n.okundu_mu);
            if (!noti) return prev; // Already read
            
            setUnreadCount(count => Math.max(0, count - 1));
            return prev.map(n => n.id === id ? { ...n, okundu_mu: true } : n);
        });

        const { error } = await supabase
            .from('bildirimler')
            .update({ okundu_mu: true })
            .eq('id', id);

        if (error) {
            console.error("Fehler beim Markieren als gelesen:", error);
            // Rollback
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, okundu_mu: false } : n));
            setUnreadCount(prev => prev + 1);
            toast.error("Fehler beim Aktualisieren.");
        }
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
                                    <div 
                                        key={noti.id} 
                                        className={`block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b last:border-b-0 ${!noti.okundu_mu ? 'bg-blue-50' : ''}`}
                                    >
                                        <p className="font-medium">{noti.icerik}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-gray-500">
                                                {formatDate(noti.created_at, locale)}
                                            </span>
                                            {noti.link && (
                                                <Link
                                                    href={`/${locale}${noti.link}`}
                                                    onClick={() => {
                                                        markAsRead(noti.id);
                                                        setIsOpen(false);
                                                    }}
                                                    className="text-xs text-accent hover:underline"
                                                >
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
