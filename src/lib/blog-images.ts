export const WINTER_IMAGES = [
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556740767-414a9c4860c1?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=2000&auto=format&fit=crop"
];

export const SUMMER_IMAGES = [
  "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1657313666513-70770d329ef4?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500217052183-bc01eee1a74e?q=80&w=2000&auto=format&fit=crop"
];

export const GENERAL_B2B_IMAGES = [
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?q=80&w=2000&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556742526-795a8eac090e?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1610632380989-680fe40816c6?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500217052183-bc01eee1a74e?q=80&w=2000&auto=format&fit=crop"
];

export function getSeasonalBlogImage(month: number): string {
  let selectedPool: string[] = GENERAL_B2B_IMAGES;
  
  if ([10, 11, 0, 1, 2].includes(month)) {
    selectedPool = WINTER_IMAGES;
  } 
  else if ([4, 5, 6, 7, 8].includes(month)) {
    selectedPool = SUMMER_IMAGES;
  }
  
  // Mix it up slightly with general images so it feels less repetitive
  if (Math.random() > 0.8) {
    selectedPool = GENERAL_B2B_IMAGES;
  }
  
  const randomIndex = Math.floor(Math.random() * selectedPool.length);
  return selectedPool[randomIndex];
}

