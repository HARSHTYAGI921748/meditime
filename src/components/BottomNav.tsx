import { NavLink } from 'react-router-dom';
import {
  Home,
  Pill,
  ScanLine,
  Users,
  History,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

const tabs = [
  { to: '/',          icon: Home,     label: 'Home' },
  { to: '/medicines', icon: Pill,     label: 'Medicines' },
  { to: '/scan',      icon: ScanLine, label: 'Scan' },
  { to: '/family',    icon: Users,    label: 'Family' },
  { to: '/history',   icon: History,  label: 'History' },
  { to: '/settings',  icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav bg-white dark:bg-primary-900 border-t border-primary-100 dark:border-primary-800 flex items-center justify-around shadow-lg">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center py-2 px-1 flex-1 tap-target transition-colors',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={clsx('text-[10px] mt-0.5 font-semibold', isActive && 'font-extrabold')}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
