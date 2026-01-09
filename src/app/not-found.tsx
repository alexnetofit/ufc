import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ufc-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-ufc-gradient opacity-20" />
      
      <div className="relative z-10 text-center px-4">
        <h1 className="font-bebas text-9xl text-ufc-red mb-4">404</h1>
        <h2 className="font-oswald text-3xl text-white mb-4">
          PÁGINA NÃO ENCONTRADA
        </h2>
        <p className="text-ufc-gray-400 mb-8 max-w-md mx-auto">
          Parece que você tentou acessar uma página que não existe. 
          Volte para o octógono e continue sua jornada!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button>
              <Home size={18} className="mr-2" />
              Página Inicial
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft size={18} className="mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}








