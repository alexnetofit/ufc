'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    nickname?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
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

      // Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname,
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

      // Atualizar nickname no profile (trigger cria com default)
      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ nickname })
          .eq('id', authData.user.id);
      }

      toast.success('Conta criada com sucesso! Bem-vindo ao Sigma UFC!');
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
        Entre para o octógono do Sigma UFC
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
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




