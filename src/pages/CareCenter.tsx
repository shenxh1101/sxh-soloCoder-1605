import { useEffect, useState, useMemo } from 'react';
import {
  Sun,
  Moon,
  Footprints,
  FileText,
  Check,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  getBoarding,
  getCareRecords,
  createCareRecord,
  deleteCareRecord,
} from '../utils/api';
import type { BoardingOrder, CareRecord } from '../../shared/types';
import { cn } from '../lib/utils';

type CareType = 'feeding_morning' | 'feeding_evening' | 'walk' | 'status_note';

interface CareTypeConfig {
  icon: typeof Sun;
  emoji: string;
  label: string;
  bgHover: string;
  textColor: string;
  activeBg: string;
}

const CARE_TYPE_CONFIG: Record<CareType, CareTypeConfig> = {
  feeding_morning: {
    icon: Sun,
    emoji: '☀️',
    label: '早喂',
    bgHover: 'bg-amber-50 hover:bg-amber-100',
    textColor: 'text-amber-700',
    activeBg: 'bg-mint-500',
  },
  feeding_evening: {
    icon: Moon,
    emoji: '🌙',
    label: '晚喂',
    bgHover: 'bg-indigo-50 hover:bg-indigo-100',
    textColor: 'text-indigo-700',
    activeBg: 'bg-mint-500',
  },
  walk: {
    icon: Footprints,
    emoji: '🚶',
    label: '遛弯',
    bgHover: 'bg-emerald-50 hover:bg-emerald-100',
    textColor: 'text-emerald-700',
    activeBg: 'bg-mint-500',
  },
  status_note: {
    icon: FileText,
    emoji: '📝',
    label: '状态',
    bgHover: 'bg-rose-50 hover:bg-rose-100',
    textColor: 'text-rose-700',
    activeBg: 'bg-mint-500',
  },
};

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

function getTodayStr() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTodayDisplay() {
  const date = new Date();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${m}月${d}日 ${w}`;
}

function formatDateDisplay(dateStr: string) {
  const date = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${m}月${d}日 ${w}`;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

function getDateRangeFromTo(): { from: string; to: string } {
  const days = getLast7Days();
  return { from: days[days.length - 1], to: days[0] };
}

function getTypeLabel(type: CareType) {
  return CARE_TYPE_CONFIG[type].label;
}

function getTypeEmoji(type: CareType) {
  return CARE_TYPE_CONFIG[type].emoji;
}

interface CareButtonProps {
  type: CareType;
  boardingId: string;
  todayRecords: CareRecord[];
  onCheckIn: (type: CareType, note?: string) => void;
  submitting: boolean;
}

function CareButton({ type, boardingId, todayRecords, onCheckIn, submitting }: CareButtonProps) {
  const config = CARE_TYPE_CONFIG[type];
  const Icon = config.icon;
  const record = todayRecords.find((r) => r.type === type);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [animating, setAnimating] = useState(false);

  const isActive = !!record;

  const handleClick = () => {
    if (submitting || isActive) return;
    if (type === 'status_note') {
      setShowNoteInput(true);
    } else {
      setAnimating(true);
      onCheckIn(type);
      setTimeout(() => setAnimating(false), 500);
    }
  };

  const handleNoteSubmit = () => {
    if (submitting || !noteText.trim()) return;
    setAnimating(true);
    onCheckIn(type, noteText.trim());
    setNoteText('');
    setShowNoteInput(false);
    setTimeout(() => setAnimating(false), 500);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={submitting || isActive}
        className={cn(
          'relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300',
          'shadow-sm hover:shadow-md',
          isActive
            ? cn(config.activeBg, 'text-white scale-[0.98]')
            : cn(config.bgHover, config.textColor, 'hover:-translate-y-0.5', 'disabled:opacity-50'),
          animating && 'animate-pulse'
        )}
      >
        {submitting && !isActive ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : isActive ? (
          <>
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <Check className="w-4 h-4 text-mint-500" strokeWidth={3} />
            </div>
            <Icon className="w-8 h-8" strokeWidth={2.5} />
            <span className="text-sm font-bold">{config.label}</span>
            {record && (
              <span className="text-xs font-medium opacity-90">{record.time}</span>
            )}
          </>
        ) : (
          <>
            <Icon className="w-8 h-8" strokeWidth={2.5} />
            <span className="text-sm font-bold">{config.label}</span>
          </>
        )}
      </button>

      {showNoteInput && (
        <div className="mt-2 p-3 bg-white rounded-xl border border-warm-text/10 shadow-sm">
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="写点状态备注，如：精神很好、有点拉肚子..."
            className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-warm-text/10 focus:border-mint-400 focus:ring-2 focus:ring-mint-100 outline-none resize-none text-warm-text"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setShowNoteInput(false);
                setNoteText('');
              }}
              className="px-4 py-1.5 rounded-lg text-sm text-warm-text/60 hover:text-warm-text font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleNoteSubmit}
              disabled={!noteText.trim() || submitting}
              className="px-4 py-1.5 rounded-lg text-sm bg-mint-500 hover:bg-mint-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              确认打卡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PetCareCardProps {
  pet: BoardingOrder;
  recordsMap: Record<string, CareRecord[]>;
  onCheckIn: (boardingId: string, type: CareType, note?: string) => void;
  submittingKey: string | null;
  size?: 'normal' | 'large';
}

function PetCareCard({ pet, recordsMap, onCheckIn, submittingKey, size = 'normal' }: PetCareCardProps) {
  const todayRecords = recordsMap[pet.id] || [];
  const types: CareType[] = ['feeding_morning', 'feeding_evening', 'walk', 'status_note'];

  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-sm overflow-hidden',
        size === 'large' ? 'p-6' : 'p-4'
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            'rounded-full bg-warm-bg flex items-center justify-center flex-shrink-0',
            size === 'large' ? 'w-16 h-16 text-4xl' : 'w-12 h-12 text-3xl'
          )}
        >
          {getPetEmoji(pet.petType)}
        </div>
        <div className="min-w-0">
          <div className={cn('font-bold text-warm-text truncate', size === 'large' ? 'text-xl' : 'text-base')}>
            {pet.petName}
          </div>
          <div className={cn('text-warm-text/60 truncate', size === 'large' ? 'text-base' : 'text-sm')}>
            {pet.petBreed}
          </div>
        </div>
      </div>

      <div className={cn('grid grid-cols-2 gap-3', size === 'large' ? 'gap-4' : 'gap-3')}>
        {types.map((type) => (
          <CareButton
            key={type}
            type={type}
            boardingId={pet.id}
            todayRecords={todayRecords}
            onCheckIn={(t, note) => onCheckIn(pet.id, t, note)}
            submitting={submittingKey === `${pet.id}-${type}`}
          />
        ))}
      </div>
    </div>
  );
}

