import { BiLogOut } from "react-icons/bi";
import { dictionary } from '@/dictionaries/de'; // Wörterbuch importieren

export function PortalHeader({ firmaUnvan }: { firmaUnvan: string }) {
    const content = dictionary.portal.header; // Texte für den Header holen

    return (
        <header className="fixed top-0 left-0 z-20 flex h-16 w-full items-center justify-between border-b border-bg-subtle bg-secondary px-6 lg:left-64 lg:w-[calc(100%-16rem)]">
            <div className="lg:hidden">{/* Platz für mobilen Menü-Button */}</div>
            <h1 className="font-serif text-xl font-bold text-primary">{firmaUnvan} {content.titleSuffix}</h1>
            <form action="/auth/sign-out" method="post">
                <button type="submit" className="flex items-center gap-2 text-red-500 hover:text-red-700">
                    <BiLogOut size={20} />
                    <span className="text-sm font-medium">{content.logout}</span>
                </button>
            </form>
        </header>
    );
}