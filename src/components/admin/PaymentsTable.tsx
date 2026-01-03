'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui';
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types';
import type { PaymentWithProfile, PaymentStatus } from '@/types';

interface PaymentsTableProps {
  payments: PaymentWithProfile[];
}

const statusColors: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-purple-500/20 text-purple-400',
};

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.nickname.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (paymentId: string, newStatus: PaymentStatus) => {
    setLoading(paymentId);
    try {
      const response = await fetch('/api/admin/payments/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, status: newStatus }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar');

      toast.success(`Pagamento ${PAYMENT_STATUS_LABELS[newStatus].toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error('Erro ao atualizar pagamento');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b border-ufc-gray-700 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ufc-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Buscar por usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-ufc-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            className="bg-ufc-gray-800 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="confirmed">Confirmados</option>
            <option value="cancelled">Cancelados</option>
            <option value="refunded">Reembolsados</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ufc-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Método
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Referência
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ufc-gray-700">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-ufc-gray-800/50">
                <td className="px-4 py-4">
                  <p className="text-white font-medium">{payment.nickname}</p>
                  {payment.notes && (
                    <p className="text-ufc-gray-400 text-xs truncate max-w-[200px]">
                      {payment.notes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-white font-medium">
                    R$ {Number(payment.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-ufc-gray-300">
                    {PAYMENT_METHOD_LABELS[payment.payment_method]}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-ufc-gray-300">
                    {payment.reference_month || '-'}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-ufc-gray-400 text-sm">
                    {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  {payment.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => updateStatus(payment.id, 'confirmed')}
                        disabled={loading === payment.id}
                        className="p-2 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        title="Confirmar"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => updateStatus(payment.id, 'cancelled')}
                        disabled={loading === payment.id}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        title="Cancelar"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                  {payment.status === 'confirmed' && payment.confirmed_by_nickname && (
                    <span className="text-xs text-ufc-gray-500">
                      por {payment.confirmed_by_nickname}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPayments.length === 0 && (
          <div className="p-8 text-center text-ufc-gray-400">
            Nenhum pagamento encontrado
          </div>
        )}
      </div>
    </div>
  );
}




