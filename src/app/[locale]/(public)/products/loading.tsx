export default function Loading() {
    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans animate-pulse">
            {/* Header Skeleton */}
            <div className="bg-white border-b border-stone-200">
                <div className="container mx-auto px-4 sm:px-8 py-5 flex justify-between items-end">
                    <div className="space-y-3">
                        <div className="h-3 w-24 bg-stone-200 rounded-md"></div>
                        <div className="h-8 w-64 sm:w-96 bg-stone-200 rounded-lg"></div>
                        <div className="h-4 w-48 sm:w-80 bg-stone-200 rounded-md"></div>
                    </div>
                    <div className="h-10 w-32 bg-stone-200 rounded-xl hidden sm:block"></div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="container mx-auto px-4 sm:px-8 py-6 flex gap-6">
                {/* Sidebar Skeleton */}
                <aside className="hidden lg:flex flex-col gap-5 w-52 flex-shrink-0">
                    <div className="space-y-3">
                        <div className="h-4 w-20 bg-stone-200 rounded-md mb-4"></div>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-8 w-full bg-stone-200 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="space-y-3 mt-6">
                        <div className="h-4 w-20 bg-stone-200 rounded-md mb-4"></div>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-8 w-full bg-stone-200 rounded-xl"></div>
                        ))}
                    </div>
                </aside>

                {/* Grid Skeleton */}
                <div className="flex-1">
                    {/* Toolbar Skeleton */}
                    <div className="h-12 w-full bg-stone-200 rounded-2xl mb-6"></div>
                    
                    {/* Cards Skeleton */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                        {[...Array(15)].map((_, i) => (
                            <div key={i} className="bg-white border border-stone-200 rounded-2xl h-[320px] p-2.5 flex flex-col gap-2">
                                <div className="h-32 w-full bg-stone-100 rounded-xl"></div>
                                <div className="h-3 w-1/3 bg-stone-100 rounded mt-2"></div>
                                <div className="h-5 w-3/4 bg-stone-200 rounded"></div>
                                <div className="h-5 w-1/2 bg-stone-200 rounded mt-auto"></div>
                                <div className="h-8 w-full bg-stone-100 rounded-lg mt-2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
