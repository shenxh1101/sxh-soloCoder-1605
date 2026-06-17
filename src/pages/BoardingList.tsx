import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Trash2 } from 'lucide-react';
import type { BoardingOrder } from '../../shared/types';
import { getBoarding, deleteBoarding } from '@/utils/api';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'completed';

const petEmojiMap: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  other: '🐾',
};

export default function BoardingList() {
  const [orders, setOrders] = useState<BoardingOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<BoardingOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (searchText.trim()) {
      const s = searchText.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.petName.toLowerCase().includes(s) ||
          o.ownerName.toLowerCase().includes(s) ||
          o.ownerPhone.includes(s)
      );
    }
    setFilteredOrders(result);
  }, [orders, statusFilter, searchText]);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await getBoarding();
      setOrders(data);
    } catch (e) {
      console.error('Failed to load boarding orders', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这条寄养记录吗？')) return;
    try {
      await deleteBoarding(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      console.error('Failed to delete boarding order', e);
    }
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '在店' },
    { key: 'completed', label: '已完成' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-text">寄养管理</h1>
        <Link
          to="/boarding/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium transition-all hover:opacity-90 shadow-sm"
          style={{ backgroundColor: '#8FCFAD' }}
        >
          <Plus className="w-5 h-5" />
          新增寄养
        </Link>
      </div>

      <div
        className="rounded-2xl p-5 shadow-sm bg-white"
        style={{ borderRadius: 16 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  statusFilter === tab.key
                    ? 'text-white shadow-sm'
                    : 'bg-cream-coffee-50 text-warm-text/70 hover:bg-cream-coffee-100'
                )}
                style={
                  statusFilter === tab.key
                    ? { backgroundColor: '#C89F7B' }
                    : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-text/40" />
            <input
              type="text"
              placeholder="搜索宠物名 / 主人 / 电话"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full sm:w-72 pl-10 pr-4 py-2.5 rounded-xl border border-cream-coffee-100 bg-warm-bg text-sm text-warm-text placeholder-warm-text/40 outline-none transition-all focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100"
            />
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl shadow-sm overflow-hidden bg-white"
        style={{ borderRadius: 16 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-coffee-50 text-warm-text/70">
                <th className="text-left font-medium px-5 py-4">宠物</th>
                <th className="text-left font-medium px-5 py-4">主人信息</th>
                <th className="text-left font-medium px-5 py-4">入住日期</th>
                <th className="text-left font-medium px-5 py-4">预计天数</th>
                <th className="text-left font-medium px-5 py-4">每日单价</th>
                <th className="text-left font-medium px-5 py-4">状态</th>
                <th className="text-left font-medium px-5 py-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-warm-text/50">
                    加载中...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-warm-text/50">
                    <div className="text-5xl mb-3">🐾</div>
                    暂无寄养记录
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={cn(
                      'border-t border-cream-coffee-50 transition-all hover:bg-mint-50 cursor-pointer',
                      idx % 2 === 1 ? 'bg-warm-bg/40' : 'bg-white'
                    )}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ backgroundColor: '#FFF8F0' }}
                        >
                          {petEmojiMap[order.petType] || '🐾'}
                        </div>
                        <div>
                          <div className="font-medium text-warm-text">{order.petName}</div>
                          <div className="text-xs text-warm-text/50">{order.petBreed}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-warm-text">{order.ownerName}</div>
                      <div className="text-xs text-warm-text/50">{order.ownerPhone}</div>
                    </td>
                    <td className="px-5 py-4 text-warm-text">{order.checkInDate}</td>
                    <td className="px-5 py-4 text-warm-text">{order.plannedDays} 天</td>
                    <td className="px-5 py-4 text-warm-text">¥{order.dailyPrice}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                          order.status === 'active'
                            ? 'bg-mint-100 text-mint-700'
                            : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {order.status === 'active' ? '在店' : '已完成'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/boarding/${order.id}`}
                          className="p-2 rounded-lg text-warm-text/60 hover:bg-mint-50 hover:text-mint-600 transition-all"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-2 rounded-lg text-warm-text/60 hover:bg-red-50 hover:text-red-500 transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
