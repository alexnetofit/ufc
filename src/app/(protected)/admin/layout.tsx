import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { 
  Users, 
  CreditCard, 
  Calendar, 
  LayoutDashboard,
  ChevronLeft 
} from 'lucide-react';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/payments', label: 'Pagamentos', icon: CreditCard },
  { href: '/admin/events', label: 'Eventos', icon: Calendar },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-ufc-gray-900 border-r border-ufc-gray-700 flex-shrink-0">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-ufc-red flex items-center justify-center">
              <span className="text-white font-bebas text-xl">A</span>
            </div>
            <div>
              <h2 className="text-white font-oswald text-lg">ADMIN</h2>
              <p className="text-ufc-gray-400 text-xs">Painel de Controle</p>
            </div>
          </div>
          
          <nav className="space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ufc-gray-300 hover:text-white hover:bg-ufc-gray-800 transition-colors group"
                >
                  <Icon size={18} className="group-hover:text-ufc-red transition-colors" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="mt-8 pt-4 border-t border-ufc-gray-700">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-ufc-gray-400 hover:text-white text-sm transition-colors"
            >
              <ChevronLeft size={16} />
              Voltar ao App
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-ufc-black overflow-auto">
        {children}
      </main>
    </div>
  );
}







