import { createClient } from '@/lib/supabase/server';
import { getAvailableEvents, getAvailableMonths } from '@/lib/queries/ranking';
import { RankingTabs } from '@/components/ranking/RankingTabs';
import { EventRanking } from '@/components/ranking/EventRanking';
import { MonthlyRanking } from '@/components/ranking/MonthlyRanking';

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Buscar dados em paralelo
  const [availableEvents, availableMonths] = await Promise.all([
    getAvailableEvents(supabase),
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
          Os melhores palpiteiros do Sigma UFC
        </p>
      </div>

      {/* Tabs com Ranking Por Evento e Mensal */}
      <RankingTabs
        eventRankingContent={
          <EventRanking 
            availableEvents={availableEvents} 
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
