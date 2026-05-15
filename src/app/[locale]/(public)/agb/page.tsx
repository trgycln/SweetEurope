import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AGB (B2B) | ElysonSweets',
    description: 'Allgemeine Geschäftsbedingungen für Geschäftskunden von ElysonSweets.',
  };
}

export default async function AgbPage() {
  return (
    <div className="bg-secondary text-text-main">
      {/* Hero */}
      <div className="relative bg-primary text-secondary text-center py-20 md:py-32">
        <h1 className="text-5xl md:text-7xl font-serif text-secondary">AGB (B2B)</h1>
        <p className="text-secondary/60 mt-3 text-lg">Allgemeine Geschäftsbedingungen</p>
      </div>

      {/* Content */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl font-sans">
          <div className="space-y-8 bg-white p-10 rounded-lg shadow-lg text-text-main">

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">§ 1 Geltungsbereich</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Geschäftsbeziehungen zwischen ElysonSweets
                (nachfolgend „Verkäufer") und Unternehmern im Sinne von § 14 BGB (nachfolgend „Käufer"). Maßgeblich ist
                die jeweils zum Zeitpunkt des Vertragsschlusses gültige Fassung. Abweichende, entgegenstehende oder
                ergänzende AGB des Käufers werden nicht Vertragsbestandteil, es sei denn, ihrer Geltung wird ausdrücklich
                schriftlich zugestimmt.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">§ 2 Vertragsschluss</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot, sondern eine
                Aufforderung zur Abgabe einer Bestellung dar. Durch die Absendung einer Bestellung gibt der Käufer ein
                verbindliches Angebot ab. Der Verkäufer bestätigt den Eingang der Bestellung unverzüglich per E-Mail.
                Der Kaufvertrag kommt erst mit der Auftragsbestätigung oder Lieferung der Ware zustande.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">§ 3 Preise und Zahlungsbedingungen</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Alle Preise verstehen sich in Euro, netto, zuzüglich der gesetzlichen Mehrwertsteuer sowie zuzüglich
                Versandkosten, soweit nicht anders angegeben. Zahlungen sind innerhalb von 14 Tagen netto fällig, sofern
                nicht abweichend vereinbart. Bei Zahlungsverzug werden Verzugszinsen gemäß § 288 Abs. 2 BGB berechnet.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">§ 4 Lieferung und Versand</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Die Lieferung erfolgt an die vom Käufer angegebene Lieferadresse. Lieferzeiten sind unverbindliche
                Angaben, sofern kein fixer Liefertermin ausdrücklich vereinbart wurde. Teillieferungen sind zulässig,
                soweit sie dem Käufer zumutbar sind. Versandkosten werden separat ausgewiesen und gehen zu Lasten des Käufers.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">§ 5 Eigentumsvorbehalt</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Die gelieferte Ware bleibt bis zur vollständigen Bezahlung Eigentum des Verkäufers. Der Käufer ist
                berechtigt, die Ware im gewöhnlichen Geschäftsbetrieb weiterzuverkaufen. Pfändungen oder sonstige
                Eingriffe Dritter in den Vorbehaltswaren hat der Käufer dem Verkäufer unverzüglich anzuzeigen.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">§ 6 Gewährleistung</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Es gelten die gesetzlichen Gewährleistungsrechte. Der Käufer hat die Ware unverzüglich nach Erhalt auf
                Mängel zu untersuchen. Offensichtliche Mängel sind innerhalb von 5 Werktagen nach Erhalt der Ware
                schriftlich zu rügen. Versteckte Mängel sind unverzüglich nach ihrer Entdeckung zu rügen.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">§ 7 Haftungsbeschränkung</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Der Verkäufer haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der
                Gesundheit sowie für Vorsatz und grobe Fahrlässigkeit. Im Übrigen ist die Haftung auf vorhersehbare,
                vertragstypische Schäden begrenzt. Eine weitergehende Haftung ist ausgeschlossen.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-3">§ 8 Schlussbestimmungen</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG). Gerichtsstand
                für alle Streitigkeiten aus Verträgen mit Kaufleuten ist Köln. Sollten einzelne Bestimmungen dieser AGB
                unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
              </p>
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
