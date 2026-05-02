import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, Pill, MoreHorizontal } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/pmjay-check', label: 'PMJAY', icon: Heart },
  { to: '/drug-comparator', label: 'Drugs', icon: Pill },
  { to: '/about', label: 'More', icon: MoreHorizontal },
];

export default function MobileBottomNav() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="mobile-bottom-nav lg:hidden"
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-2 px-3 min-w-0 flex-1 transition-all duration-200 ${
                active ? 'text-primary' : 'text-text-secondary'
              }`}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              <div className={`relative p-1 rounded-lg transition-all duration-200 ${
                active ? 'bg-primary/10' : ''
              }`}>
                <Icon className={`w-5 h-5 transition-all duration-200 ${
                  active ? 'text-primary' : 'text-text-secondary'
                }`} />
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span className={`text-xs font-medium leading-none ${
                active ? 'text-primary' : 'text-text-secondary'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
