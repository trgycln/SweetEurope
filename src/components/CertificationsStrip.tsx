import React from 'react';
import { FaShieldAlt, FaCheckCircle } from 'react-icons/fa';

const CertificationsStrip: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  return (
    <section className="bg-bg-subtle py-12 px-6">
      <div className="container mx-auto">
        <h3 className="text-center text-2xl md:text-3xl font-serif mb-8">
          {dictionary.certifications.title}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <FaShieldAlt className="w-6 h-6" />
            </div>
            <div>
              <div className="font-serif text-lg">{dictionary.certifications.brc.label}</div>
              <p className="text-sm text-gray-600">{dictionary.certifications.brc.description}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <FaCheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-serif text-lg">{dictionary.certifications.halal.label}</div>
              <p className="text-sm text-gray-600">{dictionary.certifications.halal.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CertificationsStrip;
