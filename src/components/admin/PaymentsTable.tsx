'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui';

type PixPaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';

interface PixPaymentWithDetails {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  status: PixPaymentStatus;
  pix_id: string;
  created_at: string;
  paid_at: string | null;
  nickname: string;
  event_name: string;
}

interface PaymentsTableProps {
  payments: PixPaymentWithDetails[];
}

const PIX_STATUS_LABELS: Record<PixPaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

const statusColors: Record<PixPaymentStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-green-500/20 text-green-400',
  EXPIRED: 'bg-gray-500/20 text-gray-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PixPaymentStatus | 'all'>('all');

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.nickname.toLowerCase().includes(search.toLowerCase()) ||
      payment.event_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b border-ufc-gray-700 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ufc-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Buscar por usuário ou evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-ufc-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PixPaymentStatus | 'all')}
            className="bg-ufc-gray-800 text-white rounded-lg px-3 py-2 border border-ufc-gray-600 focus:border-ufc-red focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="PENDING">Pendentes</option>
            <option value="PAID">Pagos</option>
            <option value="EXPIRED">Expirados</option>
            <option value="CANCELLED">Cancelados</option>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Evento
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Criado em
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Pago em
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ufc-gray-700">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-ufc-gray-800/50">
                <td className="px-4 py-4">
                  <p className="text-white font-medium">{payment.nickname}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-ufc-gray-300">{payment.event_name}</p>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-white font-medium">
                    R$ {(Number(payment.amount) / 100).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                    {PIX_STATUS_LABELS[payment.status]}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-ufc-gray-400 text-sm">
                    {new Date(payment.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  {payment.paid_at ? (
                    <span className="text-green-400 text-sm">
                      {new Date(payment.paid_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  ) : (
                    <span className="text-ufc-gray-500 text-sm">-</span>
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
