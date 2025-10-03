import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-4">
      <div className="bg-accent/10 p-3 rounded-full">
        {icon}
      </div>
      <div>
        <p className="font-sans text-sm text-gray-500">{title}</p>
        <p className="font-serif text-2xl font-bold text-primary">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;

