import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-ufc-black relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-ufc-gradient opacity-30" />
      
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 text-center px-4 py-[30px]">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src="/logo-bolao-walker.png" 
            alt="Bolão Walker" 
            className="h-48 md:h-64 w-auto mx-auto"
          />
        </div>

        {/* Tagline */}
        <p className="text-ufc-gray-300 text-lg md:text-xl mb-12 max-w-md mx-auto">
          Faça seus palpites nas lutas do UFC e prove que você é o maior especialista em MMA!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/login" 
            className="btn-ufc text-xl"
          >
            ENTRAR
          </Link>
          <Link 
            href="/register" 
            className="btn-outline text-xl"
          >
            CRIAR CONTA
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ufc-gray-800 flex items-center justify-center">
              <span className="text-3xl">🥊</span>
            </div>
            <h3 className="font-oswald text-xl text-white mb-2">PALPITES</h3>
            <p className="text-ufc-gray-400 text-sm">
              Escolha o vencedor, método e round de cada luta
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ufc-gray-800 flex items-center justify-center">
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className="font-oswald text-xl text-white mb-2">PONTOS</h3>
            <p className="text-ufc-gray-400 text-sm">
              Acumule até 60 pontos por luta acertando detalhes
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ufc-gray-800 flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="font-oswald text-xl text-white mb-2">RANKING</h3>
            <p className="text-ufc-gray-400 text-sm">
              Compita com outros fãs e suba no ranking global
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-ufc-gray-500 text-sm">
        © 2025 Bolão Walker - Não é betting, é diversão!
      </footer>
    </main>
  );
}

