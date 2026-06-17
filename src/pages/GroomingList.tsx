import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Check,
  X,
  Trash2,
  Scissors,
  User,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react';
import {
  getAppointments,
  getGroomers,
  getGroomingServices,
  updateAppointment,
  deleteAppointment,
} from '@/utils/api';
import type {
  GroomingAppointment,
  Groomer,
  GroomingService,
} from '../../shared/types';

type ViewMode = 'cards' | 'schedule';

const statusConfig: Record<
  GroomingAppointment['status'],
  { label: string; bg: string; text: string }
> = {
  pending: { label: '待服务', bg: 'bg-amber-100', text: 'text-amber-700' },
  in_progress: { label: '进行中', bg: 'bg-mint-100', text: 'text-mint-700' },
  completed: { label: '已完成', bg: 'bg-gray-100', text: 'text-gray-500' },
  cancelled: { label: '已取消', bg: 'bg-red-100', text: 'text-red-600' },
};

const scheduleStatusStyle: Record<
  GroomingAppointment['status'],
  { bg: string; border?: string }
> = {
  pending: { bg: 'bg-amber-300' },
  in_progress: { bg: 'bg-mint-300' },
  completed: { bg: 'bg-gray-300' },
  cancelled: { bg: 'bg-white', border: 'border-2 border-red-400' },
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${m}月${d}日 ${w}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const DAY_START_MIN = 9 * 60;
const DAY_END_MIN = 20 * 60;
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 2;

function generateTimeHeaders(): Array<{ label: string; minutes: number }> {
  const headers: Array<{ label: string; minutes: number }> = [];
  for (let t = DAY_START_MIN; t <= DAY_END_MIN; t += SLOT_MINUTES) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    headers.push({
      label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      minutes: t,
    });
  }
  return headers;
}

