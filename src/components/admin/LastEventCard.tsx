'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, Button } from '@/components/ui';
import { Calendar, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LastEventCardProps {
  event: {
    id: string;
    name: string;
    scheduled_date: string;
    totalFights: number;
    finishedFights: number;
  } | null;
}

export function LastEventCard({ event }: LastEventCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!event) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-oswald text-white mb-4">ÚLTIMO EVENTO</h3>
        <p className="text-ufc-gray-400">Nenhum evento passado encontrado.</p>
      </Card>
    );
  }

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/events/fetch-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar resultados');
      }

      if (data.fightsUpdated > 0) {
        toast.success(`${data.fightsUpdated} lutas atualizadas, ${data.picksUpdated} palpites processados`);
      } else if (data.fightsAlreadyFinished === data.totalFights) {
        toast.info('Todas as lutas já estavam atualizadas');
      } else {
        toast.warning(data.message || 'Nenhum resultado encontrado');
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar resultados');
    } finally {
      setLoading(false);
    }
  };

  const allFinished = event.finishedFights === event.totalFights;
  const progressPercent = event.totalFights > 0 
    ? Math.round((event.finishedFights / event.totalFights) * 100) 
    : 0;

  return (
    <Card className="p-6 border-ufc-red/30">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-oswald text-white">ÚLTIMO EVENTO</h3>
        {allFinished ? (
          <span className="flex items-center gap-1 text-sm text-green-400">
            <CheckCircle size={14} />
            Completo
          </span>
        ) : (
          <span className="flex items-center gap-1 text-sm text-yellow-400">
            <Clock size={14} />
            Pendente
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-ufc-red/20 flex items-center justify-center">
          <Calendar className="text-ufc-red" size={24} />
        </div>
        <div>
          <h4 className="font-oswald text-xl text-white">{event.name}</h4>
          <p className="text-ufc-gray-400 text-sm">
            {format(new Date(event.scheduled_date), "d 'de' MMMM, yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-ufc-gray-400">Lutas finalizadas</span>
          <span className="text-white font-medium">
            {event.finishedFights} / {event.totalFights}
          </span>
        </div>
        <div className="w-full h-2 bg-ufc-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${allFinished ? 'bg-green-500' : 'bg-ufc-red'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <Button
        onClick={fetchResults}
        disabled={loading}
        className="w-full gap-2"
        variant={allFinished ? 'outline' : 'primary'}
      >
        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Buscando...' : 'Buscar Resultados'}
      </Button>
    </Card>
  );
}
