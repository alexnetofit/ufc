'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Trophy, Calendar } from 'lucide-react';

interface RankingTabsProps {
  globalRankingContent: React.ReactNode;
  monthlyRankingContent: React.ReactNode;
}

export function RankingTabs({ globalRankingContent, monthlyRankingContent }: RankingTabsProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'monthly'>('global');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-ufc-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('global')}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-md font-oswald transition-all',
            activeTab === 'global'
              ? 'bg-ufc-red text-white'
              : 'text-ufc-gray-400 hover:text-white hover:bg-ufc-gray-700'
          )}
        >
          <Trophy size={18} />
          GERAL
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
      {activeTab === 'global' ? globalRankingContent : monthlyRankingContent}
    </div>
  );
}