export default function GroomingList() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<GroomingAppointment[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [services, setServices] = useState<GroomingService[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const dateStr = useMemo(() => formatDate(selectedDate), [selectedDate]);

  const groomerMap = useMemo(() => {
    const m = new Map<string, Groomer>();
    groomers.forEach((g) => m.set(g.id, g));
    return m;
  }, [groomers]);

  const serviceMap = useMemo(() => {
    const m = new Map<string, GroomingService>();
    services.forEach((s) => m.set(s.id, s));
    return m;
  }, [services]);

  const timeHeaders = useMemo(() => generateTimeHeaders(), []);
  const scheduleWidth = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MINUTE;

  const appointmentsByGroomer = useMemo(() => {
    const map = new Map<string, GroomingAppointment[]>();
    appointments.forEach((apt) => {
      if (!map.has(apt.groomerId)) {
        map.set(apt.groomerId, []);
      }
      map.get(apt.groomerId)!.push(apt);
    });
    return map;
  }, [appointments]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [aptList, grList, svList] = await Promise.all([
          getAppointments(dateStr),
          getGroomers(),
          getGroomingServices(),
        ]);
        setAppointments(aptList);
        setGroomers(grList);
        setServices(svList);
      } finally {
        setLoading(false);
      }
    })();
  }, [dateStr]);

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const handleUpdateStatus = async (
    id: string,
    status: GroomingAppointment['status'],
  ) => {
    await updateAppointment(id, { status });
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此预约吗？')) return;
    await deleteAppointment(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSlotClick = (startMinutes: number) => {
    const h = Math.floor(startMinutes / 60);
    const m = startMinutes % 60;
    const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    navigate('/grooming/new', { state: { date: dateStr, startTime } });
  };

  const getAppointmentStyle = (apt: GroomingAppointment) => {
    const startMin = Math.max(timeToMinutes(apt.startTime), DAY_START_MIN);
    const endMin = Math.min(timeToMinutes(apt.endTime), DAY_END_MIN);
    const left = (startMin - DAY_START_MIN) * PX_PER_MINUTE;
    const width = Math.max((endMin - startMin) * PX_PER_MINUTE - 2, 20);
    return { left, width };
  };

  const getServiceNames = (serviceIds: string[]) => {
    return serviceIds
      .map((sid) => serviceMap.get(sid)?.name)
      .filter(Boolean)
      .join('、');
  };

  const getTotalPrice = (serviceIds: string[]) => {
    return serviceIds.reduce((sum, sid) => {
      const svc = serviceMap.get(sid);
      return sum + (svc?.price || 0);
    }, 0);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Scissors className="w-7 h-7 text-mint-500" />
          <h1 className="text-2xl font-bold text-warm-text">美容预约管理</h1>
        </div>
        <button
          onClick={() => navigate('/grooming/new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-mint-400 hover:bg-mint-500 text-white font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          新增预约
        </button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <aside className="w-60 flex-shrink-0 bg-white rounded-2xl shadow-sm p-5 h-fit">
          <h3 className="font-bold text-warm-text mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-mint-500" />
            美容师团队
          </h3>
          <div className="space-y-3">
            {groomers.map((g) => (
              <div
                key={g.id}
                className="p-3 bg-cream-coffee-50 rounded-xl"
              >
                <div className="font-semibold text-warm-text">{g.name}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {g.services.map((sid) => {
                    const svc = serviceMap.get(sid);
                    return svc ? (
                      <span
                        key={sid}
                        className="text-xs px-2 py-0.5 bg-mint-100 text-mint-700 rounded-full"
                      >
                        {svc.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-warm-text" />
            </button>
            <div className="px-6 py-2 bg-white rounded-xl shadow-sm min-w-[160px] text-center">
              <span className="font-bold text-warm-text text-lg">
                {formatDisplayDate(dateStr)}
              </span>
            </div>
            <button
              onClick={() => shiftDate(1)}
              className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-warm-text" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="ml-2 px-4 py-2 text-sm bg-cream-coffee-100 hover:bg-cream-coffee-200 text-warm-text rounded-xl transition-colors"
            >
              今天
            </button>
            <div className="ml-4 inline-flex bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-mint-400 text-white'
                    : 'text-warm-text hover:bg-cream-coffee-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                卡片视图
              </button>
              <button
                onClick={() => setViewMode('schedule')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'schedule'
                    ? 'bg-mint-400 text-white'
                    : 'text-warm-text hover:bg-cream-coffee-50'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                日程视图
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-warm-text/60">加载中...</div>
            </div>
          ) : viewMode === 'cards' ? (
            appointments.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">✂️</div>
                  <p className="text-warm-text/60">当天暂无预约</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 overflow-auto pr-2">
                {appointments.map((apt) => {
                  const groomer = groomerMap.get(apt.groomerId);
                  const statusStyle = statusConfig[apt.status];
                  return (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl shadow-sm p-5 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-2xl font-bold text-warm-text">
                          {apt.startTime}
                          <span className="text-warm-text/40 mx-1">-</span>
                          {apt.endTime}
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="font-bold text-warm-text text-lg">
                          {apt.petName}
                          <span className="text-warm-text/50 font-normal text-sm ml-2">
                            {apt.petBreed}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {apt.serviceIds.map((sid) => {
                          const svc = serviceMap.get(sid);
                          return svc ? (
                            <span
                              key={sid}
                              className="px-2.5 py-1 text-xs bg-cream-coffee-100 text-warm-text rounded-lg"
                            >
                              {svc.name}
                            </span>
                          ) : null;
                        })}
                      </div>

                      <div className="text-sm text-warm-text/70 flex items-center gap-1.5 mb-4">
                        <User className="w-4 h-4 text-mint-500" />
                        {groomer?.name || '未分配'}
                        <span className="ml-auto font-semibold text-mint-600">
                          ¥{apt.totalPrice}
                        </span>
                      </div>

                      {apt.notes && (
                        <div className="text-xs text-warm-text/50 mb-4 bg-cream-coffee-50 rounded-lg p-2">
                          {apt.notes}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-cream-coffee-100">
                        {apt.status === 'pending' && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(apt.id, 'in_progress')
                            }
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-mint-100 hover:bg-mint-200 text-mint-700 font-medium rounded-lg transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            开始服务
                          </button>
                        )}
                        {apt.status === 'in_progress' && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(apt.id, 'completed')
                            }
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-mint-400 hover:bg-mint-500 text-white font-medium rounded-lg transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            完成服务
                          </button>
                        )}
                        {(apt.status === 'pending' ||
                          apt.status === 'in_progress') && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(apt.id, 'cancelled')
                            }
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            取消
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(apt.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-500 font-medium rounded-lg transition-colors ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="flex-1 min-h-0 overflow-auto bg-white rounded-2xl shadow-sm">
              <div className="min-w-max">
                <div className="flex sticky top-0 bg-white z-10 border-b border-cream-coffee-100">
                  <div className="w-40 flex-shrink-0 p-3 border-r border-cream-coffee-100 bg-cream-coffee-50">
                    <div className="text-sm font-bold text-warm-text">美容师</div>
                  </div>
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: scheduleWidth }}
                  >
                    <div className="flex">
                      {timeHeaders.map((th) => (
                        <div
                          key={th.minutes}
                          className="flex-shrink-0 p-2 text-xs text-warm-text/60 text-center border-r border-cream-coffee-100"
                          style={{ width: SLOT_MINUTES * PX_PER_MINUTE }}
                        >
                          {th.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {groomers.length === 0 ? (
                  <div className="p-8 text-center text-warm-text/60">
                    暂无美容师数据
                  </div>
                ) : (
                  groomers.map((g) => {
                    const groomerApts = appointmentsByGroomer.get(g.id) || [];
                    return (
                      <div key={g.id} className="flex border-b border-cream-coffee-100 last:border-b-0">
                        <div className="w-40 flex-shrink-0 p-3 border-r border-cream-coffee-100 bg-cream-coffee-50/50 relative">
                          <div className="font-semibold text-warm-text text-sm">
                            {g.name}
                          </div>
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-mint-100 text-mint-700 text-xs font-medium rounded-full">
                            {groomerApts.length}
                          </div>
                        </div>
                        <div
                          className="relative flex-shrink-0"
                          style={{ width: scheduleWidth, height: 64 }}
                        >
                          {timeHeaders.slice(0, -1).map((th) => (
                            <div
                              key={th.minutes}
                              className="absolute top-0 h-full border-r border-cream-coffee-100 cursor-pointer hover:bg-mint-50/50 transition-colors"
                              style={{
                                left: (th.minutes - DAY_START_MIN) * PX_PER_MINUTE,
                                width: SLOT_MINUTES * PX_PER_MINUTE,
                              }}
                              onClick={() => handleSlotClick(th.minutes)}
                            />
                          ))}

                          {groomerApts.map((apt) => {
                            const style = getAppointmentStyle(apt);
                            const sStyle = scheduleStatusStyle[apt.status];
                            const cancelledStrike =
                              apt.status === 'cancelled'
                                ? 'linear-gradient(45deg, transparent 45%, #f87171 45%, #f87171 55%, transparent 55%)'
                                : undefined;
                            return (
                              <div
                                key={apt.id}
                                className={`absolute top-2 bottom-2 rounded-lg overflow-hidden cursor-pointer ${sStyle.bg} ${sStyle.border || ''} transition-transform hover:scale-[1.02] hover:shadow-md`}
                                style={{
                                  left: style.left,
                                  width: style.width,
                                  backgroundImage: cancelledStrike,
                                  backgroundSize: apt.status === 'cancelled' ? '8px 8px' : undefined,
                                }}
                                title={`${getServiceNames(apt.serviceIds)} · ¥${getTotalPrice(apt.serviceIds)}${apt.notes ? `\n备注：${apt.notes}` : ''}`}
                              >
                                <div className="h-full px-2 py-1 flex flex-col justify-center text-white">
                                  <div className="text-xs font-bold truncate">
                                    {apt.startTime}-{apt.endTime} {apt.petName}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
