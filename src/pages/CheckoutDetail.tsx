import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Scissors,
  Tag,
  MessageSquare,
  Check,
  Loader2,
} from 'lucide-react';
import type {
  BoardingOrder,
  FeeCalculation,
  Payment,
} from '../../shared/types';
import { getBoardingById, calculateFee, pay } from '@/utils/api';
import { cn } from '@/lib/utils';

const petEmojiMap: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  other: '🐾',
};

type PaymentMethod = Payment['paymentMethod'];

const paymentMethodOptions: Array<{
  key: PaymentMethod;
  label: string;
  emoji: string;
}> = [
  { key: 'cash', label: '现金', emoji: '💵' },
  { key: 'wechat', label: '微信', emoji: '💚' },
  { key: 'alipay', label: '支付宝', emoji: '💙' },
  { key: 'card', label: '银行卡', emoji: '💳' },
];

export default function CheckoutDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<BoardingOrder | null>(null);
  const [fee, setFee] = useState<FeeCalculation | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    try {
      const [orderData, feeData] = await Promise.all([
        getBoardingById(id),
        calculateFee(id),
      ]);
      setOrder(orderData);
      setFee(feeData);
    } catch (e) {
      console.error('Failed to load checkout detail', e);
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = fee
    ? Math.max(0, fee.boardingFee + fee.groomingFee - discount)
    : 0;

  async function handlePay() {
    if (!id || !order || !fee) return;
    if (!confirm(`确认收款 ¥${totalAmount}？`)) return;
    setSubmitting(true);
    try {
      await pay({
        boardingId: id,
        discount,
        paymentMethod,
        remarks: remarks.trim(),
        boardingFee: fee.boardingFee,
        groomingFee: fee.groomingFee,
        totalAmount,
      });
      alert('收款成功！');
      navigate('/checkout');
    } catch (e) {
      console.error('Failed to pay', e);
      alert('收款失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-warm-text/60">加载中...</div>
      </div>
    );
  }

  if (!order || !fee) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-3">🐾</div>
          <p className="text-warm-text/60">未找到订单信息</p>
          <Link
            to="/checkout"
            className="inline-block mt-4 px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#8FCFAD' }}
          >
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/checkout"
          className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-all text-warm-text/70 hover:text-warm-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-warm-text">结账详情</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div
            className="rounded-2xl shadow-sm bg-white p-6"
            style={{ borderRadius: 16 }}
          >
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-5">
              订单概要
            </h2>
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl flex-shrink-0"
                style={{ backgroundColor: '#FFF8F0' }}
              >
                {petEmojiMap[order.petType] || '🐾'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-bold text-warm-text">{order.petName}</div>
                <div className="text-sm text-warm-text/60 mt-0.5">{order.petBreed}</div>
                <div className="mt-3 space-y-1.5">
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
                    <span className="text-warm-text/70">入住日期：</span>
                    <span className="text-warm-text font-medium">{order.checkInDate}</span>
                    <span className="text-warm-text/40">·</span>
                    <span className="text-warm-text/70">预计</span>
                    <span className="text-warm-text font-medium">{order.plannedDays} 天</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl shadow-sm bg-white p-6"
            style={{ borderRadius: 16 }}
          >
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-5">
              费用明细
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-cream-coffee-50">
                <div className="flex items-center gap-2">
                  <span className="text-warm-text">寄养费</span>
                  <span className="text-sm text-warm-text/50">
                    {fee.boardingDays} 天 × ¥{order.dailyPrice}/天
                  </span>
                </div>
                <span className="text-warm-text font-medium">¥{fee.boardingFee}</span>
              </div>

              {fee.groomingItems.length > 0 && (
                <div className="py-3 border-b border-cream-coffee-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Scissors className="w-4 h-4 text-mint-500" />
                    <span className="text-warm-text">美容项目</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {fee.groomingItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-warm-text/70 pl-3 border-l-2 border-mint-200">
                          {item.name}
                        </span>
                        <span className="text-warm-text">¥{item.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 text-sm border-t border-cream-coffee-50/60">
                    <span className="text-warm-text/70 pl-6">美容小计</span>
                    <span className="text-warm-text font-medium">¥{fee.groomingFee}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-3 border-b border-cream-coffee-50">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cream-coffee-500" />
                  <span className="text-warm-text">优惠金额</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-warm-text">¥</span>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) =>
                      setDiscount(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-24 px-3 py-1.5 rounded-lg border border-cream-coffee-100 bg-warm-bg text-sm text-warm-text text-right outline-none transition-all focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100"
                  />
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-base text-warm-text font-medium">合计</span>
                  <span
                    className="text-4xl font-bold"
                    style={{ color: '#C89F7B' }}
                  >
                    ¥{totalAmount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div
            className="rounded-2xl shadow-sm bg-white p-6"
            style={{ borderRadius: 16 }}
          >
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-5">
              支付方式
            </h2>
            <div className="space-y-3">
              {paymentMethodOptions.map((option) => {
                const selected = paymentMethod === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPaymentMethod(option.key)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all',
                      selected
                        ? 'bg-mint-50'
                        : 'bg-white hover:bg-cream-coffee-50'
                    )}
                    style={{
                      borderColor: selected ? '#8FCFAD' : '#F3E7D9',
                    }}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span
                      className={cn(
                        'font-medium flex-1',
                        selected ? 'text-mint-700' : 'text-warm-text'
                      )}
                    >
                      {option.label}
                    </span>
                    {selected && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#8FCFAD' }}
                      >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="rounded-2xl shadow-sm bg-white p-6"
            style={{ borderRadius: 16 }}
          >
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              备注
            </h2>
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="可选，输入备注信息..."
              className="w-full px-4 py-3 rounded-xl border border-cream-coffee-100 bg-warm-bg text-sm text-warm-text placeholder-warm-text/40 outline-none transition-all focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100 resize-none"
            />
          </div>

          <button
            onClick={handlePay}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-bold text-lg transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
            style={{ backgroundColor: '#8FCFAD' }}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" strokeWidth={3} />
            )}
            ✅ 确认收款 · ¥{totalAmount}
          </button>
        </div>
      </div>
    </div>
  );
}
