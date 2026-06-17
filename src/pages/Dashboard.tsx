import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PawPrint,
  Scissors,
  Wallet,
  TrendingUp,
  Plus,
  Sun,
  Moon,
  Footprints,
  Clock,
  ChevronRight,
  Loader2,
  User,
} from 'lucide-react';
import {
  getBoarding,
  getAppointments,
  getPendingCheckout,
  getStatistics,
  getGroomers,
  getGroomingServices,
  createCareRecord,
  updateAppointment,
} from '../utils/api';
import type {
  BoardingOrder,
  GroomingAppointment,
  Statistics,
  Groomer,
  GroomingService,
} from '../../shared/types';
import { cn } from '../lib/utils';

function getPetEmoji(petType: string) {
  switch (petType) {
    case 'dog':
      return '🐕';
    case 'cat':
      return '🐈';
    default:
      return '🐾';
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}月${d}日`;
}

function getTodayStr() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthStr() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return { text: '待服务', color: 'bg-amber-100 text-amber-700' };
    case 'in_progress':
      return { text: '进行中', color: 'bg-mint-100 text-mint-700' };
    case 'completed':
      return { text: '已完成', color: 'bg-warm-text/10 text-warm-text/70' };
    case 'cancelled':
      return { text: '已取消', color: 'bg-red-100 text-red-600' };
    default:
      return { text: status, color: 'bg-warm-text/10 text-warm-text/70' };
  }
}

function getNextStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'in_progress';
    case 'in_progress':
      return 'completed';
    default:
      return null;
  }
}

function getNextStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return '开始服务';
    case 'in_progress':
      return '完成';
    default:
      return '';
  }
}

const statCardStyles = [
  'from-[#E8D5C4] to-[#D4B896]',
  'from-[#C8E6D4] to-[#8FCFAD]',
  'from-[#DDD0E8] to-[#B9A7D4]',
  'from-[#F5D4B8] to-[#E8A878]',
];

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl p-6 bg-white shadow-sm animate-pulse">
      <div className="h-6 w-6 bg-warm-text/10 rounded mb-4" />
      <div className="h-10 w-20 bg-warm-text/10 rounded mb-2" />
      <div className="h-4 w-24 bg-warm-text/10 rounded" />
    </div>
  );
}

function PetCardSkeleton() {
  return (
    <div className="rounded-2xl p-4 bg-white shadow-sm animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-warm-text/10" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 bg-warm-text/10 rounded" />
          <div className="h-4 w-24 bg-warm-text/10 rounded" />
          <div className="h-4 w-28 bg-warm-text/10 rounded" />
        </div>
      </div>
      <div className="mt-4 h-9 bg-warm-text/10 rounded-xl" />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="relative pl-8 pb-6 animate-pulse">
      <div className="absolute left-2.5 top-1 w-4 h-4 rounded-full bg-warm-text/10" />
      <div className="absolute left-4 top-5 bottom-0 w-0.5 bg-warm-text/10" />
      <div className="space-y-2">
        <div className="h-5 w-32 bg-warm-text/10 rounded" />
        <div className="h-4 w-40 bg-warm-text/10 rounded" />
        <div className="h-4 w-20 bg-warm-text/10 rounded" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [boardingCount, setBoardingCount] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [pendingCheckout, setPendingCheckout] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const [boardingList, setBoardingList] = useState<BoardingOrder[]>([]);
  const [appointments, setAppointments] = useState<GroomingAppointment[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [services, setServices] = useState<GroomingService[]>([]);

  const [submittingCare, setSubmittingCare] = useState<string | null>(null);
  const [updatingAppointment, setUpdatingAppointment] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const today = getTodayStr();
        const month = getMonthStr();

        const [
          boardingRes,
          appointmentsRes,
          checkoutRes,
          statsRes,
          groomersRes,
          servicesRes,
        ] = await Promise.all([
          getBoarding('active'),
          getAppointments(today),
          getPendingCheckout(),
          getStatistics(month),
          getGroomers(),
          getGroomingServices(),
        ]);

        setBoardingCount(boardingRes.length);
        setTodayAppointments(appointmentsRes.length);
        setPendingCheckout(checkoutRes.length);
        setMonthlyRevenue((statsRes as Statistics).revenue?.total || 0);

        setBoardingList(boardingRes);
        setAppointments(appointmentsRes);
        setGroomers(groomersRes);
        setServices(servicesRes);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const groomerMap = groomers.reduce<Record<string, Groomer>>((acc, g) => {
    acc[g.id] = g;
    return acc;
  }, {});

  const serviceMap = services.reduce<Record<string, GroomingService>>((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  async function handleQuickCare(boardingId: string, type: 'feeding_morning' | 'feeding_evening' | 'walk') {
    const key = `${boardingId}-${type}`;
    if (submittingCare === key) return;
    setSubmittingCare(key);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await createCareRecord({
        boardingId,
        date: getTodayStr(),
        type,
        time: timeStr,
      });
    } catch (err) {
      console.error('Care record error:', err);
    } finally {
      setSubmittingCare(null);
    }
  }

  async function handleStatusChange(id: string, currentStatus: string) {
    const next = getNextStatus(currentStatus);
    if (!next) return;
    if (updatingAppointment === id) return;
    setUpdatingAppointment(id);
    try {
      await updateAppointment(id, { status: next as GroomingAppointment['status'] });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: next as GroomingAppointment['status'] } : a))
      );
    } catch (err) {
      console.error('Update appointment error:', err);
    } finally {
      setUpdatingAppointment(null);
    }
  }

  const statItems = [
    {
      icon: PawPrint,
      emoji: '🐾',
      label: '在店寄养',
      value: boardingCount,
      suffix: '只',
    },
    {
      icon: Scissors,
      emoji: '✂️',
      label: '今日预约',
      value: todayAppointments,
      suffix: '单',
    },
    {
      icon: Wallet,
      emoji: '💰',
      label: '待结账',
      value: pendingCheckout,
      suffix: '单',
    },
    {
      icon: TrendingUp,
      emoji: '📊',
      label: '本月收入',
      value: monthlyRevenue,
      prefix: '¥',
      suffix: '',
    },
  ];

  const quickActions = [
    {
      label: '新增寄养',
      icon: PawPrint,
      path: '/boarding/new',
      gradient: 'from-[#E8D5C4] to-[#D4B896]',
    },
    {
      label: '新增美容预约',
      icon: Scissors,
      path: '/grooming/new',
      gradient: 'from-[#C8E6D4] to-[#8FCFAD]',
    },
    {
      label: '日常照护打卡',
      icon: Sun,
      path: '/care',
      gradient: 'from-[#DDD0E8] to-[#B9A7D4]',
    },
    {
      label: '查看统计报表',
      icon: TrendingUp,
      path: '/statistics',
      gradient: 'from-[#F5D4B8] to-[#E8A878]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 数据概览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={cn(
                    'relative rounded-2xl p-6 shadow-sm bg-gradient-to-br overflow-hidden opacity-0 animate-fadeInUp',
                    statCardStyles[index]
                  )}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="absolute -right-2 -top-2 text-6xl opacity-20">
                    {item.emoji}
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="text-3xl font-bold text-white font-quicksand">
                      {item.prefix}
                      {item.value.toLocaleString()}
                      {item.suffix}
                    </div>
                    <div className="text-sm text-white/80 mt-1">{item.label}</div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 opacity-0 animate-fadeInUp" style={{ animationDelay: '320ms' }}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={cn(
                'group relative overflow-hidden rounded-2xl p-6 text-left',
                'bg-gradient-to-br shadow-sm hover:shadow-lg',
                'transition-all duration-300 hover:-translate-y-1',
                action.gradient
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-lg font-bold text-white font-quicksand flex items-center gap-2">
                {action.label}
                <ChevronRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
              <Plus className="absolute right-4 bottom-4 w-10 h-10 text-white/20" strokeWidth={1.5} />
            </button>
          );
        })}
      </div>

      {/* 下方两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左栏：今日在店寄养 */}
        <div className="lg:col-span-2 space-y-4 opacity-0 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-warm-text font-quicksand flex items-center gap-2">
              <span>🐶</span> 今日在店寄养
            </h3>
            <Link
              to="/boarding"
              className="text-sm text-cream-coffee-500 hover:text-cream-coffee-600 font-medium transition-colors"
            >
              查看全部 →
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <PetCardSkeleton key={i} />
                ))}
              </div>
            ) : boardingList.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-5xl mb-3">🐾</div>
                <p className="text-warm-text/50">暂无在店寄养宠物</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boardingList.map((pet, idx) => (
                  <div
                    key={pet.id}
                    className="group relative rounded-xl border border-warm-text/5 hover:border-cream-coffee-200 p-4 cursor-pointer transition-all duration-300 hover:shadow-md"
                    style={{ animationDelay: `${480 + idx * 60}ms` }}
                    onClick={() => navigate(`/boarding/${pet.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-warm-bg flex items-center justify-center text-3xl flex-shrink-0">
                        {getPetEmoji(pet.petType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-warm-text truncate">{pet.petName}</div>
                          <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-mint-100 text-mint-700">
                            在店
                          </span>
                        </div>
                        <div className="text-sm text-warm-text/60 mt-0.5 truncate">{pet.petBreed}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-warm-text/50">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(pet.checkInDate)} 入住
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-warm-text/50">
                          <User className="w-3 h-3" />
                          {pet.ownerPhone}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleQuickCare(pet.id, 'feeding_morning')}
                        disabled={submittingCare === `${pet.id}-feeding_morning`}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {submittingCare === `${pet.id}-feeding_morning` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sun className="w-4 h-4" />
                        )}
                        早喂
                      </button>
                      <button
                        onClick={() => handleQuickCare(pet.id, 'feeding_evening')}
                        disabled={submittingCare === `${pet.id}-feeding_evening`}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {submittingCare === `${pet.id}-feeding_evening` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Moon className="w-4 h-4" />
                        )}
                        晚喂
                      </button>
                      <button
                        onClick={() => handleQuickCare(pet.id, 'walk')}
                        disabled={submittingCare === `${pet.id}-walk`}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-700 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {submittingCare === `${pet.id}-walk` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Footprints className="w-4 h-4" />
                        )}
                        遛弯
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右栏：今日美容预约 */}
        <div className="space-y-4 opacity-0 animate-fadeInUp" style={{ animationDelay: '480ms' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-warm-text font-quicksand flex items-center gap-2">
              <span>✂️</span> 今日美容预约
            </h3>
            <Link
              to="/grooming"
              className="text-sm text-cream-coffee-500 hover:text-cream-coffee-600 font-medium transition-colors"
            >
              查看全部 →
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TimelineSkeleton key={i} />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-5xl mb-3">✂️</div>
                <p className="text-warm-text/50">今日暂无美容预约</p>
              </div>
            ) : (
              <div className="space-y-1">
                {appointments
                  .slice()
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((apt, idx, arr) => {
                    const statusInfo = getStatusLabel(apt.status);
                    const groomer = groomerMap[apt.groomerId];
                    const serviceNames = apt.serviceIds
                      .map((sid) => serviceMap[sid]?.name)
                      .filter(Boolean)
                      .join('、');
                    const isLast = idx === arr.length - 1;
                    return (
                      <div
                        key={apt.id}
                        className="relative pl-8 pb-5"
                        style={{ animationDelay: `${560 + idx * 60}ms` }}
                      >
                        {!isLast && (
                          <div
                            className="absolute left-4 top-6 bottom-0 w-0.5"
                            style={{ backgroundColor: '#F3E7D9' }}
                          />
                        )}
                        <div
                          className="absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: '#FFF8F0' }}
                        >
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cream-coffee-400 to-cream-coffee-500" />
                        </div>

                        <div className="pt-0.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="font-semibold text-warm-text flex items-center gap-2">
                              <Clock className="w-4 h-4 text-cream-coffee-500" />
                              {apt.startTime} ~ {apt.endTime}
                            </div>
                            <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusInfo.color)}>
                              {statusInfo.text}
                            </span>
                          </div>

                          <div className="mt-2 space-y-1">
                            <div className="text-sm text-warm-text font-medium">
                              {apt.petName} · {apt.petBreed}
                            </div>
                            <div className="text-xs text-warm-text/60">
                              🎀 {serviceNames || '未选择服务'}
                            </div>
                            <div className="text-xs text-warm-text/60">
                              👩‍🦰 {groomer?.name || '未分配美容师'}
                            </div>
                          </div>

                          {getNextStatus(apt.status) && (
                            <button
                              onClick={() => handleStatusChange(apt.id, apt.status)}
                              disabled={updatingAppointment === apt.id}
                              className="mt-3 px-4 py-1.5 rounded-xl bg-cream-coffee-500 hover:bg-cream-coffee-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {updatingAppointment === apt.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : null}
                              {getNextStatusLabel(apt.status)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
