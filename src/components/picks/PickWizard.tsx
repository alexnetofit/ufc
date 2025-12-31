'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button, Card, FighterImage, Badge } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase/client';
import { calculatePotentialPoints } from '@/lib/utils/scoring';
import { cn } from '@/lib/utils/cn';
import type { Fight, Pick, PredictedMethod, PredictedDecision } from '@/types';

interface PickWizardProps {
  fight: Fight & { event: { id: string; name: string } };
  existingPick: Pick | null;
  userId: string;
}

type WizardStep = 'winner' | 'method' | 'detail';

const METHODS: { value: PredictedMethod; label: string; description: string }[] = [
  { value: 'KO', label: 'NOCAUTE', description: 'KO ou TKO' },
  { value: 'SUB', label: 'SUBMISSÃO', description: 'Finalização' },
  { value: 'DEC', label: 'DECISÃO', description: 'Vai para os juízes' },
];

const ROUNDS = [1, 2, 3, 4, 5];

const DECISIONS: { value: PredictedDecision; label: string }[] = [
  { value: 'Unânime', label: 'UNÂNIME' },
  { value: 'Dividida', label: 'DIVIDIDA' },
  { value: 'Maioria', label: 'MAIORIA' },
];

export function PickWizard({ fight, existingPick, userId }: PickWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('winner');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [winner, setWinner] = useState<1 | 2 | null>(existingPick?.predicted_winner || null);
  const [method, setMethod] = useState<PredictedMethod | null>(existingPick?.predicted_method || null);
  const [round, setRound] = useState<number | null>(existingPick?.predicted_round || null);
  const [decision, setDecision] = useState<PredictedDecision | null>(existingPick?.predicted_decision || null);

  // Calculate potential points
  const potentialPoints = calculatePotentialPoints({
    predicted_winner: winner || undefined,
    predicted_method: method,
    predicted_round: round,
    predicted_decision: decision,
  });

  const handleSelectWinner = (w: 1 | 2) => {
    setWinner(w);
    setStep('method');
  };

  const handleSelectMethod = (m: PredictedMethod | null) => {
    setMethod(m);
    // Reset detalhes se mudar o método
    setRound(null);
    setDecision(null);
    
    if (m === null) {
      // Pular para confirmação
      handleSubmit(winner!, null, null, null);
    } else {
      setStep('detail');
    }
  };

  const handleSelectDetail = (value: number | PredictedDecision | null) => {
    if (method === 'DEC') {
      setDecision(value as PredictedDecision | null);
    } else {
      setRound(value as number | null);
    }
  };

  const handleSubmit = async (
    finalWinner: 1 | 2,
    finalMethod: PredictedMethod | null,
    finalRound: number | null,
    finalDecision: PredictedDecision | null
  ) => {
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();

      const pickData = {
        user_id: userId,
        fight_id: fight.id,
        predicted_winner: finalWinner,
        predicted_method: finalMethod,
        predicted_round: finalMethod === 'KO' || finalMethod === 'SUB' ? finalRound : null,
        predicted_decision: finalMethod === 'DEC' ? finalDecision : null,
        points: 0, // Será calculado quando o resultado sair
      };

      if (existingPick) {
        // Atualizar palpite existente
        const { error } = await supabase
          .from('picks')
          .update(pickData)
          .eq('id', existingPick.id);

        if (error) throw error;
        toast.success('Palpite atualizado com sucesso!');
      } else {
        // Criar novo palpite
        const { error } = await supabase
          .from('picks')
          .insert(pickData);

        if (error) throw error;
        toast.success('Palpite registrado com sucesso!');
      }

      router.push(`/events/${fight.event_id}`);
      router.refresh();
    } catch (error) {
      console.error('Error saving pick:', error);
      toast.error('Erro ao salvar palpite. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = () => {
    if (!winner) return;
    handleSubmit(winner, method, round, decision);
  };

  const goBack = () => {
    if (step === 'method') {
      setStep('winner');
    } else if (step === 'detail') {
      setStep('method');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link 
        href={`/events/${fight.event_id}`}
        className="inline-flex items-center gap-2 text-ufc-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Voltar para {fight.event?.name}</span>
      </Link>

      {/* Header */}
      <div className="text-center">
        <h1 className="font-bebas text-4xl text-white tracking-wide mb-2">
          FAZER PALPITE
        </h1>
        <p className="text-ufc-gray-400">
          {fight.weight_class?.toUpperCase()} • {fight.fight_type === 'main' ? 'MAIN EVENT' : fight.fight_type?.toUpperCase()}
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {['winner', 'method', 'detail'].map((s, i) => (
          <div
            key={s}
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              s === step ? 'bg-ufc-red' :
              (['winner', 'method', 'detail'].indexOf(step) > i) ? 'bg-ufc-gold' : 'bg-ufc-gray-700'
            )}
          />
        ))}
      </div>

      {/* Fighters Display */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div 
            className={cn(
              'flex flex-col items-center flex-1 p-4 rounded-xl transition-all cursor-pointer',
              winner === 1 && 'bg-ufc-gold/20 ring-2 ring-ufc-gold',
              step === 'winner' && 'hover:bg-ufc-gray-700'
            )}
            onClick={() => step === 'winner' && handleSelectWinner(1)}
          >
            <FighterImage
              fighterId={fight.fighter1_id}
              name={fight.fighter1_name}
              size="xl"
              className={cn(winner === 1 && 'ring-4 ring-ufc-gold')}
            />
            <h3 className="font-oswald text-xl text-white mt-3 text-center">
              {fight.fighter1_name.split(' ').slice(-1)[0].toUpperCase()}
            </h3>
            <p className="text-ufc-gray-400 text-sm mt-1 text-center">
              {fight.fighter1_name}
            </p>
            {winner === 1 && (
              <Badge variant="gold" className="mt-2">
                SELECIONADO
              </Badge>
            )}
          </div>

          <div className="px-4">
            <div className="vs-badge w-16 h-16 rounded-full flex items-center justify-center">
              <span className="font-bebas text-2xl text-white">VS</span>
            </div>
          </div>

          <div 
            className={cn(
              'flex flex-col items-center flex-1 p-4 rounded-xl transition-all cursor-pointer',
              winner === 2 && 'bg-ufc-gold/20 ring-2 ring-ufc-gold',
              step === 'winner' && 'hover:bg-ufc-gray-700'
            )}
            onClick={() => step === 'winner' && handleSelectWinner(2)}
          >
            <FighterImage
              fighterId={fight.fighter2_id}
              name={fight.fighter2_name}
              size="xl"
              className={cn(winner === 2 && 'ring-4 ring-ufc-gold')}
            />
            <h3 className="font-oswald text-xl text-white mt-3 text-center">
              {fight.fighter2_name.split(' ').slice(-1)[0].toUpperCase()}
            </h3>
            <p className="text-ufc-gray-400 text-sm mt-1 text-center">
              {fight.fighter2_name}
            </p>
            {winner === 2 && (
              <Badge variant="gold" className="mt-2">
                SELECIONADO
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Step Content */}
      <Card className="p-6">
        {step === 'winner' && (
          <div className="text-center">
            <h2 className="font-oswald text-2xl text-white mb-4">
              PASSO 1: ESCOLHA O VENCEDOR
            </h2>
            <p className="text-ufc-gray-400">
              Clique no lutador que você acha que vai vencer esta luta
            </p>
          </div>
        )}

        {step === 'method' && (
          <div>
            <h2 className="font-oswald text-2xl text-white mb-4 text-center">
              PASSO 2: COMO VAI GANHAR? (opcional)
            </h2>
            <p className="text-ufc-gray-400 text-center mb-6">
              Escolha o método de vitória para ganhar +20 pontos
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleSelectMethod(m.value)}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all',
                    method === m.value
                      ? 'border-ufc-gold bg-ufc-gold/20'
                      : 'border-ufc-gray-700 hover:border-ufc-gray-500'
                  )}
                >
                  <h3 className="font-oswald text-lg text-white">{m.label}</h3>
                  <p className="text-ufc-gray-400 text-xs mt-1">{m.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft size={18} className="mr-2" />
                Voltar
              </Button>
              <Button variant="outline" onClick={() => handleSelectMethod(null)}>
                Pular (só vencedor)
              </Button>
            </div>
          </div>
        )}

        {step === 'detail' && (
          <div>
            <h2 className="font-oswald text-2xl text-white mb-4 text-center">
              PASSO 3: DETALHE FINAL (opcional)
            </h2>
            <p className="text-ufc-gray-400 text-center mb-6">
              {method === 'DEC' 
                ? 'Escolha o tipo de decisão para ganhar +30 pontos'
                : 'Escolha o round para ganhar +30 pontos'
              }
            </p>

            {method === 'DEC' ? (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {DECISIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => handleSelectDetail(d.value)}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all',
                      decision === d.value
                        ? 'border-ufc-gold bg-ufc-gold/20'
                        : 'border-ufc-gray-700 hover:border-ufc-gray-500'
                    )}
                  >
                    <h3 className="font-oswald text-lg text-white">{d.label}</h3>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3 mb-6">
                {ROUNDS.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSelectDetail(r)}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all',
                      round === r
                        ? 'border-ufc-gold bg-ufc-gold/20'
                        : 'border-ufc-gray-700 hover:border-ufc-gray-500'
                    )}
                  >
                    <h3 className="font-bebas text-2xl text-white">R{r}</h3>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft size={18} className="mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleConfirm}
                isLoading={isSubmitting}
              >
                {existingPick ? 'Atualizar Palpite' : 'Confirmar Palpite'}
                <Check size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Points Preview */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-ufc-gray-400">Pontuação potencial:</span>
          <span className="font-bebas text-3xl text-ufc-gold">
            {potentialPoints} PTS
          </span>
        </div>
        <div className="mt-2 text-xs text-ufc-gray-500">
          <p>• Vencedor: 10 pts • Método: +20 pts • Detalhe: +30 pts • Máximo: 60 pts</p>
        </div>
      </Card>
    </div>
  );
}


