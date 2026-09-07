'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp, FaTimes, FaPaperPlane } from 'react-icons/fa';

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
}

const CONTENT: Record<string, LocaleContent> = {
  de: {
    tooltip: 'Fragen? Chatten Sie mit uns auf WhatsApp',
    headerTitle: 'ElysonSweets Support',
    headerSubtitle: 'B2B Großhandel & Kundenservice',
    statusOnline: 'Online',
    typicalReplyTime: 'Antwortet meistens in wenigen Minuten',
    greetingText: 'Hallo! 👋 Wie können wir Ihnen bei Ihrer B2B-Anfrage, Sortiment oder Preisen behilflich sein?',
    placeholder: 'Ihre Nachricht schreiben...',
    sendTooltip: 'Auf WhatsApp senden',
    startChatButton: 'Chat auf WhatsApp starten',
    quickChips: [
      { label: '📦 B2B Katalog & Preise', text: 'Hallo ElysonSweets, ich interessiere mich für Ihren B2B Katalog und die Großhandelspreise.' },
      { label: '🧁 Musterpaket anfragen', text: 'Hallo ElysonSweets, ich möchte ein kostenloses Musterpaket für meinen Betrieb anfragen.' },
      { label: '🚚 Lieferzeiten & Konditionen', text: 'Hallo ElysonSweets, wie sind Ihre aktuellen Lieferzeiten und Mindestbestellmengen?' },
    ],
    defaultMessage: 'Hallo ElysonSweets, ich habe eine Frage zu Ihrem B2B-Sortiment.',
    officialNumberLabel: 'WhatsApp Business: +49 2203 9899714',
  },
  tr: {
    tooltip: 'Sorularınız mı var? WhatsApp ile bize yazın',
    headerTitle: 'ElysonSweets Destek',
    headerSubtitle: 'B2B Toptan & Müşteri Hizmetleri',
    statusOnline: 'Çevrimiçi',
    typicalReplyTime: 'Genellikle birkaç dakika içinde yanıt verir',
    greetingText: 'Merhaba! 👋 B2B ürünlerimiz, toptan fiyat listemiz veya siparişleriniz hakkında nasıl yardımcı olabiliriz?',
    placeholder: 'Mesajınızı yazın...',
    sendTooltip: 'WhatsApp ile Gönder',
    startChatButton: "WhatsApp'ta Sohbet Başlat",
    quickChips: [
      { label: '📦 Toptan Fiyat Listesi', text: 'Merhaba ElysonSweets, toptan fiyat listeniz ve ürün kataloğunuz hakkında bilgi almak istiyorum.' },
      { label: '🧁 Deneme Paketi Talebi', text: 'Merhaba ElysonSweets, işletmem için numune / deneme paketi talep etmek istiyorum.' },
      { label: '🚚 Teslimat & Minimum Sipariş', text: 'Merhaba ElysonSweets, minimum sipariş tutarı ve teslimat şartlarınız hakkında bilgi alabilir miyim?' },
    ],
    defaultMessage: 'Merhaba ElysonSweets, B2B ürünleriniz hakkında bilgi almak istiyorum.',
    officialNumberLabel: 'WhatsApp Business: +49 2203 9899714',
  },
  en: {
    tooltip: 'Questions? Chat with us on WhatsApp',
    headerTitle: 'ElysonSweets Support',
    headerSubtitle: 'B2B Wholesale & Customer Care',
    statusOnline: 'Online',
    typicalReplyTime: 'Usually replies within minutes',
    greetingText: 'Hello! 👋 How can we help you with your B2B wholesale order, catalog, or pricing inquiries?',
    placeholder: 'Type your message...',
    sendTooltip: 'Send via WhatsApp',
    startChatButton: 'Start Chat on WhatsApp',
    quickChips: [
      { label: '📦 B2B Catalog & Pricing', text: 'Hello ElysonSweets, I would like to receive the B2B product catalog and wholesale price list.' },
      { label: '🧁 Sample Box Request', text: 'Hello ElysonSweets, I am interested in ordering a sample box for my business.' },
      { label: '🚚 Delivery & MOQ Details', text: 'Hello ElysonSweets, could you please provide details about your minimum order quantities and shipping?' },
    ],
    defaultMessage: 'Hello ElysonSweets, I have an inquiry about your B2B wholesale products.',
    officialNumberLabel: 'WhatsApp Business: +49 2203 9899714',
  },
  ar: {
    tooltip: 'هل لديك استفسار؟ تواصل معنا عبر واتساب',
    headerTitle: 'دعم ElysonSweets',
    headerSubtitle: 'خدمات الجملة B2B وخدمة العملاء',
    statusOnline: 'متصل الآن',
    typicalReplyTime: 'يرد عادةً خلال دقائق معدودة',
    greetingText: 'مرحباً! 👋 كيف يمكننا مساعدتك في طلبات الجملة B2B أو تفاصيل الأسعار والكتالوج؟',
    placeholder: 'اكتب رسالتك هنا...',
    sendTooltip: 'إرسال عبر واتساب',
    startChatButton: 'بدء المحادثة على واتساب',
    quickChips: [
      { label: '📦 كتالوج المنتجات والأسعار', text: 'مرحباً ElysonSweets، أود الاستفسار عن كتالوج المنتجات وقائمة أسعار الجملة B2B.' },
      { label: '🧁 طلب عينة تجريبية', text: 'مرحباً ElysonSweets، أود طلب عينة تجريبية لمنتجاتكم لمطعمي/مقهاتي.' },
      { label: '🚚 الشحن والحد الأدنى للطلب', text: 'مرحباً ElysonSweets، ما هي شروط الشحن والحد الأدنى للطلب لديكم؟' },
    ],
    defaultMessage: 'مرحباً ElysonSweets، لدي استفسار بخصوص منتجات الجملة B2B.',
    officialNumberLabel: 'واتساب للأعمال: +49 2203 9899714',
  },
};

