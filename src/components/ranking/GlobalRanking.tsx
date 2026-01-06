import { RankingTable } from './RankingTable';
import { Card, Badge } from '@/components/ui';
import { Trophy, Medal, Award } from 'lucide-react';

interface RankingEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  total_points: number;
  picks_count: number;
  correct_picks: number;
  accuracy: number;
}

interface GlobalRankingProps {
  rankings: RankingEntry[];
  currentUserId?: string;
}

export function GlobalRanking({ rankings, currentUserId }: GlobalRankingProps) {
  // Encontrar posição do usuário
  const userPosition = rankings.findIndex(r => r.user_id === currentUserId);
  const userRanking = userPosition >= 0 ? rankings[userPosition] : null;

  // Top 3
  const top3 = rankings.slice(0, 3);
  const restOfRanking = rankings.slice(3);

  return (
    <div className="space-y-8">
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
        <section>
          <h2 className="font-oswald text-xl text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-gold rounded"></span>
            TOP 3
          </h2>

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
        </section>
      )}

      {/* Full Ranking Table */}
      {restOfRanking.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-gray-600 rounded"></span>
            RANKING COMPLETO
          </h2>

          <RankingTable 
            rankings={restOfRanking} 
            startPosition={4}
            currentUserId={currentUserId}
          />
        </section>
      )}

      {/* Empty State */}
      {rankings.length === 0 && (
        <Card className="py-12 text-center">
          <Trophy className="mx-auto text-ufc-gray-500 mb-4" size={48} />
          <h3 className="font-oswald text-xl text-white mb-2">
            Ranking vazio
          </h3>
          <p className="text-ufc-gray-400">
            Faça palpites para aparecer no ranking!
          </p>
        </Card>
      )}
    </div>
  );
}






