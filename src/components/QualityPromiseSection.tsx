import React from 'react';
import { FaSeedling, FaCog, FaShippingFast } from 'react-icons/fa';

const QualityPromiseSection: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  const promises = [
    {
      icon: <FaSeedling className="text-accent text-4xl" />,
      title: dictionary.qualityPromise.item1.title,
      description: dictionary.qualityPromise.item1.description,
    },
    {
      icon: <FaCog className="text-accent text-4xl" />,
      title: dictionary.qualityPromise.item2.title,
      description: dictionary.qualityPromise.item2.description,
    },
    {
      icon: <FaShippingFast className="text-accent text-4xl" />,
      title: dictionary.qualityPromise.item3.title,
      description: dictionary.qualityPromise.item3.description,
    },
  ];

  return (
    <section className="bg-white py-20 px-6">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-serif mb-12 text-primary">
          {dictionary.qualityPromise.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {promises.map((promise, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="mb-4">{promise.icon}</div>
              <h3 className="text-2xl font-serif font-bold text-primary mb-2">
                {promise.title}
              </h3>
              <p className="font-sans text-text-main leading-relaxed max-w-xs">
                {promise.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QualityPromiseSection;
