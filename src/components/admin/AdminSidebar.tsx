'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  CreditCard, 
  Calendar, 
  LayoutDashboard,
  ChevronLeft,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Usuários', icon: Users, exact: false },
  { href: '/admin/payments', label: 'Pagamentos', icon: CreditCard, exact: false },
  { href: '/admin/events', label: 'Eventos', icon: Calendar, exact: false },
];

interface AdminSidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (item: typeof adminNavItems[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 w-14 h-14 bg-ufc-red rounded-full flex items-center justify-center shadow-lg"
      >
        <Menu size={24} className="text-white" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-ufc-gray-900 border-r border-ufc-gray-700 flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-ufc-red flex items-center justify-center">
                <span className="text-white font-bebas text-xl">A</span>
              </div>
              <div>
                <h2 className="text-white font-oswald text-lg">ADMIN</h2>
                <p className="text-ufc-gray-400 text-xs">Painel de Controle</p>
              </div>
            </div>
            
            {/* Close button - mobile only */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 text-ufc-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Nav Items */}
          <nav className="space-y-1 flex-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                    active 
                      ? 'bg-ufc-red text-white' 
                      : 'text-ufc-gray-300 hover:text-white hover:bg-ufc-gray-800'
                  )}
                >
                  <Icon size={18} className={cn(
                    'transition-colors',
                    active ? 'text-white' : 'group-hover:text-ufc-red'
                  )} />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Footer */}
          <div className="pt-4 border-t border-ufc-gray-700">
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
      <main className="flex-1 p-4 lg:p-6 bg-ufc-black overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}

