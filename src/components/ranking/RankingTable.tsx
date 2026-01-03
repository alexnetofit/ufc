'use client';

import { cn } from '@/lib/utils/cn';

interface RankingEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  total_points: number;
  picks_count: number;
  correct_picks: number;
  accuracy: number;
}

interface RankingTableProps {
  rankings: RankingEntry[];
  startPosition?: number;
  currentUserId?: string;
}

export function RankingTable({ rankings, startPosition = 1, currentUserId }: RankingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-ufc-gray-700">
            <th className="text-left py-4 px-4 text-ufc-gray-400 font-medium text-sm">
              #
            </th>
            <th className="text-left py-4 px-4 text-ufc-gray-400 font-medium text-sm">
              JOGADOR
            </th>
            <th className="text-right py-4 px-4 text-ufc-gray-400 font-medium text-sm">
              PALPITES
            </th>
            <th className="text-right py-4 px-4 text-ufc-gray-400 font-medium text-sm">
              ACERTOS
            </th>
            <th className="text-right py-4 px-4 text-ufc-gray-400 font-medium text-sm">
              PRECISÃO
            </th>
            <th className="text-right py-4 px-4 text-ufc-gray-400 font-medium text-sm">
              PONTOS
            </th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((entry, index) => {
            const isCurrentUser = entry.user_id === currentUserId;
            const position = startPosition + index;

            return (
              <tr
                key={entry.user_id}
                className={cn(
                  'border-b border-ufc-gray-800 transition-colors',
                  isCurrentUser 
                    ? 'bg-ufc-gold/10 border-ufc-gold/30' 
                    : 'hover:bg-ufc-gray-800/50'
                )}
              >
                <td className="py-4 px-4">
                  <span className={cn(
                    'font-bebas text-xl',
                    isCurrentUser ? 'text-ufc-gold' : 'text-ufc-gray-400'
                  )}>
                    {position}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full bg-ufc-gray-700 flex items-center justify-center',
                      isCurrentUser && 'ring-2 ring-ufc-gold'
                    )}>
                      {entry.avatar_url ? (
                        <img 
                          src={entry.avatar_url} 
                          alt={entry.nickname}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-ufc-gray-400">
                          {entry.nickname.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      'font-medium',
                      isCurrentUser ? 'text-ufc-gold' : 'text-white'
                    )}>
                      {entry.nickname}
                      {isCurrentUser && ' (você)'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right text-ufc-gray-300">
                  {entry.picks_count}
                </td>
                <td className="py-4 px-4 text-right text-ufc-gray-300">
                  {entry.correct_picks}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={cn(
                    'font-medium',
                    entry.accuracy >= 70 ? 'text-green-400' :
                    entry.accuracy >= 50 ? 'text-yellow-400' :
                    'text-ufc-gray-400'
                  )}>
                    {entry.accuracy}%
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={cn(
                    'font-bebas text-xl',
                    isCurrentUser ? 'text-ufc-gold' : 'text-white'
                  )}>
                    {entry.total_points}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}




