import { createClient } from '@/lib/supabase/server';
import { getGlobalRanking, getAvailableMonths } from '@/lib/queries/ranking';
import { RankingTabs } from '@/components/ranking/RankingTabs';
import { GlobalRanking } from '@/components/ranking/GlobalRanking';
import { MonthlyRanking } from '@/components/ranking/MonthlyRanking';

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Buscar dados em paralelo
  const [globalRanking, availableMonths] = await Promise.all([
    getGlobalRanking(supabase),
    getAvailableMonths(supabase),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-4xl text-white tracking-wide">
          RANKING
        </h1>
        <p className="text-ufc-gray-400 mt-1">
          Os melhores palpiteiros do Fantasy MMA
        </p>
      </div>

      {/* Tabs com Ranking Global e Mensal */}
      <RankingTabs
        globalRankingContent={
          <GlobalRanking 
            rankings={globalRanking} 
            currentUserId={user?.id} 
          />
        }
        monthlyRankingContent={
          <MonthlyRanking 
            availableMonths={availableMonths} 
            currentUserId={user?.id} 
          />
        }
      />
    </div>
  );
}
