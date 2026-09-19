'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp, FaTimes, FaPaperPlane, FaRobot } from 'react-icons/fa';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import { trackContact } from '@/lib/metaPixelEvents';
import { ChatMessage } from '@/lib/ai/types';

interface WhatsAppButtonProps {
  locale?: string;
}

interface LocaleContent {
  tooltip: string;
  headerTitle: string;
  headerSubtitle: string;
  statusOnline: string;
  typicalReplyTime: string;
  greetingText: string;
  placeholder: string;
  sendTooltip: string;
  startChatButton: string;
  quickChips: { label: string; text: string }[];
  defaultMessage: string;
  officialNumberLabel: string;
  aiThinking: string;
  aiBadge: string;
  directWhatsApp: string;
  networkFallback: string;
}

const CONTENT: Record<string, LocaleContent> = {
  de: {
    tooltip: 'Fragen zu Staffelpreisen & Sortiment? Hier beraten lassen!',
    headerTitle: 'Elyson B2B Gastro-Berater',
    headerSubtitle: 'Staffelpreise, Logistik & Rezeptideen',
    statusOnline: 'KI-Berater Aktiv',
    typicalReplyTime: 'Antwortet sofort mit Datenbank-Echtzeitwerten',
    greetingText: 'Guten Tag! 👋 Ich bin Ihr persönlicher B2B-Fachberater bei Elyson Sweets. Wie kann ich Sie bei Staffelpreisen, Koli-Einheiten oder Sortimentsauswahl unterstützen?',
    placeholder: 'Frage zu Staffelpreisen, Koli oder Rezepten stellen...',
    sendTooltip: 'Absenden',
    startChatButton: 'Direkt auf WhatsApp anfragen',
    quickChips: [
      { label: '📦 Staffelpreise & 5+ Koli', text: 'Wie funktioniert der 5+ Kartons Staffelpreis und was spare ich dabei?' },
      { label: '🧁 B2B-Musterpaket (Köln/Bonn)', text: 'Können wir ein kostenloses B2B-Musterpaket für unser Café anfragen?' },
      { label: '🚚 Mindestbestellmenge & Palette', text: 'Was ist die Mindestbestellmenge und wie viele Kartons passen auf eine Palette?' },
    ],
    defaultMessage: 'Hallo ElysonSweets, ich habe eine B2B-Anfrage zu Ihrem Sortiment.',
    officialNumberLabel: 'WhatsApp Business: +49 2203 9899714',
    aiThinking: 'Berater kalkuliert...',
    aiBadge: 'B2B KI-Berater',
    directWhatsApp: 'Mit Außendienst auf WhatsApp fortsetzen',
    networkFallback: 'Gerne verbinde ich Sie für direkte Bestellungen oder individuelle Rabatte mit unserem WhatsApp-Team:',
  },
  tr: {
    tooltip: 'Toptan fiyatlar ve koli adetleri için danışın!',
    headerTitle: 'Elyson B2B Satış Danışmanı',
    headerSubtitle: 'Kademeli Fiyatlar, Koli/Palet & Reçeteler',
    statusOnline: 'AI Danışman Aktif',
    typicalReplyTime: 'Veritabanı anlık verileriyle hemen yanıtlar',
    greetingText: 'Merhaba! 👋 Elyson Sweets B2B Danışmanıyım. Ürünlerimiz, fiyatlar veya sipariş süreçleri hakkında size nasıl yardımcı olabilirim?',
    placeholder: 'Koli, kademeli fiyat veya reçete sorun...',
    sendTooltip: 'Gönder',
    startChatButton: "WhatsApp'tan Doğrudan Ulaşın",
    quickChips: [
      { label: '📦 5+ Koli İndirimi Nedir?', text: '5 koli ve üzeri alımlarda Staffelpreis indirimi nasıl uygulanıyor?' },
      { label: '🧁 Numune Paketi (Köln & Bonn)', text: 'Kafemiz için ücretsiz B2B deneme/numune paketi alabilir miyiz?' },
      { label: '🚚 Minimum Sipariş & Palet', text: 'Minimum sipariş adedi nedir ve bir palette kaç koli var?' },
    ],
    defaultMessage: 'Merhaba ElysonSweets, toptan ürünleriniz hakkında bilgi almak istiyorum.',
    officialNumberLabel: 'WhatsApp Business: +49 2203 9899714',
    aiThinking: 'Danışman yanıt hazırlıyor...',
    aiBadge: 'B2B AI Danışman',
    directWhatsApp: "WhatsApp Yetkilisiyle Görüş",
    networkFallback: 'Doğrudan sipariş, numune talepleri veya sorularınız için WhatsApp ekibimizle hemen görüşebilirsiniz:',
  },
  en: {
    tooltip: 'Questions about wholesale pricing & cases? Ask our advisor!',
    headerTitle: 'Elyson B2B Sales Advisor',
    headerSubtitle: 'Tiered Pricing, Logistics & Recipes',
    statusOnline: 'AI Advisor Active',
    typicalReplyTime: 'Replies instantly with real-time database specs',
    greetingText: 'Hello! 👋 I am your B2B sales and HoReCa consultant at Elyson Sweets. How can I assist you with tiered pricing, case quantities, or product recipes?',
    placeholder: 'Ask about pricing, cases, or recipes...',
    sendTooltip: 'Send',
    startChatButton: 'Inquire directly on WhatsApp',
    quickChips: [
      { label: '📦 5+ Cases Volume Discount', text: 'How does the 5+ cases volume tier work and how much do I save?' },
      { label: '🧁 Sample Box (Cologne/Bonn)', text: 'Can we request a free B2B tasting sample box for our café?' },
      { label: '🚚 MOQ & Pallet Logistics', text: 'What is your minimum order quantity and how many cases fit on a pallet?' },
    ],
    defaultMessage: 'Hello ElysonSweets, I have a wholesale inquiry.',
    officialNumberLabel: 'WhatsApp Business: +49 2203 9899714',
    aiThinking: 'Advisor is calculating...',
    aiBadge: 'B2B AI Consultant',
    directWhatsApp: 'Continue on WhatsApp with Sales Team',
    networkFallback: 'For direct orders, sample requests, or custom pricing, please connect with our WhatsApp team:',
  },
  ar: {
    tooltip: 'استفسر عن أسعار الجملة والشحن وحجم الكرتونة',
    headerTitle: 'مستشار Elyson Sweets لمبيعات الجملة',
    headerSubtitle: 'أسعار الجملة، التعبئة اللوجستية والوصفات',
    statusOnline: 'المستشار الذكي متصل',
    typicalReplyTime: 'إجابات فورية وفق بيانات المستودع المباشرة',
    greetingText: 'مرحباً بكم! 👋 أنا مستشارك التجاري لخدمات المطاعم والمقاهي لدى Elyson Sweets. كيف يمكنني مساعدتكم في حساب أسعار الجملة أو تفاصيل الكرتونة؟',
    placeholder: 'اكتب سؤالك حول الأسعار، الكراتين، أو النكهات...',
    sendTooltip: 'إرسال',
    startChatButton: 'متابعة المحادثة عبر واتساب',
    quickChips: [
      { label: '📦 خصم الكميات (5+ كراتين)', text: 'كيف يعمل خصم الكميات عند شراء 5 كراتين فما فوق؟' },
      { label: '🧁 عينات تذوق (كولونيا وبون)', text: 'هل يمكننا طلب عينة تجريبية مجانية لمطعمنا/مقهانا؟' },
      { label: '🚚 الحد الأدنى وحجم الطبلية', text: 'ما هو الحد الأدنى للطلب وكم كرتونة تتسع لها الطبلية الكاملة؟' },
    ],
    defaultMessage: 'مرحباً ElysonSweets، لدي استفسار بخصوص منتجات الجملة B2B.',
    officialNumberLabel: 'واتساب للأعمال: +49 2203 9899714',
    aiThinking: 'جاري الحساب والتجهيز...',
    aiBadge: 'مستشار المبيعات الذكي',
    directWhatsApp: 'متابعة الطلب مع فريق المبيعات عبر واتساب',
    networkFallback: 'للطلبات المباشرة أو طلب عينات أو استفسارات خاصة، يسعدنا تواصلكم مع فريق واتساب:',
  },
};

