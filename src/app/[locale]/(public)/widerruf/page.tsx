import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Widerrufsbelehrung | ElysonSweets',
    description: 'Widerrufsbelehrung und Widerrufsformular für ElysonSweets.',
  };
}

export default async function WiderrufPage() {
  return (
    <div className="bg-secondary text-text-main">
      {/* Hero */}
      <div className="relative bg-primary text-secondary text-center py-20 md:py-32">
        <h1 className="text-5xl md:text-7xl font-serif text-secondary">Widerrufsbelehrung</h1>
        <p className="text-secondary/60 mt-3 text-lg">Informationen zum Widerrufsrecht</p>
      </div>

      {/* Content */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl font-sans">
          <div className="space-y-8 bg-white p-10 rounded-lg shadow-lg text-text-main">

            {/* B2B Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Hinweis für Gewerbetreibende</p>
              <p className="text-sm text-amber-700">
                ElysonSweets verkauft ausschließlich an Unternehmer im Sinne von § 14 BGB. Für Käufe durch
                Unternehmer gilt kein gesetzliches Widerrufsrecht nach § 312g BGB. Die folgenden Informationen
                gelten nur, soweit im Einzelfall ein Widerrufsrecht ausdrücklich vertraglich eingeräumt wurde.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">Widerrufsrecht</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Verbrauchern (§ 13 BGB) steht bei Fernabsatzverträgen grundsätzlich ein Widerrufsrecht zu.
                Da ElysonSweets ausschließlich an Gewerbetreibende liefert, findet das Verbraucherwiderrufsrecht
                grundsätzlich keine Anwendung. Sollte in Ausnahmefällen dennoch ein Widerrufsrecht bestehen,
                gelten die nachfolgenden Regelungen.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">Widerrufsfrist</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter
                Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat. Um Ihr
                Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung (z. B. ein mit
                der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen,
                informieren.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">Kontakt für Widerruf</h2>
              <address className="text-sm leading-relaxed text-gray-700 not-italic">
                <strong>ElysonSweets</strong><br />
                Köln, Deutschland<br />
                E-Mail: <a href="mailto:info@elysonsweets.de" className="text-primary hover:underline">info@elysonsweets.de</a>
              </address>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">Folgen des Widerrufs</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten
                haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus
                ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste
                Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag
                zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">Ausschluss des Widerrufsrechts</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Das Widerrufsrecht besteht nicht bei Verträgen über die Lieferung von Waren, die schnell verderben
                können oder deren Verfallsdatum schnell überschritten würde, sowie bei Waren, die aus
                Gesundheitsschutz- oder Hygienegründen nicht zur Rückgabe geeignet sind, wenn ihre Versiegelung
                nach der Lieferung entfernt wurde.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">Muster-Widerrufsformular</h2>
              <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold">Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden es zurück:</p>
                <p>An: ElysonSweets, Köln, info@elysonsweets.de</p>
                <p>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*):</p>
                <p>Bestellt am (*) / erhalten am (*):</p>
                <p>Name des/der Verbraucher(s):</p>
                <p>Anschrift des/der Verbraucher(s):</p>
                <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):</p>
                <p>Datum:</p>
                <p className="text-gray-400 text-xs">(*) Unzutreffendes streichen</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
              Stand: Mai 2026 · ElysonSweets, Köln · info@elysonsweets.de
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