const PHONE_NUMBER_INTL = '4922039899714';

export default function WhatsAppButton({ locale = 'de' }: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [message, setMessage] = useState('');
  const [timeString, setTimeString] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const t = CONTENT[locale] || CONTENT.de;
  const isRtl = locale === 'ar';

  useEffect(() => {
    // Localized formatted time for the chat bubble
    const now = new Date();
    setTimeString(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    // Initial gentle tooltip prompt after 4 seconds if not opened
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

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
    const textToSend = (customText || message || t.defaultMessage).trim();
    const url = `https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setMessage('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openWhatsApp();
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
            className="w-[92vw] sm:w-96 mb-4 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col will-change-transform text-slate-800"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0b3b2d] via-[#114b3a] to-[#165a46] text-white p-4 flex items-center justify-between relative shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-white/15 p-0.5 border border-[#D4AF37]/40 flex-shrink-0">
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
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/25 text-emerald-200 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {t.statusOnline}
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
            <div className="p-4 bg-slate-50/70 space-y-3.5 max-h-[380px] overflow-y-auto">
              <p className="text-[11px] text-center text-slate-500 font-medium">
                {t.typicalReplyTime}
              </p>

              {/* Bot Greeting Bubble */}
              <div className="flex items-start gap-2 max-w-[90%]">
                <div className="bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-sm border border-slate-200/60 text-xs sm:text-sm text-slate-800 leading-relaxed">
                  <p>{t.greetingText}</p>
                  <span className="block text-[10px] text-slate-500 mt-1.5 text-right font-mono">
                    {timeString || '12:00'}
                  </span>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider px-1">
                  {isRtl ? 'اقتراحات سريعة:' : locale === 'tr' ? 'Hızlı Seçenekler:' : 'Schnellstart:'}
                </p>
                <div className="flex flex-col gap-1.5">
                  {t.quickChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openWhatsApp(chip.text)}
                      className="text-left text-xs bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 hover:text-emerald-800 py-2 px-3 rounded-xl transition-all shadow-2xs flex items-center justify-between group"
                    >
                      <span className="font-medium">{chip.label}</span>
                      <span className="text-slate-500 group-hover:text-emerald-600 transition-colors">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input & Direct Send Footer */}
            <div className="p-3 bg-white border-t border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.placeholder}
                  className="flex-1 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-800 px-3.5 py-2.5 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => openWhatsApp()}
                  title={t.sendTooltip}
                  className="p-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white rounded-xl shadow-md transition-all flex items-center justify-center flex-shrink-0"
                >
                  <FaPaperPlane size={14} className={isRtl ? 'rotate-180' : ''} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => openWhatsApp()}
                className="w-full py-2.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0f7a6e] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FaWhatsapp size={18} />
                <span>{t.startChatButton}</span>
              </button>

              <div className="text-center pt-0.5">
                <span className="text-[10px] text-slate-500 font-mono tracking-tight">
                  {t.officialNumberLabel}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button & Tooltip */}
      <div className="flex items-center gap-3">
        {/* Persistent/Hover Tooltip Bubble */}
        <AnimatePresence>
          {!isOpen && showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: isRtl ? -10 : 10, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md text-slate-800 text-xs font-semibold py-2 px-3.5 rounded-xl shadow-lg border border-slate-200/80 cursor-pointer"
              onClick={() => {
                setIsOpen(true);
                setShowTooltip(false);
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
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

        {/* Main Floating WhatsApp Trigger Button */}
        <motion.button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setShowTooltip(false);
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label="WhatsApp Business Chat"
          className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-gradient-to-tr from-[#25D366] via-[#22bf5b] to-[#128C7E] text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center cursor-pointer border-2 border-white/60 focus:outline-none focus:ring-4 focus:ring-emerald-400/30 will-change-transform"
        >
          {/* Subtle Outer Pulse Ring */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-[#25D366]/40 animate-ping pointer-events-none" />
          )}

          {isOpen ? (
            <FaTimes size={24} />
          ) : (
            <>
              <FaWhatsapp size={32} />
              {/* Green online badge */}
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm">
                <span className="w-full h-full bg-emerald-500 rounded-full" />
              </span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
