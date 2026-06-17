import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  PawPrint,
  Scissors,
  Sun,
  Wallet,
  Users,
  BarChart3,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: '首页', icon: Home, emoji: '🏠' },
  { path: '/boarding', label: '寄养管理', icon: PawPrint, emoji: '🐾' },
  { path: '/grooming', label: '美容预约', icon: Scissors, emoji: '✂️' },
  { path: '/care', label: '日常照护', icon: Sun, emoji: '🌞' },
  { path: '/checkout', label: '结账管理', icon: Wallet, emoji: '💰' },
  { path: '/customers', label: '客户档案', icon: Users, emoji: '👥' },
  { path: '/statistics', label: '数据统计', icon: BarChart3, emoji: '📊' },
];

const pageTitleMap: Record<string, string> = {
  '/': '首页概览',
  '/boarding': '寄养管理',
  '/boarding/new': '新增寄养',
  '/grooming': '美容预约',
  '/grooming/new': '新增美容预约',
  '/care': '日常照护',
  '/checkout': '结账管理',
  '/customers': '客户档案',
  '/statistics': '数据统计',
};

function getPageTitle(pathname: string): string {
  if (pageTitleMap[pathname]) return pageTitleMap[pathname];
  if (pathname.startsWith('/boarding/')) return '寄养详情';
  if (pathname.startsWith('/checkout/')) return '结账详情';
  if (pathname.startsWith('/customers/')) return '客户详情';
  return '萌宠管家';
}

function formatDate(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
}

export default function Layout() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const today = formatDate(new Date());

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-warm-bg">
      <aside
        className="flex flex-col shadow-lg flex-shrink-0"
        style={{ width: 220, backgroundColor: '#FFF8F0' }}
      >
        <div className="px-6 py-6 border-b border-cream-coffee-100">
          <h1 className="text-2xl font-bold font-quicksand text-warm-text flex items-center gap-2">
            <span className="text-3xl">🐾</span>
            萌宠管家
          </h1>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-6 py-3 mx-3 my-1 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'font-semibold text-warm-text'
                      : 'text-warm-text/70 hover:text-warm-text'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'rgba(200, 159, 123, 0.2)' : 'transparent',
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full"
                        style={{ height: 24, backgroundColor: '#8FCFAD' }}
                      />
                    )}
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-cream-coffee-100">
          <p className="text-xs text-warm-text/50">© 2026 萌宠管家</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-cream-coffee-100 px-8 flex items-center justify-between shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-warm-text">{pageTitle}</h2>
          <div className="text-sm text-warm-text/60">{today}</div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
