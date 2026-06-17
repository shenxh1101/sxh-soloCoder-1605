import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Calendar, User, Phone } from 'lucide-react';
import type { BoardingOrder, Payment } from '../../shared/types';
import { getPendingCheckout, getCompletedCheckout } from '@/utils/api';
import { cn } from '@/lib/utils';

type TabKey = 'pending' | 'completed';

const petEmojiMap: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  other: '🐾',
};

const paymentMethodMeta: Record<
  Payment['paymentMethod'],
  { label: string; emoji: string }
> = {
  cash: { label: '现金', emoji: '💵' },
  wechat: { label: '微信', emoji: '💚' },
  alipay: { label: '支付宝', emoji: '💙' },
  card: { label: '银行卡', emoji: '💳' },
};

interface CompletedCheckoutItem {
  id: string;
  petName: string;
  petBreed: string;
  checkInDate: string;
  checkOutDate: string;
  boardingDays: number;
  totalAmount: number;
  paymentMethod: Payment['paymentMethod'];
  paidAt: string;
}

function calcActualDays(checkInDate: string): number {
  const start = new Date(checkInDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

export default function CheckoutList() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [pendingOrders, setPendingOrders] = useState<BoardingOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<CompletedCheckoutItem[]>([]);
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
      setCompletedOrders(completed as CompletedCheckoutItem[]);
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
            const meta = paymentMethodMeta[order.paymentMethod];
            return (
              <div
                key={order.id}
                className="rounded-2xl shadow-sm bg-white p-5 transition-all hover:shadow-md"
                style={{ borderRadius: 16 }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-warm-text text-lg">{order.petName}</div>
                    <div className="text-sm text-warm-text/60">{order.petBreed}</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-coffee-50">
                    <span className="text-xl">{meta.emoji}</span>
                    <span className="text-sm font-medium text-cream-coffee-700">{meta.label}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-warm-text/70">入住日期</span>
                    <span className="text-warm-text font-medium">{order.checkInDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-warm-text/70">离店日期</span>
                    <span className="text-warm-text font-medium">{order.checkOutDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-warm-text/70">寄养天数</span>
                    <span className="text-warm-text font-medium">{order.boardingDays} 天</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-cream-coffee-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-warm-text/50">支付金额</div>
                      <div
                        className="text-3xl font-bold"
                        style={{ color: '#C89F7B' }}
                      >
                        ¥{order.totalAmount}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-warm-text/50">支付时间</div>
                      <div className="text-sm text-warm-text font-medium">{order.paidAt}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-cream-coffee-50">
                  <Link
                    to={`/checkout/${order.id}`}
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
