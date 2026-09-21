'use client';

import { useState } from 'react';
import { FiHeart as Heart } from 'react-icons/fi';
import { incrementRecipeLike } from '@/lib/actions/recipe-actions';

type LikeButtonProps = {
  recipeId: string;
  initialLikes: number;
};

export default function LikeButton({ recipeId, initialLikes }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleLike = async () => {
    if (isLiked || isPending) return;
    
    setIsPending(true);
    // Optimistic UI (Kullanıcıya anında tepki ver)
    setLikes((prev) => prev + 1);
    setIsLiked(true);

    // Arka planda veritabanını güncelle
    await incrementRecipeLike(recipeId);
    setIsPending(false);
  };

  return (
    <button 
      onClick={handleLike}
      disabled={isLiked || isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all print:hidden ${
        isLiked 
          ? 'bg-red-50 border-red-100 text-red-500' 
          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-500'
      }`}
    >
      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
      <span className="font-medium">{likes}</span>
    </button>
  );
}
