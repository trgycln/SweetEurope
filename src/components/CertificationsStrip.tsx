import React from 'react';
import { FaShieldAlt, FaCheckCircle, FaTrophy, FaSearch, FaTag } from 'react-icons/fa';

const CertificationsStrip: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  const certs = [
    {
      icon: <FaShieldAlt className="w-6 h-6" />,
      label: dictionary.certifications.brc.label,
      description: dictionary.certifications.brc.description,
    },
    {
      icon: <FaCheckCircle className="w-6 h-6" />,
      label: dictionary.certifications.halal.label,
      description: dictionary.certifications.halal.description,
    },
    {
      icon: <FaTrophy className="w-6 h-6" />,
      label: 'Türkischer Patent-Sieger',
      description: 'Mehrfach ausgezeichnet für Innovationsleistung im Bereich Sirup- und Soßenherstellung.',
    },
    {
      icon: <FaSearch className="w-6 h-6" />,
      label: 'Online-Qualitätskontrolle',
      description: 'Lückenlose Online-Qualitätsprüfung über die gesamte Produktionskette.',
    },
    {
      icon: <FaTag className="w-6 h-6" />,
      label: 'EU-konforme Etikettierung',
      description: 'Alle Etiketten und Spezifikationen entsprechen EU-Lebensmittelverordnungen.',
    },
  ];

  return (
    <section className="bg-bg-subtle py-16 px-6">
      <div className="container mx-auto">
        <h3 className="text-center text-2xl md:text-3xl font-serif mb-10">
          {dictionary.certifications.title}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {certs.map((cert, i) => (
            <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                {cert.icon}
              </div>
              <div>
                <div className="font-serif text-base font-semibold">{cert.label}</div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{cert.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CertificationsStrip;