const PHONE_NUMBER_INTL = '4922039899714';

export default function WhatsAppButton({ locale = 'de' }: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || '';

  const t = CONTENT[locale] || CONTENT.de;
  const isRtl = locale === 'ar';

  // Extract current product slug if on product page
  const currentProductSlug = pathname.includes('/products/')
    ? pathname.split('/products/')[1]?.split('/')[0]
    : undefined;

  useEffect(() => {
    // Initial gentle tooltip prompt after 4 seconds
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isOpen]);

  // Close popup if clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const openWhatsApp = (customText?: string) => {
    const textToSend = (customText || inputMessage || t.defaultMessage).trim();
    const url = `https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent(textToSend)}`;
    trackContact();
    window.open(url, '_blank', 'noopener,noreferrer');
    setInputMessage('');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isThinking) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputMessage('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/ai/product-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          locale,
          channel: 'web',
          currentProduct: currentProductSlug ? { slug: currentProductSlug } : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('API Error');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t.networkFallback,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed bottom-6 ${isRtl ? 'left-5 sm:left-6' : 'right-5 sm:right-6'} z-40 flex flex-col items-end pointer-events-auto`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Floating Chat Popup Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="w-[92vw] sm:w-[420px] mb-4 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col will-change-transform text-slate-800"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0b3b2d] via-[#114b3a] to-[#165a46] text-white p-4 flex items-center justify-between relative shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-white/15 p-0.5 border border-[#D4AF37]/50 flex-shrink-0">
                  <Image
                    src="/Logo.jpg"
                    alt="ElysonSweets Logo"
                    width={44}
                    height={44}
                    className="object-cover w-full h-full rounded-full"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0b3b2d] rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm tracking-wide text-white">{t.headerTitle}</h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#D4AF37]/25 text-[#f6e29c] border border-[#D4AF37]/40 px-2 py-0.5 rounded-full">
                      <FaWandMagicSparkles className="text-[9px] text-[#f6e29c] animate-pulse" />
                      {t.aiBadge}
                    </span>
                  </div>
                  <p className="text-xs text-white/80">{t.headerSubtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Schließen"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="p-4 bg-slate-50/80 space-y-3.5 max-h-[420px] overflow-y-auto">
              <p className="text-[11px] text-center text-slate-500 font-medium bg-slate-200/50 py-1 px-2.5 rounded-full mx-auto w-fit">
                {t.typicalReplyTime}
              </p>

              {/* Bot Initial Greeting */}
              <div className="flex items-start gap-2.5 max-w-[92%]">
                <div className="w-7 h-7 rounded-full bg-[#114b3a] text-white flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
                  <FaRobot size={13} />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-xs border border-slate-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed">
                  <p>{t.greetingText}</p>
                  {currentProductSlug && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Aktives Produkt im Fokus: <strong>{currentProductSlug}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Conversation Messages */}
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'max-w-[92%]'}`}
                >
                  {m.role !== 'user' && (
                    <div className="w-7 h-7 rounded-full bg-[#114b3a] text-white flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
                      <FaRobot size={13} />
                    </div>
                  )}
                  <div
                    className={`p-3.5 text-xs sm:text-sm leading-relaxed rounded-2xl shadow-xs whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-[#114b3a] text-white rounded-tr-sm'
                        : 'bg-white text-slate-800 border border-slate-200/70 rounded-tl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {isThinking && (
                <div className="flex items-center gap-2 text-xs text-slate-500 italic pl-9">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                  <span>{t.aiThinking}</span>
                </div>
              )}

              {/* Quick Chips (Shown when conversation is fresh) */}
              {messages.length === 0 && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider px-1">
                    {locale === 'tr' ? 'Hızlı Seçenekler:' : 'Häufige Fragen:'}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {t.quickChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip.text)}
                        className="text-left text-xs bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 hover:text-emerald-900 py-2.5 px-3.5 rounded-xl transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                      >
                        <span className="font-medium">{chip.label}</span>
                        <span className="text-slate-400 group-hover:text-emerald-600 transition-colors font-bold">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input & Action Footer */}
            <div className="p-3.5 bg-white border-t border-slate-200/80 space-y-2.5">
              {/* Text Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.placeholder}
                  disabled={isThinking}
                  className="flex-1 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-800 px-3.5 py-2.5 rounded-xl border border-transparent focus:border-emerald-600 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isThinking || !inputMessage.trim()}
                  title={t.sendTooltip}
                  className="p-2.5 bg-[#114b3a] hover:bg-[#0c3529] disabled:opacity-40 active:scale-95 text-white rounded-xl shadow-md transition-all flex items-center justify-center flex-shrink-0 cursor-pointer"
                >
                  <FaPaperPlane size={14} className={isRtl ? 'rotate-180' : ''} />
                </button>
              </div>

              {/* Direct WhatsApp Handover Button */}
              <button
                type="button"
                onClick={() => openWhatsApp(messages.length > 0 ? messages[messages.length - 1].content : undefined)}
                className="w-full py-2 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0f7a6e] text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FaWhatsapp size={16} />
                <span>{t.directWhatsApp}</span>
              </button>

              <div className="text-center pt-0.5">
                <span className="text-[10px] text-slate-400 font-mono tracking-tight">
                  {t.officialNumberLabel}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Buttons */}
      <div className="flex flex-col items-end gap-3">
        {/* Tooltip Bubble */}
        <AnimatePresence>
          {!isOpen && showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: isRtl ? -10 : 10, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="hidden sm:flex items-center gap-2.5 bg-white/95 backdrop-blur-md text-slate-800 text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xl border border-slate-200/90 cursor-pointer"
              onClick={() => {
                setIsOpen(true);
                setShowTooltip(false);
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>{t.tooltip}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="text-slate-400 hover:text-slate-600 ml-1 text-xs"
                title="Schließen"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          {/* WhatsApp Direct Button */}
          {!isOpen && (
            <motion.button
              type="button"
              onClick={() => openWhatsApp()}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              aria-label="WhatsApp"
              className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-white shadow-lg flex items-center justify-center cursor-pointer border-2 border-white focus:outline-none self-end mt-2"
            >
              <FaWhatsapp size={24} />
            </motion.button>
          )}

          {/* AI Assistant Button */}
          <motion.button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              setShowTooltip(false);
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Elyson B2B Berater"
            className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-gradient-to-tr from-[#0b3b2d] via-[#114b3a] to-[#165a46] text-white shadow-xl shadow-emerald-950/40 flex items-center justify-center cursor-pointer border-2 border-[#D4AF37]/60 focus:outline-none focus:ring-4 focus:ring-emerald-400/30 will-change-transform"
          >
            {!isOpen && (
              <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping pointer-events-none" />
            )}

            {isOpen ? (
              <FaTimes size={22} />
            ) : (
              <FaRobot size={28} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
