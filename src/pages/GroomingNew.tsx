import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Scissors,
  Clock,
  CheckCircle,
  PawPrint,
  User,
  StickyNote,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import {
  getBoarding,
  getBoardingById,
  getGroomingServices,
  getGroomers,
  getAvailableGroomers,
  getTimeSlots,
  createAppointment,
} from '@/utils/api';
import type {
  BoardingOrder,
  GroomingService,
  Groomer,
  GroomingTimeSlotsResponse,
} from '../../shared/types';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export default function GroomingNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const boardingIdFromUrl = searchParams.get('boardingId');

  const [boardingOrders, setBoardingOrders] = useState<BoardingOrder[]>([]);
  const [services, setServices] = useState<GroomingService[]>([]);
  const [allGroomers, setAllGroomers] = useState<Groomer[]>([]);
  const [availableGroomers, setAvailableGroomers] = useState<Groomer[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [timeSlots, setTimeSlots] = useState<GroomingTimeSlotsResponse | null>(null);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [expandedGroomers, setExpandedGroomers] = useState<Set<string>>(new Set());

  const [selectedBoardingId, setSelectedBoardingId] = useState<string>(
    boardingIdFromUrl || '',
  );
  const [isWalkIn, setIsWalkIn] = useState(!boardingIdFromUrl);
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [appointmentDate, setAppointmentDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('10:00');
  const [groomerId, setGroomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [activeBoarding, svList, grList] = await Promise.all([
        getBoarding('active'),
        getGroomingServices(),
        getGroomers(),
      ]);
      setBoardingOrders(activeBoarding);
      setServices(svList);
      setAllGroomers(grList);

      if (boardingIdFromUrl) {
        try {
          const order = await getBoardingById(boardingIdFromUrl);
          if (order) {
            setPetName(order.petName);
            setPetBreed(order.petBreed);
            setIsWalkIn(false);
          }
        } catch {
          // ignore
        }
      }
    })();
  }, [boardingIdFromUrl]);

  const totalDuration = useMemo(
    () =>
      services
        .filter((s) => selectedServiceIds.includes(s.id))
        .reduce((sum, s) => sum + s.duration, 0),
    [selectedServiceIds, services],
  );

  const totalPrice = useMemo(
    () =>
      services
        .filter((s) => selectedServiceIds.includes(s.id))
        .reduce((sum, s) => sum + s.price, 0),
    [selectedServiceIds, services],
  );

  useEffect(() => {
    if (!appointmentDate || !startTime || totalDuration <= 0) {
      setAvailableGroomers([]);
      setTimeSlots(null);
      setGroomerId('');
      return;
    }
    let cancelled = false;
    setLoadingAvailable(true);
    setLoadingTimeSlots(true);
    (async () => {
      const [list, slots] = await Promise.all([
        getAvailableGroomers(appointmentDate, startTime, totalDuration),
        getTimeSlots(appointmentDate, totalDuration),
      ]);
      if (!cancelled) {
        setAvailableGroomers(list);
        setTimeSlots(slots);
        setLoadingAvailable(false);
        setLoadingTimeSlots(false);
        if (list.length > 0 && !list.find((g) => g.id === groomerId)) {
          setGroomerId(list[0].id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentDate, startTime, totalDuration]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleBoardingChange = (value: string) => {
    if (value === 'walkin') {
      setSelectedBoardingId('');
      setIsWalkIn(true);
      setPetName('');
      setPetBreed('');
    } else {
      setSelectedBoardingId(value);
      setIsWalkIn(false);
      const order = boardingOrders.find((b) => b.id === value);
      if (order) {
        setPetName(order.petName);
        setPetBreed(order.petBreed);
      }
    }
  };

  const availableGroomerIds = useMemo(
    () => new Set(availableGroomers.map((g) => g.id)),
    [availableGroomers],
  );

  const toggleGroomerExpand = (groomerId: string) => {
    setExpandedGroomers((prev) => {
      const next = new Set(prev);
      if (next.has(groomerId)) {
        next.delete(groomerId);
      } else {
        next.add(groomerId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServiceIds.length === 0) {
      alert('请至少选择一项美容服务');
      return;
    }
    if (availableGroomers.length === 0 && totalDuration > 0) {
      alert('该时段暂无空闲美容师，请调整预约时间');
      return;
    }
    if (!groomerId) {
      alert('请选择美容师');
      return;
    }
    if (isWalkIn && (!petName.trim() || !petBreed.trim())) {
      alert('请填写宠物名和品种');
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({
        boardingId: isWalkIn ? undefined : selectedBoardingId,
        petName: petName.trim(),
        petBreed: petBreed.trim(),
        serviceIds: selectedServiceIds,
        groomerId,
        appointmentDate,
        startTime,
        endTime: addMinutes(startTime, totalDuration),
        status: 'pending',
        totalPrice,
        notes: notes.trim() || undefined,
      });
      navigate('/grooming');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/grooming')}
            className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-warm-text" />
          </button>
          <div className="flex items-center gap-3">
            <Scissors className="w-7 h-7 text-mint-500" />
            <h1 className="text-2xl font-bold text-warm-text">新增美容预约</h1>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-auto pr-2"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-warm-text mb-4 flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-mint-500" />
              宠物信息
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-warm-text mb-1.5">
                  关联寄养订单
                </label>
                <select
                  value={isWalkIn ? 'walkin' : selectedBoardingId}
                  onChange={(e) => handleBoardingChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-cream-coffee-200 rounded-xl bg-white text-warm-text focus:outline-none focus:ring-2 focus:ring-mint-400 focus:border-transparent"
                >
                  <option value="walkin">散客（不关联寄养）</option>
                  {boardingOrders.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.petName} · {b.petBreed} · 主人：{b.ownerName}
                    </option>
                  ))}
                </select>
              </div>

              {isWalkIn && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-warm-text mb-1.5">
                      宠物名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="请输入宠物名"
                      className="w-full px-4 py-2.5 border border-cream-coffee-200 rounded-xl bg-white text-warm-text placeholder-warm-text/40 focus:outline-none focus:ring-2 focus:ring-mint-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-warm-text mb-1.5">
                      品种 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={petBreed}
                      onChange={(e) => setPetBreed(e.target.value)}
                      placeholder="请输入品种"
                      className="w-full px-4 py-2.5 border border-cream-coffee-200 rounded-xl bg-white text-warm-text placeholder-warm-text/40 focus:outline-none focus:ring-2 focus:ring-mint-400 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {!isWalkIn && petName && (
                <div className="col-span-2 p-3 bg-cream-coffee-50 rounded-xl">
                  <div className="text-sm text-warm-text/70">
                    已选宠物：
                    <span className="font-semibold text-warm-text ml-1">
                      {petName}
                    </span>
                    <span className="text-warm-text/50 ml-2">
                      ({petBreed})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-warm-text mb-4 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-mint-500" />
              美容服务项目
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {services.map((svc) => {
                const checked = selectedServiceIds.includes(svc.id);
                return (
                  <label
                    key={svc.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      checked
                        ? 'border-mint-400 bg-mint-50'
                        : 'border-cream-coffee-100 bg-cream-coffee-50/50 hover:border-cream-coffee-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(svc.id)}
                      className="mt-1 w-4 h-4 text-mint-500 rounded border-cream-coffee-300 focus:ring-mint-400"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-warm-text">
                          {svc.name}
                        </span>
                        <span className="text-mint-600 font-bold">
                          ¥{svc.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-warm-text/60 mt-1">
                        <Clock className="w-3 h-3" />
                        {svc.duration} 分钟
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            {selectedServiceIds.length > 0 && (
              <div className="mt-4 p-4 bg-cream-coffee-50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-warm-text/70">
                    <Clock className="w-4 h-4 text-mint-500" />
                    预计总时长：
                    <span className="font-bold text-warm-text">
                      {totalDuration} 分钟
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-warm-text/70">
                    <CheckCircle className="w-4 h-4 text-mint-500" />
                    已选
                    <span className="font-bold text-warm-text">
                      {selectedServiceIds.length}
                    </span>
                    项服务
                  </div>
                </div>
                <div className="text-warm-text/70">
                  总价格：
                  <span className="text-mint-600 font-bold text-xl ml-1">
                    ¥{totalPrice}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-warm-text mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-mint-500" />
              预约时间
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-text mb-1.5">
                  预约日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-cream-coffee-200 rounded-xl bg-white text-warm-text focus:outline-none focus:ring-2 focus:ring-mint-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-text mb-1.5">
                  开始时间 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-cream-coffee-200 rounded-xl bg-white text-warm-text focus:outline-none focus:ring-2 focus:ring-mint-400 focus:border-transparent"
                />
              </div>
              {totalDuration > 0 && (
                <div className="col-span-2 p-3 bg-mint-50 rounded-xl">
                  <div className="text-sm text-warm-text/70">
                    预计结束时间：
                    <span className="font-bold text-mint-700 ml-1">
                      {addMinutes(startTime, totalDuration)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-warm-text mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-mint-500" />
              美容师 <span className="text-red-500">*</span>
            </h3>
            {loadingAvailable || loadingTimeSlots ? (
              <div className="text-warm-text/60 py-2">查询空闲美容师中...</div>
            ) : totalDuration <= 0 ? (
              <div className="text-warm-text/60 py-2">
                请先选择服务项目和预约时间
              </div>
            ) : (
              <div className="space-y-4">
                {availableGroomers.length === 0 && timeSlots && (
                  <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <span className="font-bold text-orange-700">
                        ⚠️ 该时段暂无空闲美容师
                      </span>
                    </div>

                    {timeSlots.availableSlots.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-semibold text-warm-text mb-2">
                          推荐空档（点击选择）：
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {timeSlots.availableSlots.slice(0, 5).map((slot) => (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => setStartTime(slot.startTime)}
                              className="px-3 py-1.5 rounded-lg bg-mint-100 hover:bg-mint-200 text-mint-700 text-sm font-medium transition-colors"
                            >
                              {slot.startTime} ~ {slot.endTime}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-semibold text-warm-text mb-2">
                        美容师当日忙碌时段：
                      </div>
                      <div className="space-y-2">
                        {timeSlots.groomerSchedules.map((gs) => {
                          const expanded = expandedGroomers.has(gs.groomerId);
                          return (
                            <div
                              key={gs.groomerId}
                              className="rounded-lg border border-cream-coffee-200 overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => toggleGroomerExpand(gs.groomerId)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-cream-coffee-50 hover:bg-cream-coffee-100 transition-colors"
                              >
                                <span className="text-sm font-medium text-warm-text">
                                  {gs.groomerName}
                                  {gs.busySlots.length === 0 ? (
                                    <span className="ml-2 text-xs text-mint-600">（全天空闲）</span>
                                  ) : (
                                    <span className="ml-2 text-xs text-warm-text/60">
                                      （{gs.busySlots.length} 个预约）
                                    </span>
                                  )}
                                </span>
                                {expanded ? (
                                  <ChevronUp className="w-4 h-4 text-warm-text/60" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-warm-text/60" />
                                )}
                              </button>
                              {expanded && gs.busySlots.length > 0 && (
                                <div className="px-3 py-2 space-y-1 bg-white">
                                  {gs.busySlots.map((bs, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <span className="text-warm-text/70">
                                        {bs.startTime} - {bs.endTime}
                                      </span>
                                      <span className="text-warm-text font-medium">
                                        {bs.petName}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {availableGroomers.length > 0 &&
                  availableGroomers.length < (timeSlots?.allGroomerCount || 0) &&
                  timeSlots && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-700">
                      💡 该时段有 {availableGroomers.length} 位美容师空闲，共 {timeSlots.allGroomerCount} 位
                    </div>
                  )}

                <select
                  value={groomerId}
                  onChange={(e) => setGroomerId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-cream-coffee-200 rounded-xl bg-white text-warm-text focus:outline-none focus:ring-2 focus:ring-mint-400 focus:border-transparent"
                >
                  <option value="">请选择美容师</option>
                  {allGroomers.map((g) => {
                    const isAvailable = availableGroomerIds.has(g.id);
                    return (
                      <option key={g.id} value={g.id}>
                        {g.name}（{isAvailable ? '空闲' : '忙碌'}）
                      </option>
                    );
                  })}
                </select>
                {availableGroomers.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableGroomers.map((g) => (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-mint-100 text-mint-700 rounded-full font-medium"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {g.name} · 空闲
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-red-500">
                    当前时段暂无空闲美容师，请调整时间
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-warm-text mb-4 flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-mint-500" />
              备注
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="有特殊需求请填写..."
              rows={3}
              className="w-full px-4 py-2.5 border border-cream-coffee-200 rounded-xl bg-white text-warm-text placeholder-warm-text/40 focus:outline-none focus:ring-2 focus:ring-mint-400 focus:border-transparent resize-none"
            />
          </div>
        </div>
      </form>

      <div className="flex-shrink-0 pt-4 mt-4 border-t border-cream-coffee-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate('/grooming')}
          className="px-6 py-2.5 border border-cream-coffee-200 rounded-xl text-warm-text font-semibold hover:bg-cream-coffee-50 transition-colors"
        >
          返回
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2.5 bg-mint-400 hover:bg-mint-500 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          提交预约（¥{totalPrice}）
        </button>
      </div>
    </div>
  );
}
