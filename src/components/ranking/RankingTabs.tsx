'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Swords, Calendar } from 'lucide-react';

interface RankingTabsProps {
  eventRankingContent: React.ReactNode;
  monthlyRankingContent: React.ReactNode;
}

export function RankingTabs({ eventRankingContent, monthlyRankingContent }: RankingTabsProps) {
  const [activeTab, setActiveTab] = useState<'event' | 'monthly'>('event');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-ufc-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('event')}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-md font-oswald transition-all',
            activeTab === 'event'
              ? 'bg-ufc-red text-white'
              : 'text-ufc-gray-400 hover:text-white hover:bg-ufc-gray-700'
          )}
        >
          <Swords size={18} />
          POR EVENTO
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-md font-oswald transition-all',
            activeTab === 'monthly'
              ? 'bg-ufc-red text-white'
              : 'text-ufc-gray-400 hover:text-white hover:bg-ufc-gray-700'
          )}
        >
          <Calendar size={18} />
          MENSAL
        </button>
      </div>

      {/* Content */}
      {activeTab === 'event' ? eventRankingContent : monthlyRankingContent}
    </div>
  );
}







