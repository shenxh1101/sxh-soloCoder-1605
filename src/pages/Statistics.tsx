import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { getStatistics } from '../utils/api';
import type { Statistics as StatisticsType } from '../../shared/types';

function getCurrentMonth(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function adjustMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN');
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl p-6 bg-white shadow-sm animate-pulse">
      <div className="h-5 w-20 bg-warm-text/10 rounded mb-3" />
      <div className="h-12 w-32 bg-warm-text/10 rounded mb-2" />
      <div className="h-4 w-24 bg-warm-text/10 rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-72 bg-warm-text/5 rounded-xl flex items-center justify-center animate-pulse">
      <Loader2 className="w-8 h-8 text-warm-text/30 animate-spin" />
    </div>
  );
}

export default function Statistics() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatisticsType | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await getStatistics(month);
        setData(res);
      } catch (err) {
        console.error('Statistics fetch error:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [month]);

  const boardingData = useMemo(() => {
    if (!data?.boardingByBreed) return [];
    return [...data.boardingByBreed]
      .sort((a, b) => b.days - a.days)
      .slice(0, 8);
  }, [data]);

  const groomingData = useMemo(() => {
    if (!data?.groomingByService) return [];
    return [...data.groomingByService].sort((a, b) => b.count - a.count);
  }, [data]);

  const monthlyData = useMemo(() => {
    if (!data?.revenue?.monthly) return [];
    return data.revenue.monthly.slice(-6);
  }, [data]);

  const hasData = useMemo(() => {
    if (!data?.revenue) return false;
    return (
      data.revenue.total > 0 ||
      boardingData.length > 0 ||
      groomingData.length > 0 ||
      monthlyData.length > 0
    );
  }, [data, boardingData, groomingData, monthlyData]);

  function handlePrevMonth() {
    setMonth((prev) => adjustMonth(prev, -1));
  }

  function handleNextMonth() {
    setMonth((prev) => adjustMonth(prev, 1));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-text font-quicksand flex items-center gap-2">
          <span>📊</span> 数据统计
        </h1>
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-cream-coffee-50 text-warm-text/70 hover:text-cream-coffee-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-1.5 font-semibold text-warm-text font-quicksand min-w-[100px] text-center">
            {month}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-cream-coffee-50 text-warm-text/70 hover:text-cream-coffee-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div
              className="relative rounded-2xl p-6 shadow-sm bg-gradient-to-br overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #F5D4B8 0%, #E8A878 100%)' }}
            >
              <div className="absolute -right-2 -top-2 text-6xl opacity-20">
                <span>💰</span>
              </div>
              <div className="relative">
                <div className="text-sm text-white/80 mb-2">本月总收入</div>
                <div className="text-4xl font-bold text-white font-quicksand">
                  ¥{formatCurrency(data?.revenue?.total || 0)}
                </div>
                <div className="text-sm text-white/70 mt-2 flex items-center gap-1">
                  <span>📈</span>
                  环比上月 +12.5%
                </div>
              </div>
            </div>

            <div
              className="relative rounded-2xl p-6 shadow-sm bg-gradient-to-br overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #C8E6D4 0%, #8FCFAD 100%)' }}
            >
              <div className="absolute -right-2 -top-2 text-6xl opacity-20">
                <span>🏠</span>
              </div>
              <div className="relative">
                <div className="text-sm text-white/80 mb-2">寄养收入</div>
                <div className="text-4xl font-bold text-white font-quicksand">
                  ¥{formatCurrency(data?.revenue?.boardingTotal || 0)}
                </div>
                <div className="text-sm text-white/70 mt-2">
                  占比 {data?.revenue?.total ? Math.round((data.revenue.boardingTotal / data.revenue.total) * 100) : 0}%
                </div>
              </div>
            </div>

            <div
              className="relative rounded-2xl p-6 shadow-sm bg-gradient-to-br overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #E8D5C4 0%, #D4B896 100%)' }}
            >
              <div className="absolute -right-2 -top-2 text-6xl opacity-20">
                <span>✂️</span>
              </div>
              <div className="relative">
                <div className="text-sm text-white/80 mb-2">美容收入</div>
                <div className="text-4xl font-bold text-white font-quicksand">
                  ¥{formatCurrency(data?.revenue?.groomingTotal || 0)}
                </div>
                <div className="text-sm text-white/70 mt-2">
                  占比 {data?.revenue?.total ? Math.round((data.revenue.groomingTotal / data.revenue.total) * 100) : 0}%
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-warm-text mb-3 font-quicksand flex items-center gap-2">
          <span>📋</span> 经营概览
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <div
                className="relative rounded-2xl p-6 shadow-sm bg-gradient-to-br overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #B8D8F5 0%, #78A8E8 100%)' }}
              >
                <div className="absolute -right-2 -top-2 text-6xl opacity-20">
                  <span>🏆</span>
                </div>
                <div className="relative">
                  <div className="text-sm text-white/80 mb-2">本月完成寄养</div>
                  <div className="text-4xl font-bold text-white font-quicksand">
                    {data?.summary?.completedBoardings || 0}
                  </div>
                  <div className="text-sm text-white/70 mt-2">单</div>
                </div>
              </div>

              <div
                className="relative rounded-2xl p-6 shadow-sm bg-gradient-to-br overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #F5B8D8 0%, #E878A8 100%)' }}
              >
                <div className="absolute -right-2 -top-2 text-6xl opacity-20">
                  <span>✂️</span>
                </div>
                <div className="relative">
                  <div className="text-sm text-white/80 mb-2">本月完成美容</div>
                  <div className="text-4xl font-bold text-white font-quicksand">
                    {data?.summary?.completedGroomings || 0}
                  </div>
                  <div className="text-sm text-white/70 mt-2">单</div>
                </div>
              </div>

              <div
                className="relative rounded-2xl p-6 shadow-sm bg-gradient-to-br overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #F5E8B8 0%, #E8C878 100%)' }}
              >
                <div className="absolute -right-2 -top-2 text-6xl opacity-20">
                  <span>⏳</span>
                </div>
                <div className="relative">
                  <div className="text-sm text-white/80 mb-2">待结账订单</div>
                  <div className="text-4xl font-bold text-white font-quicksand">
                    {data?.summary?.pendingCheckout || 0}
                  </div>
                  <div className="text-sm text-white/70 mt-2">单</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-2xl p-16 shadow-sm text-center">
          <div className="text-6xl mb-4">
            <span></span>
          </div>
          <h3 className="text-xl font-bold text-warm-text mb-2 font-quicksand">暂无统计数据</h3>
          <p className="text-warm-text/50">该月份还没有产生任何业务数据</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-warm-text mb-4 font-quicksand flex items-center gap-2">
                <span>🏆</span> 寄养品种排行
              </h3>
              {boardingData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-warm-text/50">
                  <div className="text-4xl mb-2">
                    <span>🐾</span>
                  </div>
                  <p>暂无寄养数据</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={boardingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A2DBC1" />
                        <stop offset="100%" stopColor="#8FCFAD" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3E7D9" vertical={false} />
                    <XAxis
                      dataKey="breed"
                      tick={{ fill: '#6B5B4F', fontSize: 12 }}
                      axisLine={{ stroke: '#E7D0B3' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6B5B4F', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: '天数', angle: -90, position: 'insideLeft', fill: '#6B5B4F', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFF8F0',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      labelStyle={{ color: '#6B5B4F', fontWeight: 600 }}
                      formatter={(value: number) => [`${value} 天`, '寄养天数']}
                    />
                    <Bar dataKey="days" fill="url(#mintGradient)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-warm-text mb-4 font-quicksand flex items-center gap-2">
                <span>✂️</span> 美容项目热度
              </h3>
              {groomingData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-warm-text/50">
                  <div className="text-4xl mb-2">
                    <span>💇</span>
                  </div>
                  <p>暂无美容数据</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={groomingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="coffeeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#DBB88E" />
                        <stop offset="100%" stopColor="#C89F7B" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3E7D9" vertical={false} />
                    <XAxis
                      dataKey="serviceName"
                      tick={{ fill: '#6B5B4F', fontSize: 12 }}
                      axisLine={{ stroke: '#E7D0B3' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6B5B4F', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: '次数', angle: -90, position: 'insideLeft', fill: '#6B5B4F', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFF8F0',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      labelStyle={{ color: '#6B5B4F', fontWeight: 600 }}
                      formatter={(value: number) => [`${value} 次`, '预约次数']}
                    />
                    <Bar dataKey="count" fill="url(#coffeeGradient)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-warm-text mb-4 font-quicksand flex items-center gap-2">
              <span>📈</span> 近6个月收入趋势
            </h3>
            {monthlyData.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-warm-text/50">
                <div className="text-4xl mb-2">
                  <span>📊</span>
                </div>
                <p>暂无历史数据</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DBB88E" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#C89F7B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3E7D9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#6B5B4F', fontSize: 12 }}
                    axisLine={{ stroke: '#E7D0B3' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6B5B4F', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `¥${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFF8F0',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    labelStyle={{ color: '#6B5B4F', fontWeight: 600 }}
                    formatter={(value: number) => [`¥${formatCurrency(value)}`, '总收入']}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 16 }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="总收入"
                    stroke="#C89F7B"
                    strokeWidth={3}
                    dot={{ fill: '#C89F7B', strokeWidth: 2, r: 5, stroke: '#FFF8F0' }}
                    activeDot={{ r: 8, fill: '#C89F7B', stroke: '#FFF8F0', strokeWidth: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
