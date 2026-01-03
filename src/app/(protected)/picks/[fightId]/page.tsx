import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PickWizard } from '@/components/picks/PickWizard';
import { canMakePick, canEventReceivePicks } from '@/lib/utils/date';
import type { Fight, Pick } from '@/types';

interface PickPageProps {
  params: Promise<{ fightId: string }>;
}

export default async function PickPage({ params }: PickPageProps) {
  const { fightId } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Buscar luta com evento
  const { data: fight, error } = await supabase
    .from('fights')
    .select('*, event:events(*)')
    .eq('id', fightId)
    .single();

  if (error || !fight) {
    notFound();
  }

  // Verificar se ainda pode fazer palpite na luta (1h antes)
  if (!canMakePick(fight.scheduled_for) || fight.status !== 'scheduled') {
    redirect(`/events/${fight.event_id}?error=picks_closed`);
  }

  // Verificar se o evento está aberto para palpites
  // Buscar evento anterior para calcular se está aberto
  const { data: previousEvents } = await supabase
    .from('events')
    .select('scheduled_date')
    .lt('scheduled_date', fight.event.scheduled_date)
    .order('scheduled_date', { ascending: false })
    .limit(1);

  const previousEventDate = previousEvents?.[0]?.scheduled_date || null;
  const isEventOpen = canEventReceivePicks(fight.event.scheduled_date, previousEventDate);

  if (!isEventOpen) {
    redirect(`/events/${fight.event_id}?error=event_not_open`);
  }

  // Verificar se usuário pagou para participar do evento
  const { data: eventEntry } = await supabase
    .from('event_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', fight.event_id)
    .single();

  if (!eventEntry) {
    redirect(`/events/${fight.event_id}?error=payment_required`);
  }

  // Buscar palpite existente
  const { data: existingPick } = await supabase
    .from('picks')
    .select('*')
    .eq('user_id', user.id)
    .eq('fight_id', fightId)
    .single();

  return (
    <PickWizard 
      fight={fight as Fight & { event: { id: string; name: string } }} 
      existingPick={existingPick as Pick | null}
      userId={user.id}
    />
  );
}
