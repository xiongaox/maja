import React from 'react';
import { 
  Cat, Dog, Rabbit, Bird, Fish, 
  Leaf, Flower2, Cloud, Sun, Moon, 
  Star, Heart, Smile, Sparkles, Sprout
} from 'lucide-react';

const AVATAR_ICONS = [
  Cat, Dog, Rabbit, Bird, Fish, 
  Leaf, Flower2, Cloud, Sun, Moon, 
  Star, Heart, Smile, Sparkles, Sprout
];

const getIconForName = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_ICONS[Math.abs(hash) % AVATAR_ICONS.length];
};

interface UserAvatarProps {
  name: string;
  gender?: 'boy' | 'girl';
  amount?: number;      // For calendar (positive/negative)
  isWinner?: boolean;   // For leaderboard
  className?: string;
}

export function UserAvatar({ name, gender, amount, isWinner, className = '' }: UserAvatarProps) {
  const Icon = getIconForName(name || 'Unknown');

  let themeClasses = '';
  
  if (gender === 'girl') {
    themeClasses = 'bg-gradient-to-br from-pink-100 to-rose-50 text-pink-500 border border-pink-100';
  } else if (gender === 'boy') {
    themeClasses = 'bg-gradient-to-br from-blue-100 to-sky-50 text-blue-500 border border-blue-100';
  } else if (isWinner === true || (amount && amount > 0)) {
    themeClasses = 'bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-500 border border-emerald-100';
  } else if (isWinner === false || (amount && amount < 0)) {
    themeClasses = 'bg-gradient-to-br from-gray-100 to-slate-50 text-gray-500 border border-gray-100';
  } else {
    // Default fallback
    themeClasses = 'bg-gradient-to-br from-slate-100 to-gray-50 text-slate-500 border border-slate-100';
  }

  return (
    <div className={`flex items-center justify-center flex-shrink-0 shadow-sm ${themeClasses} ${className}`}>
      <Icon size={20} strokeWidth={2.5} />
    </div>
  );
}
