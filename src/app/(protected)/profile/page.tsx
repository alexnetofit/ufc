'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, Camera, Save, Trophy, Target, TrendingUp, Calendar } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalPicks: 0,
    correctPicks: 0,
    eventsParticipated: 0,
  });
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setNickname(profileData.nickname);
      }

      // Buscar stats
      const { data: rankings } = await supabase
        .from('rankings')
        .select('total_points, picks_count, correct_picks')
        .eq('user_id', user.id);

      if (rankings) {
        setStats({
          totalPoints: rankings.reduce((acc, r) => acc + r.total_points, 0),
          totalPicks: rankings.reduce((acc, r) => acc + r.picks_count, 0),
          correctPicks: rankings.reduce((acc, r) => acc + r.correct_picks, 0),
          eventsParticipated: rankings.length,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    // Validação
    if (!nickname.trim()) {
      setError('Nickname é obrigatório');
      return;
    }
    if (nickname.length < 3) {
      setError('Nickname deve ter pelo menos 3 caracteres');
      return;
    }
    if (nickname.length > 20) {
      setError('Nickname deve ter no máximo 20 caracteres');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      setError('Nickname só pode ter letras, números e _');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Verificar se nickname já existe (se mudou)
      if (nickname !== profile.nickname) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('nickname', nickname)
          .neq('id', profile.id)
          .single();

        if (existing) {
          setError('Este nickname já está em uso');
          setIsSaving(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast.success('Perfil atualizado com sucesso!');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ufc-red"></div>
      </div>
    );
  }

  const accuracy = stats.totalPicks > 0 
    ? Math.round((stats.correctPicks / stats.totalPicks) * 100) 
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-4xl text-white tracking-wide">
          MEU PERFIL
        </h1>
        <p className="text-ufc-gray-400 mt-1">
          Gerencie suas informações e veja suas estatísticas
        </p>
      </div>

      {/* Avatar & Nickname */}
      <Card>
        <CardHeader>
          <h2 className="font-oswald text-xl text-white">Informações</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-ufc-gray-700 flex items-center justify-center border-4 border-ufc-gray-600">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.nickname}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="text-ufc-gray-400" size={48} />
                )}
              </div>
              <button 
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-ufc-red flex items-center justify-center hover:bg-ufc-red-dark transition-colors"
                title="Em breve: Upload de avatar"
                disabled
              >
                <Camera size={16} className="text-white" />
              </button>
            </div>
          </div>

          {/* Nickname */}
          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError('');
            }}
            error={error}
            placeholder="Seu apelido único"
          />

          <Button 
            onClick={handleSave} 
            isLoading={isSaving}
            disabled={nickname === profile?.nickname}
            className="w-full"
          >
            <Save size={18} className="mr-2" />
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <h2 className="font-oswald text-xl text-white">Estatísticas</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-ufc-gray-900">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="text-ufc-gold" size={20} />
                <span className="text-ufc-gray-400 text-sm">Pontos Totais</span>
              </div>
              <p className="font-bebas text-3xl text-white">{stats.totalPoints}</p>
            </div>

            <div className="p-4 rounded-xl bg-ufc-gray-900">
              <div className="flex items-center gap-3 mb-2">
                <Target className="text-ufc-red" size={20} />
                <span className="text-ufc-gray-400 text-sm">Palpites</span>
              </div>
              <p className="font-bebas text-3xl text-white">{stats.totalPicks}</p>
            </div>

            <div className="p-4 rounded-xl bg-ufc-gray-900">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-green-500" size={20} />
                <span className="text-ufc-gray-400 text-sm">Precisão</span>
              </div>
              <p className="font-bebas text-3xl text-white">{accuracy}%</p>
            </div>

            <div className="p-4 rounded-xl bg-ufc-gray-900">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-blue-500" size={20} />
                <span className="text-ufc-gray-400 text-sm">Eventos</span>
              </div>
              <p className="font-bebas text-3xl text-white">{stats.eventsParticipated}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

