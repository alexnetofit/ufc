'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { User } from 'lucide-react';

interface FighterImageProps {
  fighterId: number;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function FighterImage({ fighterId, name, size = 'md', className }: FighterImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
  };

  // Usar o proxy interno para buscar imagens com autenticação
  const imageUrl = `/api/fighter-image/${fighterId}`;

  if (error) {
    return (
      <div
        className={cn(
          'rounded-full bg-ufc-gray-700 flex items-center justify-center',
          sizes[size],
          className
        )}
      >
        <User className="w-1/2 h-1/2 text-ufc-gray-400" />
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
        unoptimized // Imagem vem do proxy
      />
    </div>
  );
}
