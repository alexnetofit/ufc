'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RankingTable } from './RankingTable';
import { Card, Badge } from '@/components/ui';
import { Trophy, Medal, Award, Swords } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RankingEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  total_points: number;
  picks_count: number;
  correct_picks: number;
  accuracy: number;
}

interface EventOption {
  id: string;
  name: string;
  scheduled_date: string;
}

interface EventRankingProps {
  availableEvents: EventOption[];
  currentUserId?: string;
}

export function EventRanking({ availableEvents, currentUserId }: EventRankingProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(
    availableEvents[0] || null
  );
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedEvent) return;

    const eventId = selectedEvent.id;

    async function fetchRanking() {
      setLoading(true);
      const supabase = createClient();

      const { data: rankings } = await supabase
        .from('rankings')
        .select(`
          user_id,
          total_points,
          picks_count,
          correct_picks,
          profiles!inner(nickname, avatar_url)
        `)
        .eq('event_id', eventId);

      if (!rankings || rankings.length === 0) {
        setRanking([]);
        setLoading(false);
        return;
      }

      // Processar rankings
      const result = rankings.map(r => {
        const profileData = r.profiles;
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        
        return {
          user_id: r.user_id,
          nickname: profile?.nickname || 'Usuário',
          avatar_url: profile?.avatar_url || null,
          total_points: r.total_points,
          picks_count: r.picks_count,
          correct_picks: r.correct_picks,
          accuracy: r.picks_count > 0 
            ? Math.round((r.correct_picks / r.picks_count) * 100) 
            : 0,
        };
      });

      setRanking(result.sort((a, b) => b.total_points - a.total_points));
      setLoading(false);
    }

    fetchRanking();
  }, [selectedEvent]);

  const formatEventLabel = (event: EventOption) => {
    const date = new Date(event.scheduled_date);
    return `${event.name} - ${format(date, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  // Top 3
  const top3 = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);

  // Encontrar posição do usuário
  const userPosition = ranking.findIndex(r => r.user_id === currentUserId);
  const userRanking = userPosition >= 0 ? ranking[userPosition] : null;

  if (availableEvents.length === 0) {
    return (
      <Card className="py-12 text-center">
        <Swords className="mx-auto text-ufc-gray-500 mb-4" size={48} />
        <h3 className="font-oswald text-xl text-white mb-2">
          Sem eventos disponíveis
        </h3>
        <p className="text-ufc-gray-400">
          Ainda não há eventos para exibir ranking.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Evento */}
      <div className="flex items-center gap-4">
        <label className="text-ufc-gray-400 text-sm">Selecione o evento:</label>
        <select
          value={selectedEvent?.id || ''}
          onChange={(e) => {
            const event = availableEvents.find(ev => ev.id === e.target.value);
            setSelectedEvent(event || null);
          }}
          className="bg-ufc-gray-800 border border-ufc-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-ufc-red min-w-[300px]"
        >
          {availableEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {formatEventLabel(event)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-ufc-gray-800 rounded-lg animate-pulse" />
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-ufc-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : ranking.length === 0 ? (
        <Card className="py-12 text-center">
          <Trophy className="mx-auto text-ufc-gray-500 mb-4" size={48} />
          <h3 className="font-oswald text-xl text-white mb-2">
            Nenhum dado para este evento
          </h3>
          <p className="text-ufc-gray-400">
            Este evento ainda não possui resultados ou palpites processados.
          </p>
        </Card>
      ) : (
        <>
          {/* User Position Card */}
          {userRanking && (
            <Card className="p-6 border-ufc-gold/50 bg-ufc-gold/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-ufc-gold/20 flex items-center justify-center">
                    <span className="font-bebas text-3xl text-ufc-gold">
                      #{userPosition + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-oswald text-xl text-white">Sua Posição</h3>
                    <p className="text-ufc-gray-400">
                      {userRanking.picks_count} palpites • {userRanking.accuracy}% de precisão
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bebas text-4xl text-ufc-gold">
                    {userRanking.total_points}
                  </p>
                  <p className="text-ufc-gray-400 text-sm">pontos</p>
                </div>
              </div>
            </Card>
          )}

          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <>
              <h3 className="font-oswald text-lg text-white border-l-4 border-ufc-red pl-3">
                TOP 3
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {/* 2nd Place */}
                {top3[1] && (
                  <Card className="p-6 order-1 md:order-first">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gray-400/20 flex items-center justify-center mb-4">
                        <Medal className="text-gray-400" size={32} />
                      </div>
                      <Badge variant="default" className="mb-2">2º LUGAR</Badge>
                      <h3 className="font-oswald text-xl text-white mt-2">
                        {top3[1].nickname}
                      </h3>
                      <p className="font-bebas text-3xl text-gray-400 mt-2">
                        {top3[1].total_points} PTS
                      </p>
                      <p className="text-ufc-gray-500 text-sm mt-1">
                        {top3[1].accuracy}% precisão
                      </p>
                    </div>
                  </Card>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <Card className="p-6 border-ufc-gold bg-ufc-gold/10 order-first md:order-1">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto rounded-full bg-ufc-gold/20 flex items-center justify-center mb-4">
                        <Trophy className="text-ufc-gold" size={40} />
                      </div>
                      <Badge variant="gold" className="mb-2">1º LUGAR</Badge>
                      <h3 className="font-oswald text-2xl text-white mt-2">
                        {top3[0].nickname}
                      </h3>
                      <p className="font-bebas text-4xl text-ufc-gold mt-2">
                        {top3[0].total_points} PTS
                      </p>
                      <p className="text-ufc-gray-400 text-sm mt-1">
                        {top3[0].accuracy}% precisão
                      </p>
                    </div>
                  </Card>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <Card className="p-6 order-2">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto rounded-full bg-amber-700/20 flex items-center justify-center mb-4">
                        <Award className="text-amber-700" size={32} />
                      </div>
                      <Badge variant="default" className="mb-2">3º LUGAR</Badge>
                      <h3 className="font-oswald text-xl text-white mt-2">
                        {top3[2].nickname}
                      </h3>
                      <p className="font-bebas text-3xl text-amber-700 mt-2">
                        {top3[2].total_points} PTS
                      </p>
                      <p className="text-ufc-gray-500 text-sm mt-1">
                        {top3[2].accuracy}% precisão
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* Full Ranking Table */}
          {restOfRanking.length > 0 && (
            <RankingTable 
              rankings={restOfRanking} 
              startPosition={4}
              currentUserId={currentUserId}
            />
          )}
        </>
      )}
    </div>
  );
}

