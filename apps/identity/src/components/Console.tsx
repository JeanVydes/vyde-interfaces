import { useEffect, useState, createContext, useContext, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AppWindow,
  Building2,
  Mail,
  Palette,
  Shield,
  UserRound,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useSession } from '@/lib/session';
import { useAccount } from '@/features/queries';
import { Flags } from '@/components/Flags';
import { authClient } from '@/lib/auth-client';

interface ConsoleProps {
  children: ReactNode;
  section: string;
  onSectionChange: (section: string) => void;
}

export function Console(props: ConsoleProps) {
  const { authenticated, isPending } = useSession();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [toast, setToast] = useState('');
  const account = useAccount();
  const navItems: Array<[string, LucideIcon]> = [
    ['Overview', LayoutDashboard],
    ['Profile', UserRound],
    ['E-mail addresses', Mail],
    ['Security', Shield],
    ['Appearance', Palette],
    ['Connected apps', AppWindow],
    ['Organizations', Building2],
  ];

  useEffect(() => {
    if (isPending || authenticated) {
      return;
    }
    const returnTo = window.location.pathname + window.location.search;
    void navigate({ to: '/login', search: { return_to: returnTo }, replace: true });
  }, [authenticated, isPending, navigate]);

  useEffect(() => {
    if (theme === 'auto') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  if (isPending || !authenticated) {
    return <div />;
  }

  const showToast = (message: string) => {
    setToast(message);
    clearTimeout((window as any)._toast_timer);
    (window as any)._toast_timer = setTimeout(() => setToast(''), 1800);
  };

  return (
    <div className="console">
      <aside>
        <div className="brand">
          <i />
          VYDE
        </div>
        <div className="mono">Identity</div>

        <nav>
          {navItems.map(([section, Icon]) => (
            <button
              key={section}
              className={props.section === section ? 'active' : ''}
              onClick={() => props.onSectionChange(section)}
            >
              <Icon size={16} aria-hidden="true" />
              {section}
            </button>
          ))}
        </nav>

        <div className="me">
          <b>{(account.data?.name?.[0] || '•').toUpperCase()}</b>
          <div>
            <div>{account.data?.name} {account.data ? <Flags values={account.data.flags} /> : null}</div>
            <small>{account.data?.primary_email?.email || 'No email'}</small>
          </div>
        </div>

        <button
          className="btn ghost"
          onClick={() => {
            void authClient.logout().finally(() => window.location.assign('/'));
          }}
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </aside>

      <main id="main">
        <ConsoleContext.Provider value={{ theme, setTheme, toast: showToast }}>
          {props.children}
        </ConsoleContext.Provider>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export const ConsoleContext = createContext<{
  theme: 'auto' | 'light' | 'dark';
  setTheme: (theme: 'auto' | 'light' | 'dark') => void;
  toast: (message: string) => void;
} | null>(null);

export function useConsole() {
  const ctx = useContext(ConsoleContext);
  if (!ctx) throw new Error('useConsole must be used inside <Console>');
  return ctx;
}
