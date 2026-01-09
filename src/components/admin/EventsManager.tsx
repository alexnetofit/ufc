'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Trash2,
  Save,
  X,
  Calendar,
  Clock
} from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { FightEditor } from './FightEditor';
import type { Event, Fight, FightStatus, WinType } from '@/types';

interface EventWithFights extends Event {
  fights: Fight[];
}

interface EventsManagerProps {
  events: EventWithFights[];
  upcomingCount: number;
  pastCount: number;
}

export function EventsManager({ events, upcomingCount, pastCount }: EventsManagerProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [editingFight, setEditingFight] = useState<string | null>(null);
  const [eventFormData, setEventFormData] = useState<{
    name: string;
    scheduled_date: string;
    location: string;
  }>({ name: '', scheduled_date: '', location: '' });

  const syncEvents = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/events/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar');
      }

      toast.success(`Sincronizado! ${data.eventsCreated || 0} eventos, ${data.fightsCreated || 0} lutas`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao sincronizar eventos');
    } finally {
      setSyncing(false);
    }
  };

  const startEditEvent = (event: EventWithFights) => {
    setEditingEvent(event.id);
    setEventFormData({
      name: event.name,
      scheduled_date: event.scheduled_date.slice(0, 16),
      location: event.location || '',
    });
  };

  const saveEvent = async (eventId: string) => {
    try {
      const response = await fetch('/api/admin/events/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...eventFormData,
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast.success('Evento atualizado');
      setEditingEvent(null);
      router.refresh();
    } catch (error) {
      toast.error('Erro ao salvar evento');
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Tem certeza? Isso vai deletar todas as lutas e picks deste evento.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/events/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      if (!response.ok) throw new Error('Erro ao deletar');

      toast.success('Evento deletado');
      router.refresh();
    } catch (error) {
      toast.error('Erro ao deletar evento');
    }
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  return (
    <div className="space-y-6">
      {/* Sync Button */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-oswald text-white">SINCRONIZAR COM API</h3>
            <p className="text-ufc-gray-400 text-sm">
              Busca os próximos eventos do UFC automaticamente
            </p>
          </div>
          <Button
            onClick={syncEvents}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Buscar Eventos'}
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <p className="text-ufc-gray-400 text-sm">Próximos Eventos</p>
          <p className="text-2xl font-bebas text-white">{upcomingCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-ufc-gray-400 text-sm">Eventos Passados</p>
          <p className="text-2xl font-bebas text-ufc-gray-500">{pastCount}</p>
        </Card>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.map((event) => {
          const isExpanded = expandedEvent === event.id;
          const isEditing = editingEvent === event.id;
          const isPast = new Date(event.scheduled_date) <= new Date();
          const fightsCount = event.fights?.length || 0;

          return (
            <Card key={event.id} className="overflow-hidden">
              {/* Event Header */}
              <div 
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-ufc-gray-800/50 transition-colors ${
                  isPast ? 'opacity-60' : ''
                }`}
                onClick={() => !isEditing && toggleExpand(event.id)}
              >
                {isEditing ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={eventFormData.name}
                      onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                      placeholder="Nome do evento"
                    />
                    <Input
                      type="datetime-local"
                      value={eventFormData.scheduled_date}
                      onChange={(e) => setEventFormData({ ...eventFormData, scheduled_date: e.target.value })}
                    />
                    <Input
                      value={eventFormData.location}
                      onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                      placeholder="Local"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-ufc-gray-800 flex items-center justify-center">
                      <Calendar className="text-ufc-red" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-oswald text-lg">{event.name}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-ufc-gray-400 flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(event.scheduled_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {event.location && (
                          <span className="text-ufc-gray-500">📍 {event.location}</span>
                        )}
                        <span className="text-ufc-gray-500">🥊 {fightsCount} lutas</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEvent(event.id)}
                        className="p-2 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors"
                      >
                        <Save size={18} />
                      </button>
                      <button
                        onClick={() => setEditingEvent(null)}
                        className="p-2 rounded-lg text-ufc-gray-400 hover:bg-ufc-gray-700 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditEvent(event)}
                        className="p-2 rounded-lg text-ufc-gray-400 hover:text-white hover:bg-ufc-gray-700 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button className="p-2 text-ufc-gray-400">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Fights List */}
              {isExpanded && (
                <div className="border-t border-ufc-gray-700">
                  <div className="p-4 bg-ufc-gray-800/30">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-ufc-gray-300 uppercase tracking-wider">
                        Lutas do Evento
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // TODO: Implementar adição de luta
                          toast.info('Em breve: adicionar luta manualmente');
                        }}
                        className="gap-1"
                      >
                        <Plus size={14} />
                        Adicionar Luta
                      </Button>
                    </div>

                    {event.fights && event.fights.length > 0 ? (
                      <div className="space-y-2">
                        {event.fights
                          .sort((a, b) => {
                            const order: Record<string, number> = { main: 0, prelims: 1, earlyprelims: 2 };
                            return (order[a.fight_type] || 1) - (order[b.fight_type] || 1);
                          })
                          .map((fight) => (
                            <FightEditor
                              key={fight.id}
                              fight={fight}
                              isEditing={editingFight === fight.id}
                              onEdit={() => setEditingFight(fight.id)}
                              onCancel={() => setEditingFight(null)}
                              onSave={() => {
                                setEditingFight(null);
                                router.refresh();
                              }}
                            />
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-ufc-gray-500">
                        Nenhuma luta cadastrada
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {events.length === 0 && (
          <Card className="p-12 text-center">
            <Calendar className="mx-auto text-ufc-gray-600 mb-4" size={48} />
            <h3 className="text-xl font-oswald text-white mb-2">Nenhum evento cadastrado</h3>
            <p className="text-ufc-gray-400 mb-4">
              Clique em &quot;Buscar Eventos&quot; para sincronizar com a API
            </p>
            <Button onClick={syncEvents} disabled={syncing}>
              <RefreshCw size={18} className={syncing ? 'animate-spin mr-2' : 'mr-2'} />
              Buscar Eventos
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}








