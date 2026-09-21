import Link from 'next/link';
import { FiMonitor as Calculator } from 'react-icons/fi';

export default function CalculatorCTA({ locale }: { locale: string }) {
  const content = {
    de: {
      title: 'Kennen Sie Ihre echten Gewinnmargen?',
      desc: 'Nutzen Sie unseren kostenlosen B2B-Kalkulator, um die Kosten pro Getränk exakt zu berechnen.',
      btn: 'Jetzt berechnen'
    },
    en: {
      title: 'Do you know your real profit margins?',
      desc: 'Use our free B2B calculator to exactly determine your cost per drink.',
      btn: 'Calculate Now'
    },
    tr: {
      title: 'Gerçek kâr marjınızı biliyor musunuz?',
      desc: 'İçecek başına maliyetinizi tam olarak hesaplamak için ücretsiz B2B aracımızı kullanın.',
      btn: 'Şimdi Hesapla'
    },
    ar: {
      title: 'هل تعرف هوامش الربح الحقيقية الخاصة بك؟',
      desc: 'استخدم حاسبة B2B المجانية الخاصة بنا لتحديد تكلفة المشروب بدقة.',
      btn: 'احسب الآن'
    }
  };

  const currentContent = content[locale as keyof typeof content] || content['en'];

  return (
    <div className="my-8 bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-full">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{currentContent.title}</h3>
          <p className="text-gray-600 mt-1">{currentContent.desc}</p>
        </div>
      </div>
      <Link 
        href={`/${locale}/tools/margin-calculator`}
        className="whitespace-nowrap bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        {currentContent.btn}
      </Link>
    </div>
  );
}