type TabMode = 'today' | '7days';

export default function CareCenter() {
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pets, setPets] = useState<BoardingOrder[]>([]);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<CareRecord[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('all');
  const [historyPetId, setHistoryPetId] = useState<string>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const [tabMode, setTabMode] = useState<TabMode>('today');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = getTodayStr();
  const last7Days = useMemo(() => getLast7Days(), []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [petsRes, recordsRes] = await Promise.all([
          getBoarding('active'),
          getCareRecords({ date: today }),
        ]);
        setPets(petsRes);
        setRecords(recordsRes);
      } catch (err) {
        console.error('CareCenter fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [today]);

  useEffect(() => {
    if (tabMode !== '7days') return;
    async function fetchHistoryData() {
      setHistoryLoading(true);
      try {
        const { from, to } = getDateRangeFromTo();
        const res = await getCareRecords({ from, to });
        setHistoryRecords(res);
        setExpandedDates(new Set([today]));
      } catch (err) {
        console.error('CareCenter history fetch error:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistoryData();
  }, [tabMode, today]);

  const recordsByPet = useMemo(() => {
    const map: Record<string, CareRecord[]> = {};
    records.forEach((r) => {
      if (!map[r.boardingId]) map[r.boardingId] = [];
      map[r.boardingId].push(r);
    });
    return map;
  }, [records]);

  const petMap = useMemo(() => {
    const map: Record<string, BoardingOrder> = {};
    pets.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [pets]);

  const filteredRecords = useMemo(() => {
    let result = records;
    if (selectedPetId !== 'all') {
      result = result.filter((r) => r.boardingId === selectedPetId);
    }
    return result.slice().sort((a, b) => b.time.localeCompare(a.time));
  }, [records, selectedPetId]);

  const displayPets = useMemo(() => {
    if (selectedPetId === 'all') return pets;
    const pet = pets.find((p) => p.id === selectedPetId);
    return pet ? [pet] : [];
  }, [pets, selectedPetId]);

  const filteredHistoryRecords = useMemo(() => {
    let result = historyRecords;
    if (historyPetId !== 'all') {
      result = result.filter((r) => r.boardingId === historyPetId);
    }
    return result;
  }, [historyRecords, historyPetId]);

  const recordsByDate = useMemo(() => {
    const map: Record<string, CareRecord[]> = {};
    last7Days.forEach((d) => {
      map[d] = [];
    });
    filteredHistoryRecords.forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => b.time.localeCompare(a.time));
    });
    return map;
  }, [filteredHistoryRecords, last7Days]);

  function toggleDateExpand(date: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  function getDaySummary(date: string): string {
    const dayRecords = recordsByDate[date] || [];
    const types: CareType[] = ['feeding_morning', 'feeding_evening', 'walk', 'status_note'];
    const parts: string[] = [];
    types.forEach((t) => {
      const count = dayRecords.filter((r) => r.type === t).length;
      if (count > 0) {
        if (t === 'walk') {
          parts.push(`${getTypeLabel(t)}${count}次`);
        } else {
          parts.push(`${getTypeLabel(t)}✅`);
        }
      }
    });
    return parts.length > 0 ? parts.join(' ') : '无打卡记录';
  }

  function getPetDayStatus(petId: string, date: string): Record<CareType, boolean> {
    const dayRecords = (recordsByDate[date] || []).filter((r) => r.boardingId === petId);
    return {
      feeding_morning: dayRecords.some((r) => r.type === 'feeding_morning'),
      feeding_evening: dayRecords.some((r) => r.type === 'feeding_evening'),
      walk: dayRecords.some((r) => r.type === 'walk'),
      status_note: dayRecords.some((r) => r.type === 'status_note'),
    };
  }

  async function handleCheckIn(boardingId: string, type: CareType, note?: string) {
    const key = `${boardingId}-${type}`;
    if (submittingKey === key) return;
    setSubmittingKey(key);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newRecord = await createCareRecord({
        boardingId,
        date: today,
        type,
        time: timeStr,
        note,
      });
      setRecords((prev) => [...prev, newRecord]);
      setHistoryRecords((prev) => [...prev, newRecord]);
    } catch (err) {
      console.error('Create care record error:', err);
    } finally {
      setSubmittingKey(null);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId === id) return;
    setDeletingId(id);
    try {
      await deleteCareRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setHistoryRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Delete care record error:', err);
    } finally {
      setDeletingId(null);
    }
  }

  const selectedPetName = selectedPetId === 'all' ? '全部宠物' : (() => {
    const pet = pets.find((p) => p.id === selectedPetId);
    return pet ? `${pet.petName} · ${pet.petBreed}` : '全部宠物';
  })();

  const historyPetName = historyPetId === 'all' ? '全部宠物' : (() => {
    const pet = pets.find((p) => p.id === historyPetId);
    return pet ? `${pet.petName} · ${pet.petBreed}` : '全部宠物';
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-warm-text font-quicksand flex items-center gap-2">
            🌞 日常照护中心
          </h1>
          <p className="text-warm-text/60 mt-1">{formatTodayDisplay()}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-warm-text/5 hover:border-cream-coffee-200 transition-colors min-w-[180px]"
          >
            <span className="text-warm-text font-medium text-sm flex-1 text-left truncate">
              {selectedPetName}
            </span>
            <ChevronDown
              className={cn('w-4 h-4 text-warm-text/50 transition-transform', dropdownOpen && 'rotate-180')}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-full min-w-[200px] bg-white rounded-xl shadow-lg border border-warm-text/5 py-2 z-10 max-h-80 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedPetId('all');
                  setDropdownOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm hover:bg-warm-bg transition-colors',
                  selectedPetId === 'all' ? 'text-mint-600 font-medium bg-mint-50' : 'text-warm-text'
                )}
              >
                🐾 全部宠物
              </button>
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => {
                    setSelectedPetId(pet.id);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 text-left text-sm hover:bg-warm-bg transition-colors flex items-center gap-2',
                    selectedPetId === pet.id ? 'text-mint-600 font-medium bg-mint-50' : 'text-warm-text'
                  )}
                >
                  <span>{getPetEmoji(pet.petType)}</span>
                  <span className="truncate">{pet.petName} · {pet.petBreed}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6">
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-lg font-bold text-warm-text font-quicksand flex items-center gap-2">
            ⚡ 一键打卡
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 bg-white shadow-sm animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-warm-text/10" />
                    <div className="space-y-2">
                      <div className="h-5 w-24 bg-warm-text/10 rounded" />
                      <div className="h-4 w-20 bg-warm-text/10 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="aspect-square rounded-2xl bg-warm-text/10" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : pets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="text-5xl mb-3">🐾</div>
              <p className="text-warm-text/50">暂无在店寄养宠物</p>
            </div>
          ) : selectedPetId !== 'all' && displayPets.length === 1 ? (
            <PetCareCard
              pet={displayPets[0]}
              recordsMap={recordsByPet}
              onCheckIn={handleCheckIn}
              submittingKey={submittingKey}
              size="large"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayPets.map((pet, idx) => (
                <div
                  key={pet.id}
                  className="opacity-0 animate-fadeInUp"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <PetCareCard
                    pet={pet}
                    recordsMap={recordsByPet}
                    onCheckIn={handleCheckIn}
                    submittingKey={submittingKey}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-warm-text font-quicksand flex items-center gap-2">
              {tabMode === 'today' ? '📋 今日照护日志' : '📋 近7天打卡记录'}
            </h2>
            <div className="flex items-center gap-1 bg-warm-bg rounded-xl p-1">
              <button
                onClick={() => setTabMode('today')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  tabMode === 'today'
                    ? 'bg-white text-warm-text shadow-sm'
                    : 'text-warm-text/60 hover:text-warm-text'
                )}
              >
                今日
              </button>
              <button
                onClick={() => setTabMode('7days')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  tabMode === '7days'
                    ? 'bg-white text-warm-text shadow-sm'
                    : 'text-warm-text/60 hover:text-warm-text'
                )}
              >
                近7天
              </button>
            </div>
          </div>

          {tabMode === 'today' ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="relative pl-10 pb-6 animate-pulse">
                      <div className="absolute left-2.5 top-1 w-5 h-5 rounded-full bg-warm-text/10" />
                      <div className="absolute left-4 top-6 bottom-0 w-0.5 bg-warm-text/10" />
                      <div className="space-y-2">
                        <div className="h-5 w-32 bg-warm-text/10 rounded" />
                        <div className="h-4 w-40 bg-warm-text/10 rounded" />
                        <div className="h-4 w-24 bg-warm-text/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-5xl mb-3">🐾</div>
                  <p className="text-warm-text/50">今天还没有照护记录，快去打卡吧~</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredRecords.map((record, idx, arr) => {
                    const pet = petMap[record.boardingId];
                    const isLast = idx === arr.length - 1;
                    return (
                      <div
                        key={record.id}
                        className="relative pl-10 pb-5 opacity-0 animate-fadeInUp"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {!isLast && (
                          <div
                            className="absolute left-4 top-6 bottom-0 w-0.5"
                            style={{ backgroundColor: '#F3E7D9' }}
                          />
                        )}
                        <div
                          className="absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-base"
                          style={{ backgroundColor: '#FFF8F0' }}
                        >
                          {getTypeEmoji(record.type)}
                        </div>

                        <div className="pt-0.5 pr-8">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="font-semibold text-warm-text flex items-center gap-2 text-sm">
                              <span className="text-warm-text/80">{record.time}</span>
                              <span className="text-warm-text/40">·</span>
                              <span className="flex items-center gap-1">
                                {pet && <span>{getPetEmoji(pet.petType)}</span>}
                                {pet?.petName || '未知宠物'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDelete(record.id)}
                              disabled={deletingId === record.id}
                              className="p-1.5 rounded-lg text-warm-text/40 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="删除记录"
                            >
                              {deletingId === record.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <div className="mt-1 text-sm">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-mint-50 text-mint-700 text-xs font-medium">
                              {getTypeLabel(record.type)}
                            </span>
                          </div>

                          {record.note && (
                            <div className="mt-2 px-3 py-2 rounded-lg bg-warm-bg text-sm text-warm-text/80">
                              {record.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <button
                  onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-warm-text/5 hover:border-cream-coffee-200 transition-colors"
                >
                  <span className="text-warm-text font-medium text-sm flex-1 text-left truncate">
                    {historyPetName}
                  </span>
                  <ChevronDown
                    className={cn('w-4 h-4 text-warm-text/50 transition-transform', historyDropdownOpen && 'rotate-180')}
                  />
                </button>

                {historyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-warm-text/5 py-2 z-10 max-h-80 overflow-y-auto">
                    <button
                      onClick={() => {
                        setHistoryPetId('all');
                        setHistoryDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2.5 text-left text-sm hover:bg-warm-bg transition-colors',
                        historyPetId === 'all' ? 'text-mint-600 font-medium bg-mint-50' : 'text-warm-text'
                      )}
                    >
                      🐾 全部宠物
                    </button>
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => {
                          setHistoryPetId(pet.id);
                          setHistoryDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-sm hover:bg-warm-bg transition-colors flex items-center gap-2',
                          historyPetId === pet.id ? 'text-mint-600 font-medium bg-mint-50' : 'text-warm-text'
                        )}
                      >
                        <span>{getPetEmoji(pet.petType)}</span>
                        <span className="truncate">{pet.petName} · {pet.petBreed}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {historyLoading ? (
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-10 bg-warm-text/10 rounded-xl mb-2" />
                      <div className="pl-4 space-y-2">
                        <div className="h-4 w-32 bg-warm-text/10 rounded" />
                        <div className="h-4 w-40 bg-warm-text/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredHistoryRecords.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <div className="text-5xl mb-3">📅</div>
                  <p className="text-warm-text/50">近7天暂无打卡记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {last7Days.map((date) => {
                    const dayRecords = recordsByDate[date] || [];
                    const isExpanded = expandedDates.has(date);
                    const displayPetsForDay = historyPetId === 'all' ? pets : pets.filter((p) => p.id === historyPetId);
                    return (
                      <div key={date} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <button
                          onClick={() => toggleDateExpand(date)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-warm-bg/50 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-warm-text/50 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-warm-text/50 flex-shrink-0" />
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-warm-text text-sm">
                              {formatDateDisplay(date)}
                              {date === today && (
                                <span className="ml-2 px-2 py-0.5 rounded-md bg-mint-100 text-mint-700 text-xs font-medium">
                                  今天
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-warm-text/60 mt-0.5">
                              {getDaySummary(date)}
                            </div>
                          </div>
                          {dayRecords.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-warm-bg text-warm-text/60 text-xs font-medium">
                              {dayRecords.length}条
                            </span>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-warm-text/5">
                            {displayPetsForDay.length > 0 && historyPetId === 'all' && (
                              <div className="pt-3 space-y-2">
                                {displayPetsForDay.map((pet) => {
                                  const status = getPetDayStatus(pet.id, date);
                                  return (
                                    <div key={pet.id} className="flex items-center gap-2 text-xs">
                                      <span className="flex-shrink-0">{getPetEmoji(pet.petType)}</span>
                                      <span className="text-warm-text font-medium flex-shrink-0 w-16 truncate">{pet.petName}</span>
                                      <div className="flex gap-1.5 flex-wrap">
                                        {(['feeding_morning', 'feeding_evening', 'walk', 'status_note'] as CareType[]).map((t) => (
                                          <span
                                            key={t}
                                            className={cn(
                                              'px-1.5 py-0.5 rounded text-xs',
                                              status[t]
                                                ? 'bg-mint-100 text-mint-700'
                                                : 'bg-warm-text/5 text-warm-text/40 line-through'
                                            )}
                                          >
                                            {getTypeLabel(t)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {dayRecords.length === 0 ? (
                              <div className="py-6 text-center text-warm-text/50 text-sm">
                                当日暂无打卡记录
                              </div>
                            ) : (
                              <div className="space-y-1 pt-2">
                                {dayRecords.map((record, idx, arr) => {
                                  const pet = petMap[record.boardingId];
                                  const isLast = idx === arr.length - 1;
                                  return (
                                    <div
                                      key={record.id}
                                      className="relative pl-10 pb-5"
                                    >
                                      {!isLast && (
                                        <div
                                          className="absolute left-4 top-6 bottom-0 w-0.5"
                                          style={{ backgroundColor: '#F3E7D9' }}
                                        />
                                      )}
                                      <div
                                        className="absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-base"
                                        style={{ backgroundColor: '#FFF8F0' }}
                                      >
                                        {getTypeEmoji(record.type)}
                                      </div>

                                      <div className="pt-0.5 pr-8">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <div className="font-semibold text-warm-text flex items-center gap-2 text-sm">
                                            <span className="text-warm-text/80">{record.time}</span>
                                            <span className="text-warm-text/40">·</span>
                                            <span className="flex items-center gap-1">
                                              {pet && <span>{getPetEmoji(pet.petType)}</span>}
                                              {pet?.petName || '未知宠物'}
                                            </span>
                                          </div>
                                          {date === today && (
                                            <button
                                              onClick={() => handleDelete(record.id)}
                                              disabled={deletingId === record.id}
                                              className="p-1.5 rounded-lg text-warm-text/40 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                              title="删除记录"
                                            >
                                              {deletingId === record.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                              ) : (
                                                <Trash2 className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                        </div>

                                        <div className="mt-1 text-sm">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-mint-50 text-mint-700 text-xs font-medium">
                                            {getTypeLabel(record.type)}
                                          </span>
                                        </div>

                                        {record.note && (
                                          <div className="mt-2 px-3 py-2 rounded-lg bg-warm-bg text-sm text-warm-text/80">
                                            {record.note}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
