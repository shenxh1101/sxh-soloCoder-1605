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
  CreditCard,
  Clock,
} from 'lucide-react';
import type {
  BoardingOrder,
  FeeCalculation,
  Payment,
} from '../../shared/types';
import {
  getBoardingById,
  calculateFee,
  pay,
  getPaymentByBoardingId,
} from '@/utils/api';
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

const paymentMethodMeta: Record<PaymentMethod, { label: string; emoji: string }> = {
  cash: { label: '现金', emoji: '💵' },
  wechat: { label: '微信', emoji: '💚' },
  alipay: { label: '支付宝', emoji: '💙' },
  card: { label: '银行卡', emoji: '💳' },
};

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export default function CheckoutDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<BoardingOrder | null>(null);
  const [fee, setFee] = useState<FeeCalculation | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
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
      const [orderData, feeData, paymentData] = await Promise.all([
        getBoardingById(id),
        calculateFee(id),
        getPaymentByBoardingId(id).catch(() => null),
      ]);
      setOrder(orderData);
      setFee(feeData);
      setPayment(paymentData);
      if (paymentData) {
        setDiscount(paymentData.discount);
        setPaymentMethod(paymentData.paymentMethod);
        setRemarks(paymentData.remarks || '');
      }
    } catch (e) {
      console.error('Failed to load checkout detail', e);
    } finally {
      setLoading(false);
    }
  }

  const isPaid = !!payment;

  const totalAmount = fee
    ? Math.max(0, fee.boardingFee + fee.groomingFee - (isPaid ? payment!.discount : discount))
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
      navigate('/checkout', { state: { activeTab: 'completed' } });
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

  const paidMeta = payment ? paymentMethodMeta[payment.paymentMethod] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/checkout"
          className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-all text-warm-text/70 hover:text-warm-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <h1 className="text-2xl font-bold text-warm-text">结账详情</h1>
          {isPaid && payment && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint-100 text-mint-700 text-sm font-medium">
              <Check className="w-4 h-4" strokeWidth={3} />
              已完成
            </div>
          )}
        </div>
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
            <div className="flex items-center gap-5 flex-wrap">
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
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Calendar className="w-4 h-4 text-warm-text/40" />
                    <span className="text-warm-text/70">入住：</span>
                    <span className="text-warm-text font-medium">{order.checkInDate}</span>
                    {order.checkOutDate && (
                      <>
                        <span className="text-warm-text/40">·</span>
                        <span className="text-warm-text/70">离店：</span>
                        <span className="text-warm-text font-medium">{order.checkOutDate}</span>
                      </>
                    )}
                    <span className="text-warm-text/40">·</span>
                    <span className="text-warm-text/70">寄养</span>
                    <span className="text-warm-text font-medium">{fee.boardingDays} 天</span>
                  </div>
                  {isPaid && payment && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-warm-text/40" />
                      <span className="text-warm-text/70">收款时间：</span>
                      <span className="text-warm-text font-medium">
                        {formatDateTime(payment.paidAt)}
                      </span>
                    </div>
                  )}
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
                {isPaid ? (
                  <span className="text-red-400 font-medium">-¥{payment!.discount}</span>
                ) : (
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
                )}
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
          {isPaid && payment && paidMeta ? (
            <>
              <div
                className="rounded-2xl shadow-sm bg-white p-6"
                style={{ borderRadius: 16 }}
              >
                <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-5 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  支付方式
                </h2>
                <div
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-mint-50 border-2"
                  style={{ borderColor: '#8FCFAD' }}
                >
                  <span className="text-2xl">{paidMeta.emoji}</span>
                  <span className="font-medium text-mint-700 flex-1">
                    {paidMeta.label}
                  </span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#8FCFAD' }}
                  >
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
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
                {payment.remarks ? (
                  <p className="text-sm text-warm-text leading-relaxed whitespace-pre-wrap">
                    {payment.remarks}
                  </p>
                ) : (
                  <p className="text-sm text-warm-text/40">无备注</p>
                )}
              </div>

              <Link
                to="/checkout"
                state={{ activeTab: 'completed' }}
                className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl text-white font-bold text-lg transition-all hover:opacity-90 shadow-sm"
                style={{ backgroundColor: '#C89F7B' }}
              >
                <ArrowLeft className="w-5 h-5" />
                返回结账列表
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
