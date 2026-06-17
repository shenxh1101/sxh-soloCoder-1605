import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Printer, Loader2 } from 'lucide-react';
import { getReceipt } from '@/utils/api';
import type { ReceiptData } from '../../shared/types';

const petEmojiMap: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  other: '🐾',
};

const paymentMethodMeta: Record<ReceiptData['paymentMethod'], { label: string; emoji: string }> = {
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

function generateReceiptNo(paidAt: string, boardingId: string): string {
  const date = new Date(paidAt);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const suffix = boardingId.slice(-4).toUpperCase().padStart(4, '0');
  return `REC-${y}${m}${d}-${suffix}`;
}

function resolveGroomingDisplayItems(data: ReceiptData): Array<{ serviceName: string; price: number }> {
  const items = data.groomingItems;
  if (items.length === 0) return [];

  const hasParsedNotes = items.some((item) => item.parsedRemarksNotes);
  const isSingleFallback =
    items.length === 1 && items[0].serviceName === '美容服务（备注）';

  if (!isSingleFallback && !hasParsedNotes) {
    return items.map((item) => ({ serviceName: item.serviceName, price: item.price }));
  }

  const displayNames: string[] = [];
  for (const item of items) {
    if (item.parsedRemarksNotes) {
      displayNames.push(item.parsedRemarksNotes);
    } else if (item.serviceName !== '美容服务（备注）') {
      displayNames.push(item.serviceName);
    }
  }

  if (displayNames.length === 0) {
    return items.map((item) => ({ serviceName: item.serviceName, price: item.price }));
  }

  return [{ serviceName: displayNames.join(' + '), price: data.groomingFee }];
}

function buildReceiptText(data: ReceiptData): string {
  const receiptNo = generateReceiptNo(data.paidAt, data.boardingId);
  const pm = paymentMethodMeta[data.paymentMethod];
  const lines: string[] = [];
  lines.push('🐾 萌宠管家');
  lines.push('收款凭证');
  lines.push(`小票编号：${receiptNo}`);
  lines.push('----------------------------------------');
  lines.push(`宠物：${petEmojiMap[data.petType] || '🐾'} ${data.petName} · ${data.petBreed}`);
  lines.push(`主人：${data.ownerName} ${data.ownerPhone}`);
  lines.push(`入住：${data.checkInDate}  离店：${data.checkOutDate}`);
  lines.push(`寄养：${data.boardingDays}天 × ¥${data.dailyPrice}/天 = ¥${data.boardingFee}`);

  const displayItems = resolveGroomingDisplayItems(data);
  if (displayItems.length > 0) {
    lines.push('----------------------------------------');
    lines.push('美容项目：');
    for (const item of displayItems) {
      lines.push(`  ${item.serviceName}  ￥${item.price}`);
    }
    lines.push(`美容小计：￥${data.groomingFee}`);
  } else if (data.remarksFromPayment) {
    lines.push('----------------------------------------');
    lines.push('美容费用：');
    lines.push(`  ${data.remarksFromPayment}`);
  }

  lines.push('----------------------------------------');
  lines.push(`小计：￥${data.boardingFee + data.groomingFee}`);
  if (data.discount > 0) {
    lines.push(`优惠：-￥${data.discount}`);
  }
  lines.push(`合计：￥${data.totalAmount}`);
  lines.push(`支付方式：${pm.emoji}${pm.label}`);
  lines.push(`收款时间：${formatDateTime(data.paidAt)}`);
  if (data.remarks) {
    lines.push(`备注：${data.remarks}`);
  }
  lines.push('----------------------------------------');
  lines.push('感谢您的光临，期待下次再见 🐾');
  return lines.join('\n');
}

export default function Receipt() {
  const { boardingId } = useParams<{ boardingId: string }>();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!boardingId) return;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await getReceipt(boardingId);
        setData(res);
      } catch (e) {
        console.error('Failed to load receipt', e);
        setError('未找到小票数据');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [boardingId]);

  async function handleCopy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildReceiptText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
      alert('复制失败，请手动复制');
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-warm-text/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-3">🐾</div>
          <p className="text-warm-text/60 mb-4">{error || '未找到小票数据'}</p>
          <Link
            to="/checkout"
            className="inline-block px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#8FCFAD' }}
          >
            返回结账列表
          </Link>
        </div>
      </div>
    );
  }

  const receiptNo = generateReceiptNo(data.paidAt, data.boardingId);
  const pm = paymentMethodMeta[data.paymentMethod];
  const subtotal = data.boardingFee + data.groomingFee;
  const displayGroomingItems = resolveGroomingDisplayItems(data);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Link
            to={`/checkout/${data.boardingId}`}
            className="p-2 rounded-xl bg-white shadow-sm hover:bg-cream-coffee-50 transition-all text-warm-text/70 hover:text-warm-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-warm-text">收款小票</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-warm-text hover:bg-cream-coffee-50 transition-all"
          >
            <Copy className="w-4 h-4" />
            {copied ? '已复制到剪贴板' : '复制小票'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white shadow-sm transition-all hover:opacity-90"
            style={{ backgroundColor: '#C89F7B' }}
          >
            <Printer className="w-4 h-4" />
            打印小票
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className="w-full bg-white p-8"
          style={{
            maxWidth: 480,
            borderRadius: 8,
            border: '2px dashed #E7D0B3',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-warm-text">🐾 萌宠管家</div>
            <div
              className="text-xl font-bold mt-2"
              style={{ color: '#C89F7B' }}
            >
              收款凭证
            </div>
            <div className="text-sm text-warm-text/50 mt-2 font-mono">
              {receiptNo}
            </div>
          </div>

          <div
            className="border-t border-dashed my-5"
            style={{ borderColor: '#E7D0B3' }}
          />

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-1.5 text-warm-text">
              <span>{petEmojiMap[data.petType] || '🐾'}</span>
              <span className="font-medium">{data.petName}</span>
              <span className="text-warm-text/50">·</span>
              <span className="text-warm-text/70">{data.petBreed}</span>
            </div>
            <div className="text-warm-text">
              <span className="text-warm-text/60">主人：</span>
              <span className="font-medium">{data.ownerName}</span>
              <span className="ml-2 text-warm-text/70">{data.ownerPhone}</span>
            </div>
            <div className="text-warm-text">
              <span className="text-warm-text/60">入住：</span>
              <span className="font-medium">{data.checkInDate}</span>
              <span className="mx-2 text-warm-text/40">|</span>
              <span className="text-warm-text/60">离店：</span>
              <span className="font-medium">{data.checkOutDate}</span>
            </div>
            <div className="text-warm-text">
              <span className="text-warm-text/60">寄养：</span>
              <span className="font-medium">
                {data.boardingDays}天 × ¥{data.dailyPrice}/天
              </span>
              <span className="ml-2 text-warm-text/50">=</span>
              <span className="ml-2 font-bold text-warm-text">¥{data.boardingFee}</span>
            </div>
          </div>

          {displayGroomingItems.length > 0 ? (
            <>
              <div
                className="border-t border-dashed my-5"
                style={{ borderColor: '#E7D0B3' }}
              />
              <div className="text-sm text-warm-text/60 mb-2">美容项目</div>
              <div className="space-y-1.5">
                {displayGroomingItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-warm-text/80">{item.serviceName}</span>
                    <span className="text-warm-text font-medium">￥{item.price}</span>
                  </div>
                ))}
                <div
                  className="flex items-center justify-between text-sm pt-2 mt-1"
                  style={{ borderTop: '1px dashed #F3E7D9' }}
                >
                  <span className="text-warm-text/60">美容小计</span>
                  <span className="text-warm-text font-medium">￥{data.groomingFee}</span>
                </div>
              </div>
            </>
          ) : data.remarksFromPayment ? (
            <>
              <div
                className="border-t border-dashed my-5"
                style={{ borderColor: '#E7D0B3' }}
              />
              <div className="text-sm text-warm-text/60 mb-2">美容费用</div>
              <div className="text-sm text-warm-text/80 leading-relaxed">
                {data.remarksFromPayment}
              </div>
            </>
          ) : null}

          <div
            className="border-t border-dashed my-5"
            style={{ borderColor: '#E7D0B3' }}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-warm-text/70">小计</span>
              <span className="text-warm-text font-medium">￥{subtotal}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-text/70">优惠</span>
                <span className="text-red-400 font-medium">-￥{data.discount}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-warm-text font-semibold text-base">合计</span>
              <span
                className="font-bold"
                style={{ color: '#C89F7B', fontSize: 28 }}
              >
                ￥{data.totalAmount}
              </span>
            </div>
          </div>

          <div
            className="border-t border-dashed my-5"
            style={{ borderColor: '#E7D0B3' }}
          />

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-warm-text/60">支付方式：</span>
              <span className="text-2xl">{pm.emoji}</span>
              <span className="font-medium text-warm-text">{pm.label}</span>
            </div>
            <div className="text-warm-text">
              <span className="text-warm-text/60">收款时间：</span>
              <span className="font-medium">{formatDateTime(data.paidAt)}</span>
            </div>
            {data.remarks && (
              <div className="text-warm-text pt-1">
                <span className="text-warm-text/60">备注：</span>
                <span className="text-warm-text/80">{data.remarks}</span>
              </div>
            )}
          </div>

          <div
            className="border-t border-dashed my-5"
            style={{ borderColor: '#E7D0B3' }}
          />

          <div className="text-center text-sm text-warm-text/60 pt-2">
            感谢您的光临，期待下次再见 🐾
          </div>
        </div>
      </div>
    </div>
  );
}
