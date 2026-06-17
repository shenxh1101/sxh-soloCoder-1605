import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import type { BoardingOrder } from '../../shared/types';
import { createBoarding, getCustomerByPhone } from '@/utils/api';
import { cn } from '@/lib/utils';

type PetType = BoardingOrder['petType'];

const petTypeOptions: { value: PetType; label: string; emoji: string }[] = [
  { value: 'dog', label: '狗', emoji: '🐶' },
  { value: 'cat', label: '猫', emoji: '🐱' },
  { value: 'other', label: '其他', emoji: '🐾' },
];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface FormState {
  petName: string;
  petType: PetType;
  petBreed: string;
  ownerName: string;
  ownerPhone: string;
  checkInDate: string;
  plannedDays: number;
  dailyPrice: number;
  feedingInstructions: string;
  specialNeeds: string;
}

interface FormErrors {
  petName?: string;
  petType?: string;
  petBreed?: string;
  ownerName?: string;
  ownerPhone?: string;
  checkInDate?: string;
  plannedDays?: string;
  dailyPrice?: string;
}

export default function BoardingNew() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [customerTags, setCustomerTags] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({
    petName: '',
    petType: 'dog',
    petBreed: '',
    ownerName: '',
    ownerPhone: '',
    checkInDate: todayStr(),
    plannedDays: 3,
    dailyPrice: 100,
    feedingInstructions: '',
    specialNeeds: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const phone = form.ownerPhone.trim();
    if (!phone) {
      setCustomerTags([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const customer = await getCustomerByPhone(phone);
        if (!cancelled && customer && customer.tags.length > 0) {
          setCustomerTags(customer.tags);
        } else if (!cancelled) {
          setCustomerTags([]);
        }
      } catch {
        if (!cancelled) setCustomerTags([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.ownerPhone]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof FormErrors];
        return next;
      });
    }
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.petName.trim()) e.petName = '请输入宠物名字';
    if (!form.petType) e.petType = '请选择宠物类型';
    if (!form.petBreed.trim()) e.petBreed = '请输入品种';
    if (!form.ownerName.trim()) e.ownerName = '请输入主人姓名';
    if (!form.ownerPhone.trim()) e.ownerPhone = '请输入主人电话';
    if (!form.checkInDate) e.checkInDate = '请选择入住日期';
    if (form.plannedDays <= 0) e.plannedDays = '预计天数必须大于0';
    if (form.dailyPrice <= 0) e.dailyPrice = '每日单价必须大于0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await createBoarding({
        petName: form.petName.trim(),
        petType: form.petType,
        petBreed: form.petBreed.trim(),
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim(),
        checkInDate: form.checkInDate,
        plannedDays: form.plannedDays,
        dailyPrice: form.dailyPrice,
        feedingInstructions: form.feedingInstructions.trim(),
        specialNeeds: form.specialNeeds.trim(),
        status: 'active',
      });
      navigate(`/boarding/${created.id}`);
    } catch (err) {
      console.error('Failed to create boarding order', err);
      alert('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (field?: string) =>
    cn(
      'w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-warm-text placeholder-warm-text/40 outline-none transition-all',
      field && errors[field as keyof FormErrors]
        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
        : 'border-cream-coffee-100 focus:border-cream-coffee-300 focus:ring-2 focus:ring-cream-coffee-100'
    );

  const labelClass = 'block text-sm font-medium text-warm-text mb-2';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/boarding"
          className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-all text-warm-text/70 hover:text-warm-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-warm-text">新增寄养登记</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl shadow-sm bg-white p-8"
        style={{ borderRadius: 16 }}
      >
        {customerTags.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-orange-700 mb-2">客户标签提醒</div>
                <div className="flex flex-wrap gap-1.5">
                  {customerTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <label className={labelClass}>
              宠物名字 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.petName}
              onChange={(e) => updateField('petName', e.target.value)}
              placeholder="例如：小白"
              className={inputClass('petName')}
            />
            {errors.petName && (
              <p className="text-xs text-red-400 mt-1">{errors.petName}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              宠物类型 <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-3">
              {petTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('petType', opt.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    form.petType === opt.value
                      ? 'border-mint-300 bg-mint-50 text-mint-700'
                      : 'border-cream-coffee-100 bg-white text-warm-text/70 hover:border-cream-coffee-200'
                  )}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>
              品种 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.petBreed}
              onChange={(e) => updateField('petBreed', e.target.value)}
              placeholder="例如：金毛、布偶"
              className={inputClass('petBreed')}
            />
            {errors.petBreed && (
              <p className="text-xs text-red-400 mt-1">{errors.petBreed}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              主人姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => updateField('ownerName', e.target.value)}
              placeholder="请输入主人姓名"
              className={inputClass('ownerName')}
            />
            {errors.ownerName && (
              <p className="text-xs text-red-400 mt-1">{errors.ownerName}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              主人电话 <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={form.ownerPhone}
              onChange={(e) => updateField('ownerPhone', e.target.value)}
              placeholder="请输入联系电话"
              className={inputClass('ownerPhone')}
            />
            {errors.ownerPhone && (
              <p className="text-xs text-red-400 mt-1">{errors.ownerPhone}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              入住日期 <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.checkInDate}
              onChange={(e) => updateField('checkInDate', e.target.value)}
              className={inputClass('checkInDate')}
            />
            {errors.checkInDate && (
              <p className="text-xs text-red-400 mt-1">{errors.checkInDate}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              预计寄养天数 <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.plannedDays}
              onChange={(e) => updateField('plannedDays', Number(e.target.value))}
              className={inputClass('plannedDays')}
            />
            {errors.plannedDays && (
              <p className="text-xs text-red-400 mt-1">{errors.plannedDays}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              每日单价（元） <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.dailyPrice}
              onChange={(e) => updateField('dailyPrice', Number(e.target.value))}
              className={inputClass('dailyPrice')}
            />
            {errors.dailyPrice && (
              <p className="text-xs text-red-400 mt-1">{errors.dailyPrice}</p>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className={labelClass}>喂食要求</label>
            <textarea
              rows={3}
              value={form.feedingInstructions}
              onChange={(e) => updateField('feedingInstructions', e.target.value)}
              placeholder="例如：每天两次，每次一把皇家狗粮"
              className={cn(inputClass(), 'resize-none')}
            />
          </div>

          <div className="lg:col-span-2">
            <label className={labelClass}>特殊需求</label>
            <textarea
              rows={3}
              value={form.specialNeeds}
              onChange={(e) => updateField('specialNeeds', e.target.value)}
              placeholder="例如：每天要遛两次，对鸡肉过敏"
              className={cn(inputClass(), 'resize-none')}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-cream-coffee-50">
          <Link
            to="/boarding"
            className="px-6 py-2.5 rounded-xl border border-cream-coffee-200 text-warm-text/70 font-medium hover:bg-cream-coffee-50 transition-all"
          >
            返回
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
            style={{ backgroundColor: '#8FCFAD' }}
          >
            <Send className="w-4 h-4" />
            {submitting ? '提交中...' : '提交'}
          </button>
        </div>
      </form>
    </div>
  );
}
