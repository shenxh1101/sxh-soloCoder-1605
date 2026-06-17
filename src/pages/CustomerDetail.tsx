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
} from 'lucide-react';
import { getCustomerByPhone, updateCustomer } from '@/utils/api';
import type { CustomerDetail as CustomerDetailType, BoardingOrder, GroomingAppointment } from '../../shared/types';
import { cn } from '@/lib/utils';

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

export default function CustomerDetail() {
  const { phone } = useParams<{ phone: string }>();
  const [customer, setCustomer] = useState<CustomerDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!phone) return;
    loadData();
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
      }
    } catch (e) {
      console.error('Failed to load customer detail', e);
    } finally {
      setLoading(false);
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-all text-warm-text/70 hover:text-warm-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-warm-text font-quicksand">
              {customer.ownerName}
            </h1>
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
        {saving && (
          <span className="text-sm text-warm-text/50">保存中...</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4">
              客户标签
            </h2>
            <div className="flex flex-wrap gap-2 items-center">
              {tags.map((tag) => {
                const style = getTagStyle(tag);
                return (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 hover:opacity-70 transition-opacity"
                    >
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
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4">
              备注
            </h2>
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
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4">
              宠物列表
            </h2>
            {uniquePets.length === 0 ? (
              <div className="py-8 text-center text-warm-text/50">
                暂无宠物记录
              </div>
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
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl shadow-sm bg-white p-6" style={{ borderRadius: 16 }}>
            <h2 className="text-sm font-semibold text-warm-text/60 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Home className="w-4 h-4" />
              寄养历史
            </h2>
            {sortedBoardingHistory.length === 0 ? (
              <div className="py-8 text-center text-warm-text/50">
                暂无寄养记录
              </div>
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
                          <span className="font-medium text-warm-text text-sm">
                            {order.petName}
                          </span>
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
                        <div className="text-xs text-warm-text/50 mt-0.5">
                          共 {days} 天
                        </div>
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
              <div className="py-8 text-center text-warm-text/50">
                暂无美容记录
              </div>
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
                        <span className="font-medium text-warm-text text-sm">
                          {apt.petName}
                        </span>
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
                        <span className="text-xs text-warm-text/50">
                          {apt.serviceIds.length} 项服务
                        </span>
                        <span className="text-sm font-bold text-mint-600">
                          ¥{apt.totalPrice}
                        </span>
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
