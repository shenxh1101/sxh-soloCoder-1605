import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Eye, Calendar, User, Phone, Scissors } from 'lucide-react';
import type { BoardingOrder, CompletedCheckout } from '../../shared/types';
import { getPendingCheckout, getCompletedCheckout } from '@/utils/api';
import { cn } from '@/lib/utils';

type TabKey = 'pending' | 'completed';

const petEmojiMap: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  other: '🐾',
};

const paymentMethodMeta: Record<
  CompletedCheckout['payment']['paymentMethod'],
  { label: string; emoji: string }
> = {
  cash: { label: '现金', emoji: '💵' },
  wechat: { label: '微信', emoji: '💚' },
  alipay: { label: '支付宝', emoji: '💙' },
  card: { label: '银行卡', emoji: '💳' },
};

function calcActualDays(checkInDate: string): number {
  const start = new Date(checkInDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export default function CheckoutList() {
  const location = useLocation();
  const initialTab: TabKey =
    (location.state as { activeTab?: TabKey } | null)?.activeTab === 'completed'
      ? 'completed'
      : 'pending';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [pendingOrders, setPendingOrders] = useState<BoardingOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<CompletedCheckout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [pending, completed] = await Promise.all([
        getPendingCheckout(),
        getCompletedCheckout(),
      ]);
      setPendingOrders(pending);
      setCompletedOrders(completed);
    } catch (e) {
      console.error('Failed to load checkout data', e);
    } finally {
      setLoading(false);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: '待结账' },
    { key: 'completed', label: '已结账' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-text">💰 结账管理</h1>
      </div>

      <div className="rounded-2xl p-5 shadow-sm bg-white" style={{ borderRadius: 16 }}>
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'text-white shadow-sm'
                  : 'bg-cream-coffee-50 text-warm-text/70 hover:bg-cream-coffee-100'
              )}
              style={
                activeTab === tab.key
                  ? { backgroundColor: '#C89F7B' }
                  : undefined
              }
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
                  {tab.key === 'pending' ? pendingOrders.length : completedOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-warm-text/60">加载中...</div>
        </div>
      ) : activeTab === 'pending' ? (
        pendingOrders.length === 0 ? (
          <div className="rounded-2xl shadow-sm bg-white py-20 text-center" style={{ borderRadius: 16 }}>
            <div className="text-5xl mb-3">🐾</div>
            <p className="text-warm-text/50">暂无待结账订单</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOrders.map((order) => {
              const days = calcActualDays(order.checkInDate);
              return (
                <div
                  key={order.id}
                  className="rounded-2xl shadow-sm bg-white p-5 transition-all hover:shadow-md"
                  style={{ borderRadius: 16 }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: '#FFF8F0' }}
                    >
                      {petEmojiMap[order.petType] || '🐾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-warm-text text-lg">{order.petName}</div>
                      <div className="text-sm text-warm-text/60">{order.petBreed}</div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-mint-100 text-mint-700">
                      在店
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-warm-text/40" />
                      <span className="text-warm-text/70">主人：</span>
                      <span className="text-warm-text font-medium">{order.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-warm-text/40" />
                      <span className="text-warm-text/70">电话：</span>
                      <span className="text-warm-text font-medium">{order.ownerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-warm-text/40" />
                      <span className="text-warm-text/70">入住：</span>
                      <span className="text-warm-text font-medium">{order.checkInDate}</span>
                      <span className="ml-auto px-2.5 py-0.5 rounded-full bg-cream-coffee-100 text-cream-coffee-700 text-xs font-medium">
                        已寄养 {days} 天
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-cream-coffee-50">
                    <Link
                      to={`/checkout/${order.id}`}
                      className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl text-white font-medium transition-all hover:opacity-90 shadow-sm"
                      style={{ backgroundColor: '#8FCFAD' }}
                    >
                      <Eye className="w-4 h-4" />
                      查看费用明细
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : completedOrders.length === 0 ? (
        <div className="rounded-2xl shadow-sm bg-white py-20 text-center" style={{ borderRadius: 16 }}>
          <div className="text-5xl mb-3">📋</div>
          <p className="text-warm-text/50">暂无已结账订单</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedOrders.map((order) => {
            const meta = paymentMethodMeta[order.payment.paymentMethod];
            return (
              <div
                key={order.boardingId}
                className="rounded-2xl shadow-sm bg-white p-5 transition-all hover:shadow-md"
                style={{ borderRadius: 16 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: '#FFF8F0' }}
                    >
                      {petEmojiMap[order.petType] || '🐾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-warm-text text-lg truncate">{order.petName}</div>
                      <div className="text-sm text-warm-text/60 truncate">{order.petBreed}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cream-coffee-50">
                      <span className="text-base">{meta.emoji}</span>
                      <span className="text-xs font-medium text-cream-coffee-700">{meta.label}</span>
                    </div>
                    <div
                      className="text-2xl font-bold leading-tight"
                      style={{ color: '#C89F7B' }}
                    >
                      ¥{order.payment.totalAmount}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-warm-text/70">
                      <User className="w-3.5 h-3.5 text-warm-text/40" />
                      主人
                    </span>
                    <span className="text-warm-text font-medium">
                      {order.ownerName} · {order.ownerPhone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-warm-text/70">
                      <Calendar className="w-3.5 h-3.5 text-warm-text/40" />
                      入住 / 离店
                    </span>
                    <span className="text-warm-text font-medium">
                      {order.checkInDate} → {order.checkOutDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-warm-text/70">
                      <Scissors className="w-3.5 h-3.5 text-warm-text/40" />
                      寄养 / 美容
                    </span>
                    <span className="text-warm-text font-medium">
                      {order.boardingDays} 天 · {order.groomingItemsCount} 项
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-warm-text/70">收款时间</span>
                    <span className="text-warm-text font-medium">
                      {formatDateTime(order.payment.paidAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-cream-coffee-50">
                  <Link
                    to={`/checkout/${order.boardingId}`}
                    className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl border border-cream-coffee-200 text-warm-text/70 font-medium transition-all hover:bg-cream-coffee-50"
                  >
                    <Eye className="w-4 h-4" />
                    查看详情
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
