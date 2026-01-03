'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { 
  Home, 
  Calendar, 
  Trophy, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  Shield 
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import type { Profile } from '@/types';

interface NavbarProps {
  user: User;
  profile: Profile | null;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/events', label: 'Eventos', icon: Calendar },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/profile', label: 'Perfil', icon: UserIcon },
];

const adminNavItem = { href: '/admin', label: 'Admin', icon: Shield };

export function Navbar({ user, profile }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    toast.success('Até logo!');
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="bg-ufc-gray-900 border-b border-ufc-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <img 
              src="/logo-sigma-ufc.png" 
              alt="Sigma UFC" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-ufc-red text-white'
                      : 'text-ufc-gray-300 hover:text-white hover:bg-ufc-gray-800'
                  )}
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            
            {/* Admin Link - Only for admins */}
            {profile?.is_admin && (
              <Link
                href={adminNavItem.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-ufc-red text-white'
                    : 'text-ufc-red hover:text-white hover:bg-ufc-red/20'
                )}
              >
                <Shield size={18} />
                <span className="font-medium">{adminNavItem.label}</span>
              </Link>
            )}
          </div>

          {/* User Info & Logout */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-medium text-sm">
                {profile?.nickname || user.email?.split('@')[0]}
              </p>
              <p className="text-ufc-gray-400 text-xs">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-ufc-gray-400 hover:text-white hover:bg-ufc-gray-800 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-ufc-gray-300 hover:text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-ufc-gray-700">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-ufc-red text-white'
                        : 'text-ufc-gray-300 hover:text-white hover:bg-ufc-gray-800'
                    )}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Admin Link Mobile - Only for admins */}
              {profile?.is_admin && (
                <Link
                  href={adminNavItem.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    pathname.startsWith('/admin')
                      ? 'bg-ufc-red text-white'
                      : 'text-ufc-red hover:text-white hover:bg-ufc-red/20'
                  )}
                >
                  <Shield size={20} />
                  <span className="font-medium">{adminNavItem.label}</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-ufc-gray-300 hover:text-white hover:bg-ufc-gray-800 transition-colors"
              >
                <LogOut size={20} />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

