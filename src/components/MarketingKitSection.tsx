import React from 'react';
import { FaDownload, FaImage, FaFilePdf, FaShareSquare } from 'react-icons/fa';

const IconMap: { [key: string]: React.ReactNode } = {
  Bilder: <FaImage className="text-accent text-xl" />,
  Dokumente: <FaFilePdf className="text-accent text-xl" />,
  Vorlagen: <FaShareSquare className="text-accent text-xl" />,
};

const MarketingKitSection: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  const { title, description, assets } = dictionary.marketingKit;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mt-8">
      <h3 className="font-serif text-2xl font-bold text-primary mb-2">{title}</h3>
      <p className="font-sans text-sm text-gray-500 mb-6">{description}</p>
      <div className="space-y-4">
        {assets.map((asset: any, index: number) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-md hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              {IconMap[asset.type] || <FaFilePdf className="text-accent text-xl" />}
              <div>
                <p className="font-bold text-primary">{asset.name}</p>
                <p className="text-xs text-gray-500">{asset.type}</p>
              </div>
            </div>
            <a href="#" className="flex items-center gap-2 bg-accent/10 text-accent font-bold py-2 px-4 rounded-md text-sm hover:bg-accent/20 transition-colors">
              <FaDownload />
              <span>{asset.action}</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketingKitSection;
