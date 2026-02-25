import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEventWithUserPicks } from '@/lib/queries/events';
import { FightCard } from '@/components/fights/FightCard';
import { Badge } from '@/components/ui';
import { PixCheckout } from '@/components/pix';
import { formatDate, formatRelative } from '@/lib/utils/date';
import { ArrowLeft, Calendar, MapPin, Swords, Lock, Unlock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Fight, Pick } from '@/types';

export const dynamic = 'force-dynamic';

interface EventPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  payment_required: 'Você precisa pagar para participar antes de fazer palpites.',
  picks_closed: 'Os palpites para esta luta já foram encerrados.',
  event_not_open: 'Este evento ainda não está aberto para palpites.',
};

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Buscar evento com lutas e picks usando query otimizada
  const event = await getEventWithUserPicks(supabase, id, user.id);

  if (!event) {
    notFound();
  }

  // Verificar se usuário já tem entrada paga
  const { data: eventEntry } = await supabase
    .from('event_entries')
    .select('id, amount, created_at')
    .eq('user_id', user.id)
    .eq('event_id', id)
    .single();

  const hasPaidEntry = !!eventEntry;

  // Criar mapa de palpites
  const picksMap = new Map<string, Pick>();
  event.fights?.forEach((fight: Fight & { userPick?: Pick }) => {
    if (fight.userPick) {
      picksMap.set(fight.id, fight.userPick);
    }
  });

  // Agrupar lutas por tipo
  const allFights = (event.fights || []) as Fight[];
  const mainCard = allFights.filter(f => f.fight_type === 'main');
  const prelims = allFights.filter(f => f.fight_type === 'prelims');
  const earlyPrelims = allFights.filter(f => f.fight_type === 'earlyprelims');

  const totalFights = allFights.length;
  const totalPicks = picksMap.size;
  const isEventOpen = event.isOpenForPicks ?? true;

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link 
        href="/events" 
        className="inline-flex items-center gap-2 text-ufc-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Voltar para eventos</span>
      </Link>

      {/* Error Message */}
      {errorParam && ERROR_MESSAGES[errorParam] && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="text-red-500" size={20} />
          </div>
          <div>
            <h3 className="font-oswald text-lg text-white">Atenção</h3>
            <p className="text-red-400 text-sm">
              {ERROR_MESSAGES[errorParam]}
            </p>
          </div>
        </div>
      )}

      {/* Event Header */}
      <div className="relative overflow-hidden rounded-2xl bg-ufc-gradient p-8">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-wider">
              {event.name}
            </h1>
            {isEventOpen ? (
              <Badge variant="success" size="md" className="flex items-center gap-1">
                <Unlock size={14} />
                ABERTO
              </Badge>
            ) : (
              <Badge variant="warning" size="md" className="flex items-center gap-1">
                <Lock size={14} />
                FECHADO
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-ufc-gray-200">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-ufc-red" />
              <span>{formatDate(event.scheduled_date)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-ufc-red" />
                <span>{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Swords size={18} className="text-ufc-red" />
              <span>{totalFights} lutas</span>
            </div>
          </div>

          {/* Indicador de quando abre */}
          {!isEventOpen && event.opensAt && (
            <div className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg inline-block">
              <p className="text-yellow-400 flex items-center gap-2">
                <Lock size={16} />
                Palpites abrem {formatRelative(event.opensAt)}
              </p>
            </div>
          )}

          {isEventOpen && (
            <div className="mt-4 flex items-center gap-3">
              <Badge variant={totalPicks === totalFights ? 'success' : 'warning'} size="md">
                {totalPicks}/{totalFights} palpites feitos
              </Badge>
              {hasPaidEntry && (
                <Badge variant="success" size="md" className="flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  ENTRADA CONFIRMADA
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Seção de Pagamento PIX */}
      {isEventOpen && !hasPaidEntry && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-gold rounded"></span>
            PARTICIPAR DO EVENTO
          </h2>
          <div className="max-w-md">
            <PixCheckout eventId={id} eventName={event.name} />
          </div>
        </section>
      )}

      {/* Entrada Confirmada - Banner */}
      {hasPaidEntry && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="text-green-500" size={24} />
          </div>
          <div>
            <h3 className="font-oswald text-lg text-white">Participação Confirmada!</h3>
            <p className="text-green-400 text-sm">
              Você pagou R$ {((eventEntry?.amount || 0) / 100).toFixed(2)} para participar deste evento.
            </p>
          </div>
        </div>
      )}

      {/* Main Card */}
      {mainCard.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-gold rounded"></span>
            MAIN CARD ({mainCard.length} lutas)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {mainCard.map((fight) => (
              <FightCard 
                key={fight.id} 
                fight={fight} 
                userPick={picksMap.get(fight.id)}
                isEventOpen={isEventOpen}
                hasPaidEntry={hasPaidEntry}
              />
            ))}
          </div>
        </section>
      )}

      {/* Prelims */}
      {prelims.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-red rounded"></span>
            PRELIMINARES ({prelims.length} lutas)
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prelims.map((fight) => (
              <FightCard 
                key={fight.id} 
                fight={fight} 
                userPick={picksMap.get(fight.id)}
                isEventOpen={isEventOpen}
                hasPaidEntry={hasPaidEntry}
              />
            ))}
          </div>
        </section>
      )}

      {/* Early Prelims */}
      {earlyPrelims.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-gray-600 rounded"></span>
            EARLY PRELIMS ({earlyPrelims.length} lutas)
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earlyPrelims.map((fight) => (
              <FightCard 
                key={fight.id} 
                fight={fight} 
                userPick={picksMap.get(fight.id)}
                isEventOpen={isEventOpen}
                hasPaidEntry={hasPaidEntry}
              />
            ))}
          </div>
        </section>
      )}

      {/* No fights */}
      {totalFights === 0 && (
        <div className="text-center py-12">
          <Swords className="mx-auto text-ufc-gray-500 mb-4" size={48} />
          <h3 className="font-oswald text-xl text-white mb-2">
            Lutas ainda não divulgadas
          </h3>
          <p className="text-ufc-gray-400">
            As lutas deste evento serão sincronizadas em breve.
          </p>
        </div>
      )}
    </div>
  );
}
