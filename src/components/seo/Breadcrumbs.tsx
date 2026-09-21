import Link from 'next/link';
import { FiChevronRight as ChevronRight } from 'react-icons/fi';

type BreadcrumbItem = {
  label: string;
  href: string;
};

type BreadcrumbsProps = {
  locale: string;
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ locale, items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
      <Link href={`/${locale}`} className="hover:text-primary transition-colors">
        Home
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {index === items.length - 1 ? (
            <span className="text-gray-900 font-medium" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link href={`/${locale}${item.href}`} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
