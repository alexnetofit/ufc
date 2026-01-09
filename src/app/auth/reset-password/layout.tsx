import Link from 'next/link';

export default function AuthResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ufc-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-ufc-gradient opacity-20" />
      
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Logo */}
      <Link href="/" className="relative z-10 mb-8">
        <img 
          src="/logo-sigma-ufc.png" 
          alt="Sigma UFC" 
          className="h-20 w-auto mx-auto"
        />
      </Link>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-ufc-gray-900/90 backdrop-blur-sm border border-ufc-gray-700 rounded-2xl shadow-card p-8">
          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-ufc-gray-500 text-sm">
        © 2025 Sigma UFC
      </p>
    </div>
  );
}


