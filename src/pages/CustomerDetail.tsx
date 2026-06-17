import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Wallet,
  Calendar,
  X,
  Plus,
  PawPrint,
  Scissors,
  Home,
  CheckCircle,
  TrendingUp,
  Star,
  BarChart3,
  MessageSquare,
  Loader2,
  StickyNote,
} from 'lucide-react';
import {
  getCustomerByPhone,
  updateCustomer,
  updateFollowUp,
  createFollowUp,
  getCustomerTrend,
} from '@/utils/api';
import type {
  CustomerDetail as CustomerDetailType,
  BoardingOrder,
  GroomingAppointment,
  FollowUpRecord,
  CustomerConsumptionTrend,
  CustomerPreference,
} from '../../shared/types';
import { cn } from '@/lib/utils';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const tagColorMap: Record<string, { bg: string; text: string }> = {
  '常客': { bg: 'bg-mint-100', text: 'text-mint-700' },
  '敏感体质': { bg: 'bg-orange-100', text: 'text-orange-600' },
  '爱咬人': { bg: 'bg-red-100', text: 'text-red-600' },
  '需要回访': { bg: 'bg-purple-100', text: 'text-purple-600' },
};

const presetTags = ['常客', '敏感体质', '爱咬人', '需要回访'];

const petEmojiMap: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  other: '🐾',
};

function getTagStyle(tag: string) {
  return tagColorMap[tag] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN');
}

