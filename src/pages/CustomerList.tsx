import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Phone, PawPrint, Calendar, Wallet, Users, Clock, RefreshCw } from 'lucide-react';
import { getCustomers, getCustomerSegments } from '@/utils/api';
import type { CustomerProfile } from '../../shared/types';
import { cn } from '@/lib/utils';

const tagColorMap: Record<string, { bg: string; text: string }> = {
  '常客': { bg: 'bg-mint-100', text: 'text-mint-700' },
  '敏感体质': { bg: 'bg-orange-100', text: 'text-orange-600' },
  '爱咬人': { bg: 'bg-red-100', text: 'text-red-600' },
  '需要回访': { bg: 'bg-purple-100', text: 'text-purple-600' },
};

function getTagStyle(tag: string) {
  return tagColorMap[tag] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN');
}

type FilterTab = 'all' | 'inactive60d' | 'repurchase30d';

const tabConfig: { key: FilterTab; label: string; icon: typeof Users }[] = [
  { key: 'all', label: '全部客户', icon: Users },
  { key: 'inactive60d', label: '近60天未到店', icon: Clock },
  { key: 'repurchase30d', label: '近30天复购客', icon: RefreshCw },
];

export default function CustomerList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [segments, setSegments] = useState<{ inactive60d: CustomerProfile[]; repurchase30d: CustomerProfile[] }>({
    inactive60d: [],
    repurchase30d: [],
  });
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [loadingSegments, setLoadingSegments] = useState(false);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'pendingFollowUps') {
      setActiveTab('all');
    }
  }, [searchParams]);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  useEffect(() => {
    if (activeTab !== 'all') {
      loadSegments();
    }
  }, [activeTab]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await getCustomers(search || undefined);
      setCustomers(data);
    } catch (e) {
      console.error('Failed to load customers', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadSegments() {
    setLoadingSegments(true);
    try {
      const data = await getCustomerSegments();
      setSegments({
        inactive60d: (data.inactive60d || []) as CustomerProfile[],
        repurchase30d: (data.repurchase30d || []) as CustomerProfile[],
      });
    } catch (e) {
      console.error('Failed to load customer segments', e);
    } finally {
      setLoadingSegments(false);
    }
  }

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
  }

  const displayCustomers =
    activeTab === 'all'
      ? customers
      : activeTab === 'inactive60d'
      ? segments.inactive60d
      : segments.repurchase30d;

  const isLoading = activeTab === 'all' ? loading : loadingSegments;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-warm-text font-quicksand flex items-center gap-2">
          <span>👥</span> 客户档案
        </h1>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-text/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索姓名或电话..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-cream-coffee-200 bg-white text-sm text-warm-text placeholder-warm-text/40 outline-none transition-all focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-cream-coffee-500 text-white shadow-sm'
                  : 'bg-white text-warm-text/70 border border-cream-coffee-100 hover:border-cream-coffee-200 hover:text-warm-text'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-warm-text/60">加载中...</div>
        </div>
      ) : displayCustomers.length === 0 ? (
        <div className="rounded-2xl shadow-sm bg-white py-20 text-center" style={{ borderRadius: 16 }}>
          <div className="text-5xl mb-3">👥</div>
          <p className="text-warm-text/50">
            {activeTab === 'all'
              ? '暂无客户档案'
              : activeTab === 'inactive60d'
              ? '暂无近60天未到店客户'
              : '暂无近30天复购客户'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCustomers.map((customer) => (
            <div
              key={customer.ownerPhone}
              onClick={() => navigate(`/customers/${encodeURIComponent(customer.ownerPhone)}`)}
              className="rounded-2xl shadow-sm bg-white p-5 transition-all hover:shadow-md cursor-pointer"
              style={{ borderRadius: 16 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold text-warm-text text-lg">{customer.ownerName}</div>
                  <div className="flex items-center gap-1.5 text-sm text-warm-text/60 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    {customer.ownerPhone}
                  </div>
                </div>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: '#FFF8F0' }}
                >
                  👤
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 rounded-lg bg-cream-coffee-50">
                  <div className="flex items-center justify-center gap-1 text-xs text-warm-text/50 mb-0.5">
                    <PawPrint className="w-3 h-3" />
                    宠物数
                  </div>
                  <div className="font-bold text-warm-text">{customer.petCount}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-cream-coffee-50">
                  <div className="flex items-center justify-center gap-1 text-xs text-warm-text/50 mb-0.5">
                    <Wallet className="w-3 h-3" />
                    累计消费
                  </div>
                  <div className="font-bold text-warm-text">¥{formatCurrency(customer.totalSpent)}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-cream-coffee-50">
                  <div className="flex items-center justify-center gap-1 text-xs text-warm-text/50 mb-0.5">
                    <Calendar className="w-3 h-3" />
                    最近到店
                  </div>
                  <div className="font-bold text-warm-text text-xs">{customer.lastVisit || '-'}</div>
                </div>
              </div>

              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => {
                    const style = getTagStyle(tag);
                    return (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
