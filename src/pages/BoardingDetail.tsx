import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  Plus,
  X,
  Sun,
  Moon,
  Footprints,
  FileText,
  Scissors,
  Check,
} from 'lucide-react';
import type {
  BoardingOrder,
  CareRecord,
  FeeCalculation,
  GroomingAppointment,
  Payment,
} from '../../shared/types';
import {
  getBoardingById,
  getCareRecords,
  createCareRecord,
  getAppointments,
  calculateFee,
  getPaymentByBoardingId,
} from '@/utils/api';
import { cn } from '@/lib/utils';

const petEmojiMap: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  other: '🐾',
};

const petTypeLabel: Record<string, string> = {
  dog: '狗狗',
  cat: '猫咪',
  other: '其他',
};

const paymentMethodMeta: Record<Payment['paymentMethod'], { label: string; emoji: string }> = {
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

const careTypeMeta: Record<
  CareRecord['type'],
  { label: string; icon: typeof Sun; color: string; bg: string }
> = {
  feeding_morning: {
    label: '早间喂食',
    icon: Sun,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  feeding_evening: {
    label: '晚间喂食',
    icon: Moon,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  walk: {
    label: '遛弯',
    icon: Footprints,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  status_note: {
    label: '状态记录',
    icon: FileText,
    color: 'text-cream-coffee-700',
    bg: 'bg-cream-coffee-50',
  },
};

function calcActualDays(checkInDate: string): number {
  const start = new Date(checkInDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

export default function BoardingDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [order, setOrder] = useState<BoardingOrder | null>(null);
  const [careRecords, setCareRecords] = useState<CareRecord[]>([]);
  const [appointments, setAppointments] = useState<GroomingAppointment[]>([]);
  const [fee, setFee] = useState<FeeCalculation | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCareModal, setShowCareModal] = useState(false);
  const [careForm, setCareForm] = useState<{
    type: CareRecord['type'];
    note: string;
  }>({ type: 'feeding_morning', note: '' });
  const [submittingCare, setSubmittingCare] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id, location.key]);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const [orderData, recordsData, aptsData, feeData, paymentData] = await Promise.all([
        getBoardingById(id),
        getCareRecords({ boardingId: id }),
        getAppointments(),
        calculateFee(id).catch(() => null),
        getPaymentByBoardingId(id).catch(() => null),
      ]);
      setOrder(orderData);
      setCareRecords(recordsData);
      setAppointments(aptsData.filter((a) => a.boardingId === id));
      setFee(feeData);
      setPayment(paymentData);
    } catch (e) {
      console.error('Failed to load boarding detail', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCare(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmittingCare(true);
    try {
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const created = await createCareRecord({
        boardingId: id,
        type: careForm.type,
        date,
        time,
        note: careForm.note.trim(),
      });
      setCareRecords((prev) => [...prev, created]);
      setShowCareModal(false);
      setCareForm({ type: 'feeding_morning', note: '' });
    } catch (err) {
      console.error('Failed to create care record', err);
      alert('添加记录失败，请重试');
    } finally {
      setSubmittingCare(false);
    }
  }

  const recordsByDate = careRecords
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .reduce<Record<string, CareRecord[]>>((acc, r) => {
      if (!acc[r.date]) acc[r.date] = [];
      acc[r.date].push(r);
      return acc;
    }, {});

  const sortedDates = Object.keys(recordsByDate).sort().reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-warm-text/60">加载中...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-3">🐾</div>
          <p className="text-warm-text/60">未找到寄养记录</p>
          <Link
            to="/boarding"
            className="inline-block mt-4 px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#8FCFAD' }}
          >
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  const actualDays = calcActualDays(order.checkInDate);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/boarding"
            className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-all text-warm-text/70 hover:text-warm-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-warm-text">{order.petName}</h1>
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
          </div>
        </div>
        {order.status === 'active' ? (
          <Link
            to={`/checkout/${id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium transition-all hover:opacity-90 shadow-sm"
            style={{ backgroundColor: '#C89F7B' }}
          >
            <Wallet className="w-5 h-5" />
            去结账
          </Link>
        ) : payment ? (
          <Link
            to={`/checkout/${id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mint-100 text-mint-700 font-medium transition-all hover:bg-mint-200 shadow-sm"
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            已结账
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="rounded-2xl shadow-sm bg-white p-6"
          style={{ borderRadius: 16 }}
        >
          <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-5">
            宠物信息
          </h2>
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-3"
              style={{ backgroundColor: '#FFF8F0' }}
            >
              {petEmojiMap[order.petType] || '🐾'}
            </div>
            <div className="text-xl font-bold text-warm-text">{order.petName}</div>
            <div className="text-sm text-warm-text/60">
              {order.petBreed} · {petTypeLabel[order.petType] || order.petType}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-cream-coffee-50">
              <span className="text-sm text-warm-text/60">入住日期</span>
              <span className="text-sm font-medium text-warm-text">
                {order.checkInDate}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-cream-coffee-50">
              <span className="text-sm text-warm-text/60">预计天数</span>
              <span className="text-sm font-medium text-warm-text">
                {order.plannedDays} 天
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-cream-coffee-50">
              <span className="text-sm text-warm-text/60">已住天数</span>
              <span className="text-sm font-medium text-warm-text">
                {actualDays} 天
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-cream-coffee-50">
              <span className="text-sm text-warm-text/60">主人</span>
              <span className="text-sm font-medium text-warm-text">
                {order.ownerName}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-cream-coffee-50">
              <span className="text-sm text-warm-text/60">联系电话</span>
              <span className="text-sm font-medium text-warm-text">
                {order.ownerPhone}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-warm-text/60">每日价格</span>
              <span className="text-sm font-bold text-mint-600">
                ¥{order.dailyPrice}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div
            className="rounded-2xl shadow-sm bg-white p-6 border-2"
            style={{ borderRadius: 16, borderColor: '#F5B971' }}
          >
            <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Sun className="w-4 h-4" />
              喂食要求
            </h2>
            {order.feedingInstructions ? (
              <p className="text-sm text-warm-text leading-relaxed whitespace-pre-wrap">
                {order.feedingInstructions}
              </p>
            ) : (
              <p className="text-sm text-warm-text/40">暂无特殊喂食要求</p>
            )}
          </div>

          <div
            className="rounded-2xl shadow-sm bg-white p-6 border-2"
            style={{ borderRadius: 16, borderColor: '#F5B971' }}
          >
            <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              特殊需求
            </h2>
            {order.specialNeeds ? (
              <p className="text-sm text-warm-text leading-relaxed whitespace-pre-wrap">
                {order.specialNeeds}
              </p>
            ) : (
              <p className="text-sm text-warm-text/40">暂无特殊需求</p>
            )}
          </div>
        </div>

        <div
          className="rounded-2xl shadow-sm bg-white p-6"
          style={{ borderRadius: 16 }}
        >
          <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-5">
            费用概览
          </h2>
          {fee ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-warm-text/70">
                  寄养 {fee.boardingDays} 天 × ¥{order.dailyPrice}
                </span>
                <span className="text-sm font-medium text-warm-text">
                  ¥{fee.boardingFee}
                </span>
              </div>

              {fee.groomingItems.length > 0 && (
                <div className="pt-3 border-t border-cream-coffee-50">
                  <div className="text-sm text-warm-text/70 mb-2">美容项目</div>
                  <div className="space-y-2">
                    {fee.groomingItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-warm-text/70 pl-3 border-l-2 border-mint-200">
                          {item.name}
                        </span>
                        <span className="text-warm-text">¥{item.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2 text-sm">
                    <span className="text-warm-text/70">美容小计</span>
                    <span className="font-medium text-warm-text">
                      ¥{fee.groomingFee}
                    </span>
                  </div>
                </div>
              )}

              {fee.discount > 0 && (
                <div className="flex justify-between items-center py-2 pt-3 border-t border-cream-coffee-50">
                  <span className="text-sm text-warm-text/70">优惠</span>
                  <span className="text-sm font-medium text-red-400">
                    -¥{fee.discount}
                  </span>
                </div>
              )}

              <div className="pt-5 border-t-2 border-cream-coffee-100 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-base text-warm-text font-medium">总计</span>
                  <span
                    className="text-3xl font-bold"
                    style={{ color: '#C89F7B' }}
                  >
                    ¥{fee.totalAmount}
                  </span>
                </div>
              </div>

              {payment && (
                <div className="pt-4 mt-4 border-t border-cream-coffee-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-warm-text/70">结账状态</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-mint-100 text-mint-700">
                      <Check className="w-3 h-3" strokeWidth={3} />
                      已结账
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-warm-text/70">支付方式</span>
                    <span className="text-sm font-medium text-warm-text">
                      {paymentMethodMeta[payment.paymentMethod].emoji}{' '}
                      {paymentMethodMeta[payment.paymentMethod].label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-warm-text/70">收款时间</span>
                    <span className="text-sm font-medium text-warm-text">
                      {formatDateTime(payment.paidAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-warm-text/40">暂无费用信息</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-2xl shadow-sm bg-white p-6"
          style={{ borderRadius: 16 }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide">
              照护时间线
            </h2>
            <button
              onClick={() => setShowCareModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 shadow-sm"
              style={{ backgroundColor: '#8FCFAD' }}
            >
              <Plus className="w-4 h-4" />
              添加记录
            </button>
          </div>

          {sortedDates.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🌞</div>
              <p className="text-sm text-warm-text/50">暂无照护记录</p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[480px] overflow-y-auto pr-2">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="text-xs font-semibold text-warm-text/50 mb-3">
                    {date}
                  </div>
                  <div className="relative pl-6 space-y-3">
                    <div className="absolute left-[7px] top-0 bottom-0 w-px bg-cream-coffee-100" />
                    {recordsByDate[date].map((record) => {
                      const meta = careTypeMeta[record.type];
                      const Icon = meta.icon;
                      return (
                        <div key={record.id} className="relative">
                          <div
                            className={cn(
                              'absolute -left-[1px] top-3 w-4 h-4 rounded-full flex items-center justify-center -translate-x-1/2',
                              meta.bg
                            )}
                          >
                            <Icon className={cn('w-3 h-3', meta.color)} />
                          </div>
                          <div
                            className="rounded-xl p-4 ml-2"
                            style={{ backgroundColor: '#FAF7F2' }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={cn('text-sm font-medium', meta.color)}
                              >
                                {meta.label}
                              </span>
                              <span className="text-xs text-warm-text/40">
                                {record.time}
                              </span>
                            </div>
                            {record.note && (
                              <p className="text-sm text-warm-text/70 mt-1">
                                {record.note}
                              </p>
                            )}
                            {record.operator && (
                              <p className="text-xs text-warm-text/40 mt-2">
                                操作人：{record.operator}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl shadow-sm bg-white p-6"
          style={{ borderRadius: 16 }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide">
              关联美容预约
            </h2>
            <Link
              to={`/grooming/new?boardingId=${id}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cream-coffee-50 text-warm-text text-sm font-medium transition-all hover:bg-cream-coffee-100"
            >
              <Scissors className="w-4 h-4" />
              新增美容
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">✂️</div>
              <p className="text-sm text-warm-text/50">暂无关联美容预约</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="rounded-xl p-4 border border-cream-coffee-50 hover:border-mint-200 transition-all"
                  style={{ backgroundColor: '#FAF7F2' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-warm-text">
                      {apt.appointmentDate}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        apt.status === 'completed'
                          ? 'bg-mint-100 text-mint-700'
                          : apt.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-700'
                          : apt.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {apt.status === 'completed'
                        ? '已完成'
                        : apt.status === 'in_progress'
                        ? '进行中'
                        : apt.status === 'cancelled'
                        ? '已取消'
                        : '待开始'}
                    </span>
                  </div>
                  <div className="text-sm text-warm-text/60">
                    {apt.startTime} - {apt.endTime}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-cream-coffee-100">
                    <span className="text-xs text-warm-text/50">
                      {apt.petBreed}
                    </span>
                    <span className="text-sm font-bold text-mint-600">
                      ¥{apt.totalPrice}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-text/30 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl shadow-xl bg-white p-6"
            style={{ borderRadius: 16 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-warm-text">添加照护记录</h3>
              <button
                onClick={() => setShowCareModal(false)}
                className="p-1.5 rounded-lg hover:bg-cream-coffee-50 text-warm-text/50 hover:text-warm-text transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCare} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-warm-text mb-3">
                  记录类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.keys(careTypeMeta) as CareRecord['type'][]
                  ).map((type) => {
                    const meta = careTypeMeta[type];
                    const Icon = meta.icon;
                    const active = careForm.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCareForm((f) => ({ ...f, type }))}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                          active
                            ? 'border-mint-300 bg-mint-50'
                            : 'border-cream-coffee-100 hover:border-cream-coffee-200'
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4',
                            active ? meta.color : 'text-warm-text/50'
                          )}
                        />
                        <span
                          className={
                            active ? 'text-warm-text' : 'text-warm-text/70'
                          }
                        >
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-text mb-2">
                  备注
                </label>
                <textarea
                  rows={3}
                  value={careForm.note}
                  onChange={(e) =>
                    setCareForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="输入照护备注..."
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-coffee-100 bg-white text-sm text-warm-text placeholder-warm-text/40 outline-none transition-all focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCareModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-cream-coffee-200 text-warm-text/70 font-medium hover:bg-cream-coffee-50 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submittingCare}
                  className="px-5 py-2.5 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
                  style={{ backgroundColor: '#8FCFAD' }}
                >
                  {submittingCare ? '提交中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