function calcDays(checkInDate: string, checkOutDate?: string): number {
  const start = new Date(checkInDate);
  const end = checkOutDate ? new Date(checkOutDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

function deduplicatePets(pets: Array<{ petName: string; petBreed: string; petType: string }>) {
  const seen = new Set<string>();
  return pets.filter((p) => {
    const key = `${p.petName}|${p.petBreed}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatFollowUpStatus(status: FollowUpRecord['status']): { text: string; color: string } {
  switch (status) {
    case 'pending':
      return { text: '待处理', color: 'bg-orange-100 text-orange-600' };
    case 'done':
      return { text: '已处理', color: 'bg-mint-100 text-mint-700' };
    case 'cancelled':
      return { text: '已取消', color: 'bg-gray-100 text-gray-500' };
    default:
      return { text: status, color: 'bg-gray-100 text-gray-500' };
  }
}

function getFollowUpStatusBadge(status: FollowUpRecord['status']) {
  const info = formatFollowUpStatus(status);
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', info.color)}>
      {info.text}
    </span>
  );
}

export default function CustomerDetail() {
  const { phone } = useParams<{ phone: string }>();
  const [customer, setCustomer] = useState<CustomerDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const [trendData, setTrendData] = useState<CustomerConsumptionTrend[]>([]);
  const [preference, setPreference] = useState<CustomerPreference | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [updatingFollowUpId, setUpdatingFollowUpId] = useState<string | null>(null);
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  const [newFollowUpDate, setNewFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [newFollowUpReason, setNewFollowUpReason] = useState('');
  const [newFollowUpNote, setNewFollowUpNote] = useState('');

  useEffect(() => {
    if (!phone) return;
    loadData();
    loadTrendData();
  }, [phone]);

  async function loadData() {
    if (!phone) return;
    setLoading(true);
    try {
      const data = await getCustomerByPhone(decodeURIComponent(phone));
      if (data) {
        setCustomer(data);
        setTags(data.tags || []);
        setNotes(data.notes || '');
        setFollowUps(data.followUps || []);
      }
    } catch (e) {
      console.error('Failed to load customer detail', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrendData() {
    if (!phone) return;
    setLoadingTrend(true);
    try {
      const data = await getCustomerTrend(decodeURIComponent(phone));
      setTrendData(data.trend || []);
      setPreference(data.preference || null);
    } catch (e) {
      console.error('Failed to load customer trend', e);
    } finally {
      setLoadingTrend(false);
    }
  }

  async function saveTagsAndNotes(nextTags: string[], nextNotes: string) {
    if (!phone || !customer) return;
    setSaving(true);
    try {
      await updateCustomer(decodeURIComponent(phone), { tags: nextTags, notes: nextNotes });
      setCustomer({ ...customer, tags: nextTags, notes: nextNotes });
    } catch (e) {
      console.error('Failed to update customer', e);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    saveTagsAndNotes(nextTags, notes);
  }

  function handleAddPresetTag(tag: string) {
    if (tags.includes(tag)) {
      setShowTagDropdown(false);
      return;
    }
    const nextTags = [...tags, tag];
    setTags(nextTags);
    setShowTagDropdown(false);
    saveTagsAndNotes(nextTags, notes);
  }

  function handleAddCustomTag() {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setNewTag('');
      setShowTagDropdown(false);
      return;
    }
    const nextTags = [...tags, trimmed];
    setTags(nextTags);
    setNewTag('');
    setShowTagDropdown(false);
    saveTagsAndNotes(nextTags, notes);
  }

  function handleNotesBlur() {
    if (!customer || notes === customer.notes) return;
    saveTagsAndNotes(tags, notes);
  }

  async function handleMarkFollowUpDone(id: string) {
    if (updatingFollowUpId === id) return;
    setUpdatingFollowUpId(id);
    try {
      await updateFollowUp(id, { status: 'done' });
      setFollowUps((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'done' as const, handledAt: new Date().toISOString() } : f))
      );
    } catch (e) {
      console.error('Failed to update follow-up', e);
      alert('操作失败，请重试');
    } finally {
      setUpdatingFollowUpId(null);
    }
  }

  async function handleCreateFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !customer) return;
    if (!newFollowUpDate.trim() || !newFollowUpReason.trim()) {
      alert('请填写回访日期和原因');
      return;
    }
    setCreatingFollowUp(true);
    try {
      const created = await createFollowUp(decodeURIComponent(phone), {
        followDate: newFollowUpDate,
        reason: newFollowUpReason.trim(),
        note: newFollowUpNote.trim() || undefined,
      });
      setFollowUps((prev) => [created, ...prev]);
      setNewFollowUpReason('');
      setNewFollowUpNote('');
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setNewFollowUpDate(d.toISOString().split('T')[0]);
    } catch (e) {
      console.error('Failed to create follow-up', e);
      alert('创建失败，请重试');
    } finally {
      setCreatingFollowUp(false);
    }
  }

  const uniquePets = useMemo(() => {
    if (!customer?.pets) return [];
    return deduplicatePets(customer.pets);
  }, [customer]);

  const sortedBoardingHistory = useMemo(() => {
    if (!customer?.boardingHistory) return [];
    return [...customer.boardingHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [customer]);

  const sortedGroomingHistory = useMemo(() => {
    if (!customer?.groomingHistory) return [];
    return [...customer.groomingHistory].sort((a, b) =>
      (b.appointmentDate + b.startTime).localeCompare(a.appointmentDate + a.startTime)
    );
  }, [customer]);

  const sortedFollowUps = useMemo(() => {
    return [...followUps].sort((a, b) => b.followDate.localeCompare(a.followDate));
  }, [followUps]);

  const chartData = useMemo(() => {
    return trendData.slice(-6).map((d) => ({
      month: d.month,
      消费金额: d.totalAmount,
      寄养次数: d.boardingCount,
      美容次数: d.groomingCount,
    }));
  }, [trendData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-warm-text/60">加载中...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-3">👥</div>
          <p className="text-warm-text/60 mb-4">未找到客户档案</p>
          <Link
            to="/customers"
            className="inline-block px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#8FCFAD' }}
          >
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-all text-warm-text/70 hover:text-warm-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-warm-text font-quicksand">{customer.ownerName}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-warm-text/60">
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {customer.ownerPhone}
              </span>
              <span className="flex items-center gap-1">
                <Wallet className="w-4 h-4" />
                累计消费 ¥{formatCurrency(customer.totalSpent)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                最近到店 {customer.lastVisit || '-'}
              </span>
            </div>
          </div>
        </div>
        {saving && <span className="text-sm text-warm-text/50">保存中...</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4">客户标签</h2>
            <div className="flex flex-wrap gap-2 items-center">
              {tags.map((tag) => {
                const style = getTagStyle(tag);
                return (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 hover:opacity-70 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <div className="relative">
                <button
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-cream-coffee-50 text-warm-text/60 hover:bg-cream-coffee-100 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  添加标签
                </button>
                {showTagDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-56 rounded-xl shadow-lg border border-cream-coffee-100 bg-white overflow-hidden z-10">
                    <div className="p-2">
                      <div className="text-xs text-warm-text/50 mb-2 px-2">预置标签</div>
                      {presetTags.map((tag) => {
                        const selected = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => handleAddPresetTag(tag)}
                            disabled={selected}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                              selected
                                ? 'text-warm-text/30 cursor-not-allowed'
                                : 'text-warm-text hover:bg-cream-coffee-50'
                            )}
                          >
                            {tag} {selected && '(已添加)'}
                          </button>
                        );
                      })}
                    </div>
                    <div className="p-2 border-t border-cream-coffee-50">
                      <div className="text-xs text-warm-text/50 mb-2 px-2">自定义标签</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomTag();
                            }
                          }}
                          placeholder="输入标签名"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-cream-coffee-100 bg-white text-sm text-warm-text placeholder-warm-text/40 outline-none focus:border-cream-coffee-300"
                        />
                        <button
                          onClick={handleAddCustomTag}
                          className="px-3 py-1.5 rounded-lg text-white text-sm"
                          style={{ backgroundColor: '#8FCFAD' }}
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4">备注</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="输入客户备注..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-cream-coffee-100 bg-white text-sm text-warm-text placeholder-warm-text/40 outline-none transition-all focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100 resize-none"
            />
          </div>

          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4">宠物列表</h2>
            {uniquePets.length === 0 ? (
              <div className="py-8 text-center text-warm-text/50">暂无宠物记录</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uniquePets.map((pet, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-4 rounded-xl"
                    style={{ backgroundColor: '#FAF7F2' }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: '#FFF8F0' }}
                    >
                      {petEmojiMap[pet.petType] || '🐾'}
                    </div>
                    <div>
                      <div className="font-semibold text-warm-text">{pet.petName}</div>
                      <div className="text-sm text-warm-text/60">{pet.petBreed}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              回访跟进
            </h2>

            {sortedFollowUps.length === 0 ? (
              <div className="py-6 text-center text-warm-text/50 mb-4">暂无回访记录</div>
            ) : (
              <div className="space-y-3 mb-6 max-h-[320px] overflow-y-auto pr-2">
                {sortedFollowUps.map((fu) => {
                  const isPending = fu.status === 'pending';
                  return (
                    <div
                      key={fu.id}
                      className={cn(
                        'rounded-xl p-4 border transition-all',
                        isPending
                          ? 'bg-orange-50/50 border-orange-100'
                          : fu.status === 'done'
                          ? 'bg-gray-50 border-gray-100 opacity-70'
                          : 'bg-gray-50 border-gray-100 opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-warm-text flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-cream-coffee-500" />
                            {fu.followDate}
                          </span>
                          {getFollowUpStatusBadge(fu.status)}
                        </div>
                        {isPending && (
                          <button
                            onClick={() => handleMarkFollowUpDone(fu.id)}
                            disabled={updatingFollowUpId === fu.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-mint-500 hover:bg-mint-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {updatingFollowUpId === fu.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            标记已处理
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-warm-text/80 mb-1">{fu.reason}</div>
                      {fu.note && (
                        <div className="text-xs text-warm-text/50 flex items-start gap-1 mt-2">
                          <StickyNote className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {fu.note}
                        </div>
                      )}
                      {fu.handledAt && (
                        <div className="text-xs text-warm-text/40 mt-2">处理时间：{fu.handledAt.split('T')[0]}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-cream-coffee-100 pt-5">
              <h3 className="text-sm font-semibold text-warm-text mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                新增回访
              </h3>
              <form onSubmit={handleCreateFollowUp} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-warm-text/60 mb-1.5">回访日期 *</label>
                    <input
                      type="date"
                      value={newFollowUpDate}
                      onChange={(e) => setNewFollowUpDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-cream-coffee-100 bg-white text-sm text-warm-text outline-none focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-warm-text/60 mb-1.5">回访原因 *</label>
                    <input
                      type="text"
                      value={newFollowUpReason}
                      onChange={(e) => setNewFollowUpReason(e.target.value)}
                      placeholder="例如：美容后回访、寄养后关怀"
                      className="w-full px-3 py-2 rounded-lg border border-cream-coffee-100 bg-white text-sm text-warm-text placeholder-warm-text/40 outline-none focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-warm-text/60 mb-1.5">备注</label>
                  <textarea
                    value={newFollowUpNote}
                    onChange={(e) => setNewFollowUpNote(e.target.value)}
                    placeholder="回访备注信息..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-cream-coffee-100 bg-white text-sm text-warm-text placeholder-warm-text/40 outline-none focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingFollowUp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cream-coffee-500 hover:bg-cream-coffee-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {creatingFollowUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  创建回访计划
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              消费趋势 &amp; 偏好
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl p-4" style={{ backgroundColor: '#E8F5EE' }}>
                <div className="flex items-center gap-2 text-xs text-warm-text/60 mb-1">
                  <Wallet className="w-3.5 h-3.5 text-mint-600" />
                  平均客单价
                </div>
                <div className="text-2xl font-bold text-mint-700 font-quicksand">
                  ¥{formatCurrency(preference?.averageSpend || 0)}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF1E6' }}>
                <div className="flex items-center gap-2 text-xs text-warm-text/60 mb-1">
                  <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
                  总到店次数
                </div>
                <div className="text-2xl font-bold text-orange-600 font-quicksand">
                  {preference?.totalVisits || 0}
                  <span className="text-sm font-normal text-warm-text/50 ml-1">次</span>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F3EBF8' }}>
                <div className="flex items-center gap-2 text-xs text-warm-text/60 mb-1">
                  <Star className="w-3.5 h-3.5 text-purple-500" />
                  TOP 偏好服务
                </div>
                <div className="text-sm font-bold text-purple-600 font-quicksand truncate">
                  {preference?.topServices && preference.topServices.length > 0
                    ? preference.topServices[0].serviceName
                    : '暂无数据'}
                </div>
              </div>
            </div>

            {preference?.topServices && preference.topServices.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-warm-text/60 mb-2">TOP3 偏好服务</div>
                <div className="space-y-2">
                  {preference.topServices.slice(0, 3).map((svc, idx) => (
                    <div key={svc.serviceName} className="flex items-center gap-3">
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          idx === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : idx === 1
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-orange-100 text-orange-600'
                        )}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-warm-text">{svc.serviceName}</span>
                          <span className="text-xs text-warm-text/50">{svc.count} 次</span>
                        </div>
                        <div className="h-2 rounded-full bg-cream-coffee-50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cream-coffee-400 to-cream-coffee-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (svc.count / (preference.topServices?.[0]?.count || 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-warm-text/60 mb-3">近 6 个月消费趋势</div>
              {loadingTrend ? (
                <div className="h-[280px] flex items-center justify-center text-warm-text/50">加载中...</div>
              ) : chartData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-warm-text/50">暂无消费数据</div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3E7D9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: '#8B7355', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: '#8B7355', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `¥${v}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: '#8B7355', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFF',
                          border: '1px solid #F3E7D9',
                          borderRadius: 12,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#8B7355' }} />
                      <Bar yAxisId="left" dataKey="消费金额" fill="#C89F7B" radius={[4, 4, 0, 0]} barSize={24} />
                      <Bar yAxisId="right" dataKey="寄养次数" fill="#8FCFAD" radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar yAxisId="right" dataKey="美容次数" fill="#E8A878" radius={[4, 4, 0, 0]} barSize={16} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Home className="w-4 h-4" />
              寄养历史
            </h2>
            {sortedBoardingHistory.length === 0 ? (
              <div className="py-8 text-center text-warm-text/50">暂无寄养记录</div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {sortedBoardingHistory.map((order: BoardingOrder) => {
                  const days = calcDays(order.checkInDate, order.checkOutDate);
                  return (
                    <div key={order.id} className="relative pl-6">
                      <div className="absolute left-[7px] top-2 w-3 h-3 rounded-full" style={{ backgroundColor: '#8FCFAD' }} />
                      {sortedBoardingHistory.indexOf(order) !== sortedBoardingHistory.length - 1 && (
                        <div className="absolute left-[12px] top-5 bottom-0 w-px bg-cream-coffee-100" />
                      )}
                      <Link
                        to={`/boarding/${order.id}`}
                        className="block rounded-xl p-3 hover:bg-cream-coffee-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-warm-text text-sm">{order.petName}</span>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              order.status === 'active'
                                ? 'bg-mint-100 text-mint-700'
                                : 'bg-gray-100 text-gray-500'
                            )}
                          >
                            {order.status === 'active' ? '在店' : '已完成'}
                          </span>
                        </div>
                        <div className="text-xs text-warm-text/60">
                          {order.checkInDate} → {order.checkOutDate || '待离店'}
                        </div>
                        <div className="text-xs text-warm-text/50 mt-0.5">共 {days} 天</div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              美容历史
            </h2>
            {sortedGroomingHistory.length === 0 ? (
              <div className="py-8 text-center text-warm-text/50">暂无美容记录</div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {sortedGroomingHistory.map((apt: GroomingAppointment) => (
                  <div key={apt.id} className="relative pl-6">
                    <div className="absolute left-[7px] top-2 w-3 h-3 rounded-full" style={{ backgroundColor: '#C89F7B' }} />
                    {sortedGroomingHistory.indexOf(apt) !== sortedGroomingHistory.length - 1 && (
                      <div className="absolute left-[12px] top-5 bottom-0 w-px bg-cream-coffee-100" />
                    )}
                    <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF7F2' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-warm-text text-sm">{apt.petName}</span>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
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
                      <div className="text-xs text-warm-text/60">
                        {apt.appointmentDate} {apt.startTime} - {apt.endTime}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-warm-text/50">{apt.serviceIds.length} 项服务</span>
                        <span className="text-sm font-bold text-mint-600">¥{apt.totalPrice}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
