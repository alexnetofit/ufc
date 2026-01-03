'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Unlock, Check, AlertCircle, X, Lock } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  scheduled_date: string;
}

interface ManualEntry {
  id: string;
  event_id: string;
  event_name: string;
  created_at: string;
}

interface ReleaseEntryFormProps {
  userId: string;
  userName: string;
  availableEvents: Event[];
  manualEntries?: ManualEntry[];
}

export function ReleaseEntryForm({ userId, userName, availableEvents, manualEntries = [] }: ReleaseEntryFormProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);

  // Limpar mensagem após alguns segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleRelease = async () => {
    if (!selectedEventId) return;

    // Se não está confirmando, pedir confirmação
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/entries/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, eventId: selectedEventId }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setSelectedEventId('');
        // Recarregar a página para atualizar a lista de eventos disponíveis
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao liberar entrada' });
      }
    } catch (err) {
      console.error('Erro ao liberar entrada:', err);
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setIsLoading(false);
      setConfirming(false);
    }
  };

  const handleRevoke = async (eventId: string) => {
    // Se não está confirmando, pedir confirmação
    if (confirmingRevoke !== eventId) {
      setConfirmingRevoke(eventId);
      return;
    }

    setIsRevoking(eventId);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/entries/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, eventId }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Entrada revogada com sucesso' });
        // Recarregar a página para atualizar a lista
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao revogar entrada' });
      }
    } catch (err) {
      console.error('Erro ao revogar entrada:', err);
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setIsRevoking(null);
      setConfirmingRevoke(null);
    }
  };

  const handleCancel = () => {
    setConfirming(false);
  };

  const handleCancelRevoke = () => {
    setConfirmingRevoke(null);
  };

  const selectedEvent = availableEvents.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Seção: Entradas manuais existentes (para revogar) */}
      {manualEntries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-ufc-gray-400 flex items-center gap-2">
            <Lock size={14} />
            Entradas Liberadas Manualmente
          </h4>
          <div className="space-y-2">
            {manualEntries.map((entry) => (
              <div 
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg bg-ufc-gray-800 border border-ufc-gray-700"
              >
                <div>
                  <p className="text-white font-medium">{entry.event_name}</p>
                  <p className="text-ufc-gray-500 text-xs">
                    Liberado em {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {confirmingRevoke === entry.event_id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRevoke(entry.event_id)}
                      disabled={isRevoking === entry.event_id}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      {isRevoking === entry.event_id ? 'Revogando...' : 'Confirmar'}
                    </button>
                    <button
                      onClick={handleCancelRevoke}
                      disabled={isRevoking === entry.event_id}
                      className="px-3 py-1.5 rounded-lg bg-ufc-gray-700 text-ufc-gray-300 text-sm hover:bg-ufc-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRevoke(entry.event_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
                  >
                    <X size={14} />
                    Revogar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção: Liberar nova entrada */}
      {availableEvents.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-ufc-gray-400 flex items-center gap-2">
            <Unlock size={14} />
            Liberar Novo Evento
          </h4>
          
          {/* Select de eventos */}
          <div>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setConfirming(false);
              }}
              className="w-full p-3 rounded-lg bg-ufc-gray-800 border border-ufc-gray-700 text-white focus:border-ufc-gold focus:outline-none"
              disabled={isLoading}
            >
              <option value="">-- Selecione um evento --</option>
              {availableEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.scheduled_date).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>

          {/* Mensagem de confirmação */}
          {confirming && selectedEvent && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-yellow-400 font-medium">Confirmar liberação?</p>
                <p className="text-ufc-gray-400 text-sm mt-1">
                  Você vai liberar os palpites de <strong className="text-white">{userName}</strong> para o evento <strong className="text-white">{selectedEvent.name}</strong> sem necessidade de pagamento.
                </p>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            {confirming ? (
              <>
                <Button
                  onClick={handleRelease}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  <Check size={18} className="mr-2" />
                  Sim, Liberar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                onClick={handleRelease}
                disabled={!selectedEventId || isLoading}
                className="w-full"
              >
                <Unlock size={18} className="mr-2" />
                Liberar Palpites para este Evento
              </Button>
            )}
          </div>
        </div>
      ) : manualEntries.length === 0 ? (
        <div className="text-center py-4 text-ufc-gray-500">
          <Unlock size={24} className="mx-auto mb-2 opacity-50" />
          <p>Este usuário já possui entrada em todos os eventos disponíveis.</p>
        </div>
      ) : null}

      {/* Mensagem de resultado */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {message.type === 'success' ? (
            <Check className="text-green-500 flex-shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          )}
          <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {message.text}
          </p>
        </div>
      )}
    </div>
  );
}
