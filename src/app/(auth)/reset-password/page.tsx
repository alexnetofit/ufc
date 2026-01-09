'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Lock, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseClient();
      
      // O Supabase automaticamente processa o token da URL e cria uma sessão
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsValidToken(true);
      } else {
        // Verifica se tem código na URL (pode ser que ainda não processou)
        const code = searchParams.get('code');
        if (code) {
          // Tenta trocar o código por uma sessão
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            setIsValidToken(true);
          }
        }
      }
      
      setIsCheckingToken(false);
    };

    checkSession();
  }, [searchParams]);

  const validate = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};
    
    if (!password) {
      newErrors.password = 'Nova senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
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
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setIsSuccess(true);
      toast.success('Senha alterada com sucesso!');
      
      // Redireciona após 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      toast.error('Erro ao alterar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-ufc-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <KeyRound size={32} className="text-ufc-gray-400" />
        </div>
        <h1 className="font-oswald text-2xl text-white mb-4">
          VERIFICANDO...
        </h1>
        <p className="text-ufc-gray-400">
          Aguarde enquanto validamos seu link.
        </p>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-ufc-red/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <KeyRound size={32} className="text-ufc-red" />
        </div>
        <h1 className="font-oswald text-2xl text-white mb-4">
          LINK INVÁLIDO OU EXPIRADO
        </h1>
        <p className="text-ufc-gray-400 mb-8">
          Este link de recuperação de senha é inválido ou já expirou. 
          Por favor, solicite um novo link.
        </p>
        <Link href="/forgot-password">
          <Button className="w-full">
            Solicitar novo link
          </Button>
        </Link>
        <div className="mt-4">
          <Link 
            href="/login" 
            className="text-ufc-gray-400 hover:text-ufc-gold transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h1 className="font-oswald text-3xl text-white mb-4">
          SENHA ALTERADA!
        </h1>
        <p className="text-ufc-gray-400 mb-6">
          Sua senha foi alterada com sucesso. 
          Você será redirecionado para o login em instantes.
        </p>
        <Link href="/login">
          <Button className="w-full">
            <ArrowLeft className="mr-2" size={18} />
            Ir para o login agora
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-oswald text-3xl text-white text-center mb-2">
        NOVA SENHA
      </h1>
      <p className="text-ufc-gray-400 text-center mb-8">
        Digite sua nova senha abaixo
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nova Senha"
          type="password"
          placeholder="••••••••"
          icon={<Lock size={20} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={isLoading}
        />

        <Input
          label="Confirmar Nova Senha"
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
          <KeyRound className="mr-2" size={20} />
          ALTERAR SENHA
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link 
          href="/login" 
          className="text-ufc-gray-400 hover:text-ufc-gold transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}


