import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sigma UFC - Palpites do UFC',
  description: 'Faça seus palpites nas lutas do UFC e ganhe pontos!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-ufc-black antialiased">
        {children}
        <Toaster 
          position="top-right"
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: '#1A1A1A',
              border: '1px solid #2A2A2A',
            },
          }}
        />
      </body>
    </html>
  );
}




