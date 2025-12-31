'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { User } from 'lucide-react';

interface FighterImageProps {
  fighterId: number;
  name: string;
  imageUrl?: string | null; // URL do Supabase Storage
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function FighterImage({ fighterId, name, imageUrl, size = 'md', className }: FighterImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
  };

  // Se não tem URL ou deu erro, mostrar fallback com iniciais
  if (!imageUrl || error) {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div
        className={cn(
          'rounded-full bg-ufc-gray-700 flex items-center justify-center border-2 border-ufc-gray-600',
          sizes[size],
          className
        )}
      >
        {initials ? (
          <span className="font-oswald text-ufc-gray-300" style={{ fontSize: size === 'sm' ? '0.75rem' : size === 'md' ? '1rem' : '1.25rem' }}>
            {initials}
          </span>
        ) : (
          <User className="w-1/2 h-1/2 text-ufc-gray-400" />
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', sizes[size], className)}>
      {loading && (
        <div className={cn('absolute inset-0 rounded-full shimmer', sizes[size])} />
      )}
      <Image
        src={imageUrl}
        alt={name}
        fill
        className={cn(
          'rounded-full object-cover border-2 border-ufc-gray-600',
          loading && 'opacity-0'
        )}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        unoptimized
      />
    </div>
  );
}
