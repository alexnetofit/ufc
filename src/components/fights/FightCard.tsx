'use client';

import Link from 'next/link';
import { Card, Badge, FighterImage } from '@/components/ui';
import { formatTime, canMakePick } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import type { Fight, Pick, FightStatus } from '@/types';
import { CheckCircle, Clock, AlertCircle, Ban, Lock } from 'lucide-react';

interface FightCardProps {
  fight: Fight & {
    fighter1_image_url?: string | null;
    fighter2_image_url?: string | null;
  };
  userPick?: Pick;
  showPickButton?: boolean;
  isEventOpen?: boolean;
}

const statusConfig: Record<FightStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: React.ReactNode }> = {
  scheduled: { label: 'Agendada', variant: 'info', icon: <Clock size={12} /> },
  live: { label: 'AO VIVO', variant: 'error', icon: <AlertCircle size={12} /> },
  finished: { label: 'Encerrada', variant: 'success', icon: <CheckCircle size={12} /> },
  cancelled: { label: 'Cancelada', variant: 'default', icon: <Ban size={12} /> },
};

// Construir URL do proxy de imagem baseado no fighter_id
function getFighterImageUrl(fighterId: number): string {
  return `/api/fighter-image/${fighterId}`;
}

export function FightCard({ fight, userPick, showPickButton = true, isEventOpen = true }: FightCardProps) {
  const status = statusConfig[fight.status];
  const canPick = isEventOpen && canMakePick(fight.scheduled_for) && fight.status === 'scheduled';
  const hasPick = !!userPick;
  const winner = fight.winner_code;

  // Usar URL passada ou construir do proxy
  const fighter1ImageUrl = fight.fighter1_image_url || getFighterImageUrl(fight.fighter1_id);
  const fighter2ImageUrl = fight.fighter2_image_url || getFighterImageUrl(fight.fighter2_id);
  
  return (
    <Card variant={hasPick ? 'highlight' : 'hover'} className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-ufc-gray-700">
        <div className="flex items-center gap-2">
          <Badge variant={status.variant} size="sm">
            <span className="flex items-center gap-1">
              {status.icon}
              {status.label}
            </span>
          </Badge>
          {fight.weight_class && (
            <Badge variant="default" size="sm">
              {fight.weight_class.toUpperCase()}
            </Badge>
          )}
        </div>
        <span className="text-ufc-gray-400 text-sm">
          {formatTime(fight.scheduled_for)}
        </span>
      </div>

      {/* Fighters */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          {/* Fighter 1 */}
          <div className={cn(
            'flex flex-col items-center flex-1 transition-opacity',
            winner === 2 && 'opacity-50'
          )}>
            <FighterImage
              fighterId={fight.fighter1_id}
              name={fight.fighter1_name}
              imageUrl={fighter1ImageUrl}
              size="lg"
              className={cn(
                winner === 1 && 'ring-4 ring-green-500',
                userPick?.predicted_winner === 1 && 'ring-4 ring-ufc-gold'
              )}
            />
            <h4 className="font-oswald text-lg text-white mt-3 text-center">
              {fight.fighter1_name.split(' ').slice(-1)[0].toUpperCase()}
            </h4>
            <p className="text-ufc-gray-400 text-xs mt-1">
              {fight.fighter1_name}
            </p>
            {winner === 1 && (
              <Badge variant="success" className="mt-2">
                VENCEDOR
              </Badge>
            )}
            {userPick?.predicted_winner === 1 && !winner && (
              <Badge variant="gold" className="mt-2">
                SEU PALPITE
              </Badge>
            )}
          </div>

          {/* VS */}
          <div className="flex flex-col items-center px-4">
            <div className="vs-badge w-12 h-12 rounded-full flex items-center justify-center">
              <span className="font-bebas text-xl text-white">VS</span>
            </div>
            {fight.fight_type === 'main' && (
              <Badge variant="gold" size="sm" className="mt-2">
                MAIN EVENT
              </Badge>
            )}
          </div>

          {/* Fighter 2 */}
          <div className={cn(
            'flex flex-col items-center flex-1 transition-opacity',
            winner === 1 && 'opacity-50'
          )}>
            <FighterImage
              fighterId={fight.fighter2_id}
              name={fight.fighter2_name}
              imageUrl={fighter2ImageUrl}
              size="lg"
              className={cn(
                winner === 2 && 'ring-4 ring-green-500',
                userPick?.predicted_winner === 2 && 'ring-4 ring-ufc-gold'
              )}
            />
            <h4 className="font-oswald text-lg text-white mt-3 text-center">
              {fight.fighter2_name.split(' ').slice(-1)[0].toUpperCase()}
            </h4>
            <p className="text-ufc-gray-400 text-xs mt-1">
              {fight.fighter2_name}
            </p>
            {winner === 2 && (
              <Badge variant="success" className="mt-2">
                VENCEDOR
              </Badge>
            )}
            {userPick?.predicted_winner === 2 && !winner && (
              <Badge variant="gold" className="mt-2">
                SEU PALPITE
              </Badge>
            )}
          </div>
        </div>

        {/* Result Info */}
        {fight.win_type && (
          <div className="mt-4 pt-4 border-t border-ufc-gray-700 text-center">
            <p className="text-ufc-gray-300 text-sm">
              Resultado: <span className="text-white font-medium">{fight.win_type}</span>
              {fight.round && (
                <span className="text-ufc-gray-400"> no Round {fight.round}</span>
              )}
            </p>
          </div>
        )}

        {/* User Pick Info */}
        {userPick && (
          <div className="mt-4 pt-4 border-t border-ufc-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ufc-gray-400">Seu palpite:</span>
              <div className="text-right">
                <span className="text-ufc-gold font-medium">
                  {userPick.predicted_winner === 1 ? fight.fighter1_name : fight.fighter2_name}
                </span>
                {userPick.predicted_method && (
                  <span className="text-ufc-gray-300 ml-2">
                    por {userPick.predicted_method}
                    {userPick.predicted_round && ` R${userPick.predicted_round}`}
                    {userPick.predicted_decision && ` ${userPick.predicted_decision}`}
                  </span>
                )}
              </div>
            </div>
            {userPick.points > 0 && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-ufc-gray-400">Pontos ganhos:</span>
                <span className="text-green-400 font-bold">+{userPick.points}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pick Button */}
      {showPickButton && (
        <div className="p-4 pt-0">
          {canPick ? (
            <Link
              href={`/picks/${fight.id}`}
              className={cn(
                'block w-full py-3 rounded-lg text-center font-bold transition-all',
                hasPick
                  ? 'bg-ufc-gold text-black hover:bg-yellow-500'
                  : 'bg-ufc-red text-white hover:bg-ufc-red-dark'
              )}
            >
              {hasPick ? 'EDITAR PALPITE' : 'FAZER PALPITE'}
            </Link>
          ) : !isEventOpen && fight.status === 'scheduled' ? (
            <div className="w-full py-3 rounded-lg text-center bg-yellow-500/20 text-yellow-400 font-medium flex items-center justify-center gap-2">
              <Lock size={16} />
              Evento ainda não aberto
            </div>
          ) : fight.status === 'scheduled' ? (
            <div className="w-full py-3 rounded-lg text-center bg-ufc-gray-700 text-ufc-gray-400 font-medium">
              Palpites encerrados
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
