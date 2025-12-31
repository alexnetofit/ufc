'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { Input, Button } from '@/components/ui';

interface User {
  id: string;
  nickname: string;
}

interface AddPaymentButtonProps {
  users: User[];
}

export function AddPaymentButton({ users }: AddPaymentButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    payment_method: 'pix',
    reference_month: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.amount) {
      toast.error('Preencha usuário e valor');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar pagamento');

      toast.success('Pagamento registrado com sucesso');
      setIsOpen(false);
      setFormData({
        user_id: '',
        amount: '',
        payment_method: 'pix',
        reference_month: '',
        notes: '',
      });
      router.refresh();
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  // Generate month options for the last 12 months
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus size={18} />
        Novo Pagamento
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-ufc-gray-900 rounded-xl w-full max-w-md border border-ufc-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-ufc-gray-700">
              <h2 className="text-xl font-oswald text-white">NOVO PAGAMENTO</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-ufc-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ufc-gray-300 mb-1">
                  Usuário
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full bg-ufc-gray-800 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none"
                  required
                >
                  <option value="">Selecione um usuário</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nickname}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ufc-gray-300 mb-1">
                  Valor (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ufc-gray-300 mb-1">
                  Método de Pagamento
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full bg-ufc-gray-800 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none"
                >
                  <option value="pix">PIX</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ufc-gray-300 mb-1">
                  Mês de Referência
                </label>
                <select
                  value={formData.reference_month}
                  onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })}
                  className="w-full bg-ufc-gray-800 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none"
                >
                  <option value="">Selecione (opcional)</option>
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ufc-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-ufc-gray-800 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none resize-none"
                  rows={3}
                  placeholder="Opcional..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Salvando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

