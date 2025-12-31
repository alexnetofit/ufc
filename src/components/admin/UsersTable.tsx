'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Shield, ShieldOff, Search } from 'lucide-react';
import { Input } from '@/components/ui';
import type { UserSummary } from '@/types';

interface UsersTableProps {
  users: UserSummary[];
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredUsers = users.filter(user =>
    user.nickname.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setLoading(userId);
    try {
      const response = await fetch('/api/admin/users/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin: !currentIsAdmin }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar');

      toast.success(currentIsAdmin ? 'Admin removido' : 'Admin adicionado');
      router.refresh();
    } catch (error) {
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {/* Search */}
      <div className="p-4 border-b border-ufc-gray-700">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ufc-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Buscar por nickname..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
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
                Pontos
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Picks
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Precisão
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Pagamentos
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Total Pago
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ufc-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ufc-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.user_id} className="hover:bg-ufc-gray-800/50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ufc-gray-700 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.nickname} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-ufc-gray-400 font-medium">
                          {user.nickname.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.nickname}</p>
                      <p className="text-ufc-gray-400 text-xs">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-white font-medium">{user.total_points}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-ufc-gray-300">
                    {user.correct_picks}/{user.total_picks}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`font-medium ${
                    user.accuracy >= 60 ? 'text-green-400' :
                    user.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {user.accuracy.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-ufc-gray-300">{user.confirmed_payments}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-green-400">
                    R$ {(user.total_paid || 0).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  {user.is_admin ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-ufc-red/20 text-ufc-red">
                      <Shield size={12} className="mr-1" />
                      Admin
                    </span>
                  ) : (
                    <span className="text-ufc-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    onClick={() => toggleAdmin(user.user_id, user.is_admin)}
                    disabled={loading === user.user_id}
                    className={`p-2 rounded-lg transition-colors ${
                      user.is_admin
                        ? 'text-red-400 hover:bg-red-500/20'
                        : 'text-green-400 hover:bg-green-500/20'
                    } disabled:opacity-50`}
                    title={user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                  >
                    {user.is_admin ? <ShieldOff size={18} /> : <Shield size={18} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-ufc-gray-400">
            Nenhum usuário encontrado
          </div>
        )}
      </div>
    </div>
  );
}

