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

const statusConfig: Record<
  GroomingAppointment['status'],
  { label: string; bg: string; text: string }
> = {
  pending: { label: '待服务', bg: 'bg-amber-100', text: 'text-amber-700' },
  in_progress: { label: '进行中', bg: 'bg-mint-100', text: 'text-mint-700' },
  completed: { label: '已完成', bg: 'bg-gray-100', text: 'text-gray-500' },
  cancelled: { label: '已取消', bg: 'bg-red-100', text: 'text-red-600' },
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

export default function GroomingList() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<GroomingAppointment[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [services, setServices] = useState<GroomingService[]>([]);
  const [loading, setLoading] = useState(false);

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
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-warm-text/60">加载中...</div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">✂️</div>
                <p className="text-warm-text/60">当天暂无预约</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
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
          )}
        </div>
      </div>
    </div>
  );
}
