'use client';

import Link from 'next/link';
import { Calendar, MapPin, Swords, CheckCircle, Lock, Unlock } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { formatDate, formatRelative, isToday, isPast } from '@/lib/utils/date';
import type { Event } from '@/types';
import { cn } from '@/lib/utils/cn';

interface EventCardProps {
  event: Event & { 
    fights_count?: number;
    user_picks_count?: number;
    isOpenForPicks?: boolean;
    opensAt?: Date | null;
  };
  isHighlight?: boolean;
}

export function EventCard({ event, isHighlight }: EventCardProps) {
  const eventDate = new Date(event.scheduled_date);
  const isEventToday = isToday(eventDate);
  const isEventPast = isPast(eventDate);
  const picksComplete = event.user_picks_count === event.fights_count;
  const isOpen = event.isOpenForPicks ?? true;

  return (
    <Link href={`/events/${event.id}`}>
      <Card 
        variant={isHighlight ? 'highlight' : 'hover'} 
        className={cn(
          'overflow-hidden',
          isHighlight && 'animate-pulse-red',
          !isOpen && !isEventPast && 'opacity-75'
        )}
      >
        {/* Header com gradiente */}
        <div className="relative h-24 bg-ufc-gradient flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-black/30" />
          <h3 className="relative font-bebas text-3xl text-white tracking-wider text-center px-4">
            {event.name}
          </h3>
          
          {isEventToday && (
            <Badge variant="gold" className="absolute top-3 right-3">
              HOJE
            </Badge>
          )}
          
          {isEventPast && !isEventToday && (
            <Badge variant="default" className="absolute top-3 right-3">
              ENCERRADO
            </Badge>
          )}

          {!isEventPast && !isEventToday && isOpen && (
            <Badge variant="success" className="absolute top-3 right-3">
              <Unlock size={12} className="mr-1" />
              ABERTO
            </Badge>
          )}

          {!isEventPast && !isOpen && (
            <Badge variant="warning" className="absolute top-3 right-3">
              <Lock size={12} className="mr-1" />
              FECHADO
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-4 text-sm text-ufc-gray-300 mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-ufc-red" />
              <span>{formatDate(event.scheduled_date)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-ufc-red" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {/* Indicador de quando abre */}
          {!isEventPast && !isOpen && event.opensAt && (
            <div className="mb-4 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm flex items-center gap-2">
                <Lock size={14} />
                Palpites abrem {formatRelative(event.opensAt)}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ufc-gray-400">
              <Swords size={16} />
              <span className="text-sm">
                {event.fights_count || 0} lutas
              </span>
            </div>

            {event.user_picks_count !== undefined && event.fights_count !== undefined && isOpen && (
              <div className={cn(
                'flex items-center gap-2 text-sm',
                picksComplete ? 'text-green-400' : 'text-ufc-gray-400'
              )}>
                {picksComplete ? (
                  <>
                    <CheckCircle size={16} />
                    <span>Palpites completos</span>
                  </>
                ) : (
                  <span>
                    {event.user_picks_count}/{event.fights_count} palpites
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
