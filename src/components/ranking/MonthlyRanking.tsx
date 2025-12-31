'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RankingTable } from './RankingTable';
import { Card, Badge } from '@/components/ui';
import { Trophy, Medal, Award, Calendar } from 'lucide-react';
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

interface MonthOption {
  year: number;
  month: number;
}

interface MonthlyRankingProps {
  availableMonths: MonthOption[];
  currentUserId?: string;
}

export function MonthlyRanking({ availableMonths, currentUserId }: MonthlyRankingProps) {
  const [selectedMonth, setSelectedMonth] = useState<MonthOption | null>(
    availableMonths[0] || null
  );
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedMonth) return;

    async function fetchRanking() {
      setLoading(true);
      const supabase = createClient();
      
      // Calcular início e fim do mês
      const startOfMonth = new Date(selectedMonth.year, selectedMonth.month - 1, 1).toISOString();
      const endOfMonth = new Date(selectedMonth.year, selectedMonth.month, 0, 23, 59, 59).toISOString();

      // Buscar rankings com eventos do mês
      const { data: rankings } = await supabase
        .from('rankings')
        .select(`
          user_id,
          total_points,
          picks_count,
          correct_picks,
          events!inner(scheduled_date),
          profiles!inner(nickname, avatar_url)
        `)
        .gte('events.scheduled_date', startOfMonth)
        .lte('events.scheduled_date', endOfMonth);

      if (!rankings || rankings.length === 0) {
        setRanking([]);
        setLoading(false);
        return;
      }

      // Agrupar por usuário e somar pontos
      const userMap = new Map<string, {
        user_id: string;
        nickname: string;
        avatar_url: string | null;
        total_points: number;
        picks_count: number;
        correct_picks: number;
      }>();

      for (const r of rankings) {
        const existing = userMap.get(r.user_id);
        const profile = r.profiles as { nickname: string; avatar_url: string | null };
        
        if (existing) {
          existing.total_points += r.total_points;
          existing.picks_count += r.picks_count;
          existing.correct_picks += r.correct_picks;
        } else {
          userMap.set(r.user_id, {
            user_id: r.user_id,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            total_points: r.total_points,
            picks_count: r.picks_count,
            correct_picks: r.correct_picks,
          });
        }
      }

      // Converter para array, calcular accuracy e ordenar
      const result = Array.from(userMap.values()).map(user => ({
        ...user,
        accuracy: user.picks_count > 0 
          ? Math.round((user.correct_picks / user.picks_count) * 100) 
          : 0,
      }));

      setRanking(result.sort((a, b) => b.total_points - a.total_points));
      setLoading(false);
    }

    fetchRanking();
  }, [selectedMonth]);

  const formatMonthLabel = (opt: MonthOption) => {
    const date = new Date(opt.year, opt.month - 1, 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  // Top 3
  const top3 = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);

  // Encontrar posição do usuário
  const userPosition = ranking.findIndex(r => r.user_id === currentUserId);
  const userRanking = userPosition >= 0 ? ranking[userPosition] : null;

  if (availableMonths.length === 0) {
    return (
      <Card className="py-12 text-center">
        <Calendar className="mx-auto text-ufc-gray-500 mb-4" size={48} />
        <h3 className="font-oswald text-xl text-white mb-2">
          Sem dados disponíveis
        </h3>
        <p className="text-ufc-gray-400">
          Ainda não há eventos finalizados para exibir ranking mensal.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Mês */}
      <div className="flex items-center gap-4">
        <label className="text-ufc-gray-400 text-sm">Selecione o mês:</label>
        <select
          value={selectedMonth ? `${selectedMonth.year}-${selectedMonth.month}` : ''}
          onChange={(e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            setSelectedMonth({ year, month });
          }}
          className="bg-ufc-gray-800 border border-ufc-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-ufc-red"
        >
          {availableMonths.map((opt) => (
            <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
              {formatMonthLabel(opt)}
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
            Nenhum dado para este mês
          </h3>
          <p className="text-ufc-gray-400">
            Não há eventos finalizados neste período.
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
                    <h3 className="font-oswald text-xl text-white">Sua Posição no Mês</h3>
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

