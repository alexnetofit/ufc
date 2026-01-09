'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email) {
      setError('Email é obrigatório');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);
    
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setIsEmailSent(true);
      toast.success('Email enviado com sucesso!');
    } catch (err) {
      toast.error('Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-ufc-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail size={32} className="text-ufc-gold" />
        </div>
        <h1 className="font-oswald text-3xl text-white mb-4">
          VERIFIQUE SEU EMAIL
        </h1>
        <p className="text-ufc-gray-400 mb-6">
          Enviamos um link de recuperação para <span className="text-white font-medium">{email}</span>. 
          Clique no link para redefinir sua senha.
        </p>
        <p className="text-ufc-gray-500 text-sm mb-8">
          Não recebeu o email? Verifique sua pasta de spam ou tente novamente.
        </p>
        <div className="space-y-3">
          <Button
            onClick={() => setIsEmailSent(false)}
            variant="outline"
            className="w-full"
          >
            Tentar novamente
          </Button>
          <Link href="/login">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2" size={18} />
              Voltar para o login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-oswald text-3xl text-white text-center mb-2">
        ESQUECEU SUA SENHA?
      </h1>
      <p className="text-ufc-gray-400 text-center mb-8">
        Digite seu email e enviaremos um link para redefinir sua senha
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Email"
          type="email"
          placeholder="seu@email.com"
          icon={<Mail size={20} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          disabled={isLoading}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          <Send className="mr-2" size={20} />
          ENVIAR LINK DE RECUPERAÇÃO
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


