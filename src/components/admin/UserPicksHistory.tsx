'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui';
import { CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Fight {
  id: string;
  fighter1_name: string;
  fighter2_name: string;
  winner_code: number | null;
  status: string;
  event_id: string;
  events?: {
    id: string;
    name: string;
    scheduled_date: string;
  };
}

interface Pick {
  id: string;
  predicted_winner: number;
  predicted_method: string | null;
  predicted_round: number | null;
  predicted_decision: string | null;
  points: number;
  created_at: string;
  fights: Fight;
}

interface UserPicksHistoryProps {
  picks: Pick[];
}

export function UserPicksHistory({ picks }: UserPicksHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'pending'>('all');

  // Agrupar picks por evento
  const picksByEvent = picks.reduce((acc, pick) => {
    const eventName = pick.fights?.events?.name || 'Evento Desconhecido';
    if (!acc[eventName]) {
      acc[eventName] = {
        eventDate: pick.fights?.events?.scheduled_date || '',
        picks: [],
      };
    }
    acc[eventName].picks.push(pick);
    return acc;
  }, {} as Record<string, { eventDate: string; picks: Pick[] }>);

  // Filtrar picks
  const getPickStatus = (pick: Pick): 'correct' | 'wrong' | 'pending' => {
    if (pick.fights?.status !== 'finished') return 'pending';
    return pick.points > 0 ? 'correct' : 'wrong';
  };

  const filteredPicksByEvent = Object.entries(picksByEvent).reduce((acc, [eventName, data]) => {
    const filteredPicks = data.picks.filter(pick => {
      if (filter === 'all') return true;
      return getPickStatus(pick) === filter;
    });
    
    if (filteredPicks.length > 0) {
      acc[eventName] = { ...data, picks: filteredPicks };
    }
    return acc;
  }, {} as typeof picksByEvent);

  // Estatísticas
  const totalPicks = picks.length;
  const correctPicks = picks.filter(p => p.points > 0).length;
  const wrongPicks = picks.filter(p => p.fights?.status === 'finished' && p.points === 0).length;
  const pendingPicks = picks.filter(p => p.fights?.status !== 'finished').length;

  if (picks.length === 0) {
    return (
      <div className="text-center py-8 text-ufc-gray-500">
        <Clock size={32} className="mx-auto mb-2 opacity-50" />
        <p>Nenhum palpite registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={16} className="text-ufc-gray-500" />
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            filter === 'all' 
              ? 'bg-ufc-red text-white' 
              : 'bg-ufc-gray-800 text-ufc-gray-400 hover:bg-ufc-gray-700'
          }`}
        >
          Todos ({totalPicks})
        </button>
        <button
          onClick={() => setFilter('correct')}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            filter === 'correct' 
              ? 'bg-green-600 text-white' 
              : 'bg-ufc-gray-800 text-ufc-gray-400 hover:bg-ufc-gray-700'
          }`}
        >
          Acertos ({correctPicks})
        </button>
        <button
          onClick={() => setFilter('wrong')}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            filter === 'wrong' 
              ? 'bg-red-600 text-white' 
              : 'bg-ufc-gray-800 text-ufc-gray-400 hover:bg-ufc-gray-700'
          }`}
        >
          Erros ({wrongPicks})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            filter === 'pending' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-ufc-gray-800 text-ufc-gray-400 hover:bg-ufc-gray-700'
          }`}
        >
          Pendentes ({pendingPicks})
        </button>
      </div>

      {/* Lista de Picks por Evento */}
      {Object.entries(filteredPicksByEvent)
        .sort(([, a], [, b]) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
        .map(([eventName, data]) => (
          <div key={eventName} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-oswald text-lg text-white">{eventName}</h3>
              <span className="text-ufc-gray-500 text-sm">
                {data.eventDate && format(new Date(data.eventDate), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>

            <div className="space-y-2">
              {data.picks.map((pick) => {
                const status = getPickStatus(pick);
                const predictedFighter = pick.predicted_winner === 1 
                  ? pick.fights?.fighter1_name 
                  : pick.fights?.fighter2_name;

                return (
                  <div 
                    key={pick.id}
                    className={`p-4 rounded-lg border ${
                      status === 'correct' 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : status === 'wrong'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-ufc-gray-800 border-ufc-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {status === 'correct' && <CheckCircle size={16} className="text-green-500" />}
                          {status === 'wrong' && <XCircle size={16} className="text-red-500" />}
                          {status === 'pending' && <Clock size={16} className="text-yellow-500" />}
                          
                          <span className="text-white font-medium">
                            {pick.fights?.fighter1_name} vs {pick.fights?.fighter2_name}
                          </span>
                        </div>

                        <p className="text-ufc-gray-400 text-sm ml-6">
                          Palpite: <span className="text-ufc-gold">{predictedFighter}</span>
                          {pick.predicted_method && (
                            <span className="ml-2">por {pick.predicted_method}</span>
                          )}
                          {pick.predicted_round && (
                            <span className="ml-1">R{pick.predicted_round}</span>
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        {status !== 'pending' && (
                          <Badge variant={status === 'correct' ? 'success' : 'error'}>
                            {pick.points > 0 ? `+${pick.points} pts` : '0 pts'}
                          </Badge>
                        )}
                        {status === 'pending' && (
                          <Badge variant="warning">Aguardando</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {Object.keys(filteredPicksByEvent).length === 0 && (
        <div className="text-center py-8 text-ufc-gray-500">
          <p>Nenhum palpite encontrado com este filtro</p>
        </div>
      )}
    </div>
  );
}

