'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QrCode, Copy, Check, Clock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import type { PixPayment, PaymentPlan, PixPaymentStatus } from '@/types';
import { PAYMENT_PLAN_LABELS } from '@/types';

interface PixCheckoutProps {
  eventId: string;
  eventName: string;
  onPaymentConfirmed?: () => void;
}

type CheckoutState = 'idle' | 'loading' | 'pending' | 'paid' | 'expired' | 'error';

export function PixCheckout({ eventId, eventName, onPaymentConfirmed }: PixCheckoutProps) {
  const [state, setState] = useState<CheckoutState>('loading');
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>('10');
  const [payment, setPayment] = useState<PixPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar se já existe pagamento pendente ou entrada
  const checkActivePayment = useCallback(async () => {
    try {
      const response = await fetch(`/api/pix/active?eventId=${eventId}`);
      const data = await response.json();

      if (data.hasEntry) {
        setState('paid');
        return;
      }

      if (data.payment) {
        setPayment(data.payment);
        setState('pending');
      } else {
        setState('idle');
      }
    } catch (err) {
      console.error('Erro ao verificar pagamento:', err);
      setState('idle');
    }
  }, [eventId]);

  // Inicializar
  useEffect(() => {
    checkActivePayment();
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [checkActivePayment]);

  // Countdown timer
  useEffect(() => {
    if (state !== 'pending' || !payment) return;

    const updateCountdown = () => {
      const now = new Date();
      const expires = new Date(payment.expires_at);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expirado');
        setState('expired');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [state, payment]);

  // Polling para verificar status
  useEffect(() => {
    if (state !== 'pending' || !payment) return;

    const checkStatus = async () => {
      try {
        const response = await fetch('/api/pix/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: payment.id }),
        });
        const data = await response.json();

        if (data.status === 'PAID') {
          setState('paid');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          onPaymentConfirmed?.();
        } else if (data.status === 'EXPIRED' || data.status === 'CANCELLED') {
          setState('expired');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    // Poll a cada 5 segundos
    pollingRef.current = setInterval(checkStatus, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [state, payment, onPaymentConfirmed]);

  // Gerar novo PIX
  const generatePix = async () => {
    setState('loading');
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/pix/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Erro ao gerar PIX');
        setState('error');
        return;
      }

      setPayment(data.payment);
      setState('pending');
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
      setError('Erro de conexão. Tente novamente.');
      setState('error');
    }
  };

  // Copiar código PIX
  const copyBrCode = async () => {
    if (!payment?.br_code) return;

    try {
      await navigator.clipboard.writeText(payment.br_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Formatar QR Code base64
  const getQrCodeSrc = () => {
    if (!payment?.br_code_base64) return null;
    // Se já tem prefixo data:, usar direto
    if (payment.br_code_base64.startsWith('data:')) {
      return payment.br_code_base64;
    }
    // Senão, adicionar prefixo
    return `data:image/png;base64,${payment.br_code_base64}`;
  };

  // Estado: Carregando
  if (state === 'loading') {
    return (
      <Card className="bg-ufc-gray-800 border-ufc-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 text-ufc-gray-400">
            <RefreshCw className="animate-spin" size={20} />
            <span>Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado: Pago
  if (state === 'paid') {
    return (
      <Card className="bg-green-900/30 border-green-500/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
            <div>
              <h3 className="font-oswald text-xl text-white mb-1">
                Pagamento Confirmado!
              </h3>
              <p className="text-green-400">
                Sua participação no evento está garantida.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verificar se o sistema de pagamento não está configurado
  const isPaymentSystemDisabled = error?.includes('pagamento não configurado');

  // Estado: Idle - Seleção de plano
  if (state === 'idle' || state === 'error') {
    return (
      <Card className="bg-ufc-gray-800 border-ufc-gray-700">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <QrCode className="mx-auto text-ufc-gold mb-3" size={40} />
            <h3 className="font-oswald text-xl text-white mb-1">
              Participar do Evento
            </h3>
            <p className="text-ufc-gray-400 text-sm">
              Pague via PIX para participar das apostas
            </p>
          </div>

          {isPaymentSystemDisabled && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="text-yellow-500 flex-shrink-0" size={18} />
              <span className="text-yellow-400 text-sm">Sistema de pagamento não configurado</span>
            </div>
          )}

          {error && !isPaymentSystemDisabled && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Seleção de valor */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {(['5', '10', '20'] as PaymentPlan[]).map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                disabled={isPaymentSystemDisabled}
                className={cn(
                  'py-3 px-4 rounded-lg border-2 font-oswald text-lg transition-all',
                  isPaymentSystemDisabled && 'opacity-50 cursor-not-allowed',
                  selectedPlan === plan
                    ? 'bg-ufc-gold/20 border-ufc-gold text-ufc-gold'
                    : 'bg-ufc-gray-700 border-ufc-gray-600 text-white hover:border-ufc-gray-500'
                )}
              >
                {PAYMENT_PLAN_LABELS[plan]}
              </button>
            ))}
          </div>

          <Button
            onClick={generatePix}
            className="w-full"
            size="lg"
            disabled={isPaymentSystemDisabled}
          >
            <QrCode size={20} className="mr-2" />
            Gerar PIX
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado: Pendente - QR Code gerado
  if (state === 'pending' && payment) {
    const qrCodeSrc = getQrCodeSrc();

    return (
      <Card className="bg-ufc-gray-800 border-ufc-gray-700">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h3 className="font-oswald text-xl text-white mb-1">
              Escaneie o QR Code
            </h3>
            <p className="text-ufc-gray-400 text-sm">
              Ou copie o código PIX abaixo
            </p>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-4 text-yellow-400">
            <Clock size={16} />
            <span className="font-mono text-sm">
              Expira em: {timeLeft}
            </span>
          </div>

          {/* QR Code */}
          {qrCodeSrc && (
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-lg">
                <img
                  src={qrCodeSrc}
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              </div>
            </div>
          )}

          {/* Valor */}
          <div className="text-center mb-4">
            <span className="text-ufc-gray-400 text-sm">Valor:</span>
            <span className="text-white font-oswald text-2xl ml-2">
              R$ {(payment.amount / 100).toFixed(2)}
            </span>
          </div>

          {/* Código copia e cola */}
          <div className="bg-ufc-gray-900 rounded-lg p-3 mb-4">
            <p className="text-ufc-gray-400 text-xs mb-2">Código copia e cola:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={payment.br_code}
                readOnly
                className="flex-1 bg-transparent text-white text-xs font-mono truncate outline-none"
              />
              <button
                onClick={copyBrCode}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  copied
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-ufc-gray-700 text-white hover:bg-ufc-gray-600'
                )}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 text-ufc-gray-400 text-sm">
            <RefreshCw className="animate-spin" size={14} />
            <span>Aguardando pagamento...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado: Expirado
  if (state === 'expired') {
    return (
      <Card className="bg-ufc-gray-800 border-ufc-gray-700">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="text-yellow-500" size={32} />
            </div>
            <h3 className="font-oswald text-xl text-white mb-1">
              PIX Expirado
            </h3>
            <p className="text-ufc-gray-400 text-sm">
              O tempo para pagamento expirou. Gere um novo PIX.
            </p>
          </div>

          <Button
            onClick={() => {
              setPayment(null);
              setState('idle');
            }}
            className="w-full"
            size="lg"
          >
            <RefreshCw size={20} className="mr-2" />
            Gerar Novo PIX
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}



