'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, Lock, User, UserPlus, CreditCard, Phone } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  formatCPF,
  formatPhoneBR,
  isValidCPF,
  isValidPhoneBR,
} from '@/lib/validation/brazilian-person';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    nickname?: string;
    fullName?: string;
    cpf?: string;
    phone?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!fullName) {
      newErrors.fullName = 'Nome completo é obrigatório';
    } else if (fullName.trim().split(' ').length < 2) {
      newErrors.fullName = 'Digite seu nome completo (nome e sobrenome)';
    }

    if (!cpf) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!isValidCPF(cpf)) {
      newErrors.cpf = 'CPF inválido';
    }

    if (!phone) {
      newErrors.phone = 'WhatsApp é obrigatório';
    } else if (!isValidPhoneBR(phone)) {
      newErrors.phone = 'WhatsApp inválido (digite DDD + número)';
    }

    if (!email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }

    if (!nickname) {
      newErrors.nickname = 'Nickname é obrigatório';
    } else if (nickname.length < 3) {
      newErrors.nickname = 'Nickname deve ter pelo menos 3 caracteres';
    } else if (nickname.length > 20) {
      newErrors.nickname = 'Nickname deve ter no máximo 20 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      newErrors.nickname = 'Nickname só pode ter letras, números e _';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);
    
    try {
      const supabase = getSupabaseClient();
      
      // Verificar se nickname já existe
      const { data: existingNickname } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname)
        .single();

      if (existingNickname) {
        setErrors({ nickname: 'Este nickname já está em uso' });
        setIsLoading(false);
        return;
      }

      // Verificar se CPF já existe
      const cpfNumbers = cpf.replace(/\D/g, '');
      const { data: existingCpf } = await supabase
        .from('profiles')
        .select('cpf')
        .eq('cpf', cpfNumbers)
        .single();

      if (existingCpf) {
        setErrors({ cpf: 'Este CPF já está cadastrado' });
        setIsLoading(false);
        return;
      }

      // Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname,
            full_name: fullName.trim(),
            cpf: cpf.replace(/\D/g, ''),
            phone: phone.replace(/\D/g, ''),
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(authError.message);
        }
        return;
      }

      // Aguardar um pouco para o trigger criar o profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Atualizar profile com os dados completos
      if (authData.user) {
        const cpfNumbers = cpf.replace(/\D/g, '');
        const phoneNumbers = phone.replace(/\D/g, '');
        
        // Fazer login para ter a sessão ativa (necessário para RLS)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('Erro ao fazer login após registro:', signInError);
          // Continuar mesmo assim - o profile será atualizado no próximo login
        }

        // Agora com a sessão ativa, podemos atualizar
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            nickname,
            full_name: fullName.trim(),
            cpf: cpfNumbers,
            phone: phoneNumbers,
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Erro ao atualizar profile:', updateError);
          // Não bloquear o usuário, ele pode atualizar depois
        }
      }

      toast.success('Conta criada com sucesso! Bem-vindo ao Bolão Walker!');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-oswald text-3xl text-white text-center mb-2">
        CRIAR CONTA
      </h1>
      <p className="text-ufc-gray-400 text-center mb-8">
        Entre para o octógono do Bolão Walker
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Nome Completo"
          type="text"
          placeholder="Seu nome e sobrenome"
          icon={<User size={20} />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          disabled={isLoading}
        />

        <Input
          label="CPF"
          type="text"
          placeholder="000.000.000-00"
          icon={<CreditCard size={20} />}
          value={cpf}
          onChange={(e) => setCpf(formatCPF(e.target.value))}
          error={errors.cpf}
          disabled={isLoading}
          maxLength={14}
        />

        <Input
          label="WhatsApp"
          type="tel"
          placeholder="(00) 00000-0000"
          icon={<Phone size={20} />}
          value={phone}
          onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
          error={errors.phone}
          disabled={isLoading}
          maxLength={15}
        />

        <Input
          label="Nickname"
          type="text"
          placeholder="Seu apelido único"
          icon={<User size={20} />}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          error={errors.nickname}
          disabled={isLoading}
        />

        <Input
          label="Email"
          type="email"
          placeholder="seu@email.com"
          icon={<Mail size={20} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={isLoading}
        />

        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          icon={<Lock size={20} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={isLoading}
        />

        <Input
          label="Confirmar Senha"
          type="password"
          placeholder="••••••••"
          icon={<Lock size={20} />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          disabled={isLoading}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          <UserPlus className="mr-2" size={20} />
          CRIAR CONTA
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-ufc-gray-400">
          Já tem uma conta?{' '}
          <Link 
            href="/login" 
            className="text-ufc-red hover:text-ufc-red-dark font-medium transition-colors"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}




