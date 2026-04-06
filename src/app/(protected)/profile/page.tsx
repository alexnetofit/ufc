'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, Camera, Save, Trophy, Target, TrendingUp, Calendar, Mail, Key, LogOut, Loader2, CreditCard, Phone } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  formatCPF,
  formatPhoneBR,
  isValidCPF,
  isValidPhoneBR,
} from '@/lib/validation/brazilian-person';
import type { Profile } from '@/types';

type ProfileFormErrors = {
  nickname?: string;
  fullName?: string;
  cpf?: string;
  phone?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalPicks: 0,
    correctPicks: 0,
    eventsParticipated: 0,
  });
  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || '');

      // Buscar profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setNickname(profileData.nickname);
        setFullName(profileData.full_name?.trim() ?? '');
        setCpf(profileData.cpf ? formatCPF(profileData.cpf) : '');
        setPhone(profileData.phone ? formatPhoneBR(profileData.phone) : '');
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

    const errors: ProfileFormErrors = {};
    if (!nickname.trim()) {
      errors.nickname = 'Nickname é obrigatório';
    } else if (nickname.length < 3) {
      errors.nickname = 'Nickname deve ter pelo menos 3 caracteres';
    } else if (nickname.length > 20) {
      errors.nickname = 'Nickname deve ter no máximo 20 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      errors.nickname = 'Nickname só pode ter letras, números e _';
    }

    const cpfDigits = cpf.replace(/\D/g, '');
    const phoneDigits = phone.replace(/\D/g, '');
    const nameTrim = fullName.trim();
    const hasPixFields =
      cpfDigits.length > 0 || phoneDigits.length > 0 || nameTrim.length > 0;

    if (hasPixFields) {
      if (nameTrim.split(/\s+/).filter(Boolean).length < 2) {
        errors.fullName = 'Digite nome e sobrenome';
      }
      if (!cpfDigits) {
        errors.cpf = 'CPF é obrigatório para pagamento PIX';
      } else if (!isValidCPF(cpf)) {
        errors.cpf = 'CPF inválido';
      }
      if (!phoneDigits) {
        errors.phone = 'WhatsApp é obrigatório para pagamento PIX';
      } else if (!isValidPhoneBR(phone)) {
        errors.phone = 'WhatsApp inválido (DDD + número)';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setFormErrors({});

    try {
      if (nickname !== profile.nickname) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('nickname', nickname)
          .neq('id', profile.id)
          .single();

        if (existing) {
          setFormErrors({ nickname: 'Este nickname já está em uso' });
          setIsSaving(false);
          return;
        }
      }

      if (cpfDigits && cpfDigits !== (profile.cpf ?? '')) {
        const { data: existingCpf } = await supabase
          .from('profiles')
          .select('id')
          .eq('cpf', cpfDigits)
          .neq('id', profile.id)
          .maybeSingle();

        if (existingCpf) {
          setFormErrors({ cpf: 'Este CPF já está cadastrado' });
          setIsSaving(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname,
          full_name: nameTrim || null,
          cpf: cpfDigits || null,
          phone: phoneDigits || null,
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({
        ...profile,
        nickname,
        full_name: nameTrim || null,
        cpf: cpfDigits || null,
        phone: phoneDigits || null,
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    // Validar tamanho (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Determinar extensão
      const ext = file.type.split('/')[1];
      const filePath = `${profile.id}.${ext}`;

      // Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar profile com nova URL (adicionar timestamp para cache bust)
      const avatarUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrlWithCacheBust })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: avatarUrlWithCacheBust });
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao enviar foto. Verifique se o bucket "avatars" existe no Supabase.');
    } finally {
      setIsUploadingAvatar(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetPassword = async () => {
    if (!userEmail) return;

    setIsSendingReset(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Erro ao sair');
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

  const cpfDigits = cpf.replace(/\D/g, '');
  const phoneDigits = phone.replace(/\D/g, '');
  const nameTrim = fullName.trim();
  const profileFull = profile?.full_name?.trim() ?? '';
  const profileCpf = profile?.cpf ?? '';
  const profilePhone = profile?.phone ?? '';
  const profileUnchanged =
    nickname === profile?.nickname &&
    nameTrim === profileFull &&
    cpfDigits === profileCpf &&
    phoneDigits === profilePhone;

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
              <div className="w-24 h-24 rounded-full bg-ufc-gray-700 flex items-center justify-center border-4 border-ufc-gray-600 overflow-hidden">
                {isUploadingAvatar ? (
                  <Loader2 className="text-ufc-red animate-spin" size={32} />
                ) : profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="text-ufc-gray-400" size={48} />
                )}
              </div>
              <button 
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-ufc-red flex items-center justify-center hover:bg-ufc-red-dark transition-colors disabled:opacity-50"
                title="Alterar foto de perfil"
              >
                <Camera size={16} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Email (readonly) */}
          <div>
            <label className="block text-sm font-medium text-ufc-gray-400 mb-2">
              Email
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-ufc-gray-800 rounded-lg border border-ufc-gray-700">
              <Mail size={18} className="text-ufc-gray-500" />
              <span className="text-ufc-gray-300">{userEmail}</span>
            </div>
          </div>

          {/* Nickname */}
          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setFormErrors((prev) => ({ ...prev, nickname: undefined }));
            }}
            error={formErrors.nickname}
            placeholder="Seu apelido único"
          />

          <p className="text-sm text-ufc-gray-500 -mt-2">
            Nome completo, CPF e WhatsApp abaixo são usados na cobrança PIX (seus dados na fatura).
          </p>

          <Input
            label="Nome completo"
            type="text"
            icon={<User size={20} />}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setFormErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            error={formErrors.fullName}
            placeholder="Nome e sobrenome"
          />

          <Input
            label="CPF"
            type="text"
            icon={<CreditCard size={20} />}
            value={cpf}
            onChange={(e) => {
              setCpf(formatCPF(e.target.value));
              setFormErrors((prev) => ({ ...prev, cpf: undefined }));
            }}
            error={formErrors.cpf}
            placeholder="000.000.000-00"
            maxLength={14}
          />

          <Input
            label="WhatsApp"
            type="tel"
            icon={<Phone size={20} />}
            value={phone}
            onChange={(e) => {
              setPhone(formatPhoneBR(e.target.value));
              setFormErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            error={formErrors.phone}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />

          <Button 
            onClick={handleSave} 
            isLoading={isSaving}
            disabled={profileUnchanged}
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

      {/* Conta */}
      <Card>
        <CardHeader>
          <h2 className="font-oswald text-xl text-white">Conta</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={handleResetPassword}
            isLoading={isSendingReset}
            className="w-full justify-start"
          >
            <Key size={18} className="mr-3" />
            Alterar Senha
          </Button>

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} className="mr-3" />
            Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
