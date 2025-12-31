'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Edit2, Save, X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui';
import { FighterImage } from '@/components/ui';
import { WEIGHT_CLASS_LABELS, WIN_TYPE_LABELS } from '@/types';
import type { Fight, FightStatus, WinType } from '@/types';

interface FightEditorProps {
  fight: Fight;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const STATUS_LABELS: Record<FightStatus, string> = {
  scheduled: 'Agendada',
  live: 'Ao Vivo',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<FightStatus, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400',
  live: 'bg-red-500/20 text-red-400 animate-pulse',
  finished: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
};

export function FightEditor({ fight, isEditing, onEdit, onCancel, onSave }: FightEditorProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fighter1_name: fight.fighter1_name,
    fighter2_name: fight.fighter2_name,
    weight_class: fight.weight_class || '',
    fight_type: fight.fight_type,
    status: fight.status,
    winner_code: fight.winner_code?.toString() || '',
    win_type: fight.win_type || '',
    round: fight.round?.toString() || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/fights/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fightId: fight.id,
          fighter1_name: formData.fighter1_name,
          fighter2_name: formData.fighter2_name,
          weight_class: formData.weight_class || null,
          fight_type: formData.fight_type,
          status: formData.status,
          winner_code: formData.winner_code ? parseInt(formData.winner_code) : null,
          win_type: formData.win_type || null,
          round: formData.round ? parseInt(formData.round) : null,
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast.success('Luta atualizada');
      onSave();
    } catch (error) {
      toast.error('Erro ao salvar luta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar esta luta? Os picks serão perdidos.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/fights/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fightId: fight.id }),
      });

      if (!response.ok) throw new Error('Erro ao deletar');

      toast.success('Luta deletada');
      onSave();
    } catch (error) {
      toast.error('Erro ao deletar luta');
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-ufc-gray-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ufc-gray-400 mb-1">Lutador 1</label>
            <Input
              value={formData.fighter1_name}
              onChange={(e) => setFormData({ ...formData, fighter1_name: e.target.value })}
              placeholder="Nome do lutador 1"
            />
          </div>
          <div>
            <label className="block text-xs text-ufc-gray-400 mb-1">Lutador 2</label>
            <Input
              value={formData.fighter2_name}
              onChange={(e) => setFormData({ ...formData, fighter2_name: e.target.value })}
              placeholder="Nome do lutador 2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-ufc-gray-400 mb-1">Categoria</label>
            <select
              value={formData.weight_class}
              onChange={(e) => setFormData({ ...formData, weight_class: e.target.value })}
              className="w-full bg-ufc-gray-700 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none text-sm"
            >
              <option value="">Selecione</option>
              {Object.entries(WEIGHT_CLASS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-ufc-gray-400 mb-1">Tipo</label>
            <select
              value={formData.fight_type}
              onChange={(e) => setFormData({ ...formData, fight_type: e.target.value })}
              className="w-full bg-ufc-gray-700 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none text-sm"
            >
              <option value="main">Main Card</option>
              <option value="prelims">Prelims</option>
              <option value="earlyprelims">Early Prelims</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-ufc-gray-400 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as FightStatus })}
              className="w-full bg-ufc-gray-700 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none text-sm"
            >
              <option value="scheduled">Agendada</option>
              <option value="live">Ao Vivo</option>
              <option value="finished">Finalizada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-ufc-gray-400 mb-1">Vencedor</label>
            <select
              value={formData.winner_code}
              onChange={(e) => setFormData({ ...formData, winner_code: e.target.value })}
              className="w-full bg-ufc-gray-700 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none text-sm"
            >
              <option value="">Sem vencedor</option>
              <option value="1">{formData.fighter1_name || 'Lutador 1'}</option>
              <option value="2">{formData.fighter2_name || 'Lutador 2'}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ufc-gray-400 mb-1">Tipo de Vitória</label>
            <select
              value={formData.win_type}
              onChange={(e) => setFormData({ ...formData, win_type: e.target.value })}
              className="w-full bg-ufc-gray-700 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none text-sm"
            >
              <option value="">Selecione</option>
              {Object.entries(WIN_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-ufc-gray-400 mb-1">Round</label>
            <select
              value={formData.round}
              onChange={(e) => setFormData({ ...formData, round: e.target.value })}
              className="w-full bg-ufc-gray-700 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none text-sm"
            >
              <option value="">Selecione</option>
              <option value="1">Round 1</option>
              <option value="2">Round 2</option>
              <option value="3">Round 3</option>
              <option value="4">Round 4</option>
              <option value="5">Round 5</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm"
          >
            <Trash2 size={16} />
            Deletar
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-ufc-gray-700 text-white rounded-lg hover:bg-ufc-gray-600 transition-colors text-sm"
            >
              <X size={16} />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-ufc-red text-white rounded-lg hover:bg-ufc-red/80 transition-colors text-sm"
            >
              <Save size={16} />
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ufc-gray-800 rounded-lg p-3 flex items-center justify-between hover:bg-ufc-gray-700/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Fighter 1 */}
        <div className="flex items-center gap-2">
          <FighterImage 
            fighterId={fight.fighter1_id} 
            name={fight.fighter1_name} 
            size="sm" 
          />
          <span className={`text-sm font-medium ${
            fight.winner_code === 1 ? 'text-green-400' : 'text-white'
          }`}>
            {fight.fighter1_name}
          </span>
        </div>

        <span className="text-ufc-gray-500 text-sm">vs</span>

        {/* Fighter 2 */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${
            fight.winner_code === 2 ? 'text-green-400' : 'text-white'
          }`}>
            {fight.fighter2_name}
          </span>
          <FighterImage 
            fighterId={fight.fighter2_id} 
            name={fight.fighter2_name} 
            size="sm" 
          />
        </div>

        {/* Category Badge */}
        {fight.weight_class && (
          <span className="hidden md:inline-block px-2 py-0.5 bg-ufc-gray-700 rounded text-xs text-ufc-gray-400">
            {WEIGHT_CLASS_LABELS[fight.weight_class] || fight.weight_class}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Status */}
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[fight.status]}`}>
          {STATUS_LABELS[fight.status]}
        </span>

        {/* Result */}
        {fight.status === 'finished' && fight.win_type && (
          <span className="text-xs text-ufc-gray-400">
            {WIN_TYPE_LABELS[fight.win_type]} {fight.round ? `R${fight.round}` : ''}
          </span>
        )}

        {/* Fight Type Badge */}
        <span className={`px-2 py-0.5 rounded text-xs ${
          fight.fight_type === 'main' 
            ? 'bg-ufc-red/20 text-ufc-red' 
            : 'bg-ufc-gray-700 text-ufc-gray-400'
        }`}>
          {fight.fight_type === 'main' ? 'Main' : 
           fight.fight_type === 'prelims' ? 'Prelims' : 'Early'}
        </span>

        {/* Edit Button */}
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-ufc-gray-400 hover:text-white hover:bg-ufc-gray-600 transition-colors"
        >
          <Edit2 size={16} />
        </button>
      </div>
    </div>
  );
}


