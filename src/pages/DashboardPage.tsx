import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { Order, Product, Customer } from '@/types';

interface DashboardData {
  orders: Order[];
  products: Product[];
  customers: Customer[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, customer:customers(*)')
          .order('placed_at', { ascending: false })
          .limit(50),
        supabase.from('products').select('*'),
        supabase.from('customers').select('*'),
      ]);
      setData({
        orders: ordersRes.data ?? [],
        products: productsRes.data ?? [],
        customers: customersRes.data ?? [],
      });
      setLoading(false);
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentOrders = data.orders.filter(
      (o) => new Date(o.placed_at) >= last30
    );
    const prevOrders = data.orders.filter((o) => {
      const d = new Date(o.placed_at);
      return d >= prev30 && d < last30;
    });

    const revenue = recentOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + Number(o.total), 0);
    const prevRevenue = prevOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const pendingOrders = data.orders.filter(
      (o) => o.status === 'pending' || o.status === 'processing'
    ).length;

    const lowStockProducts = data.products.filter(
      (p) => p.stock <= p.reorder_level
    );

    const revenueChange =
      prevRevenue > 0
        ? ((revenue - prevRevenue) / prevRevenue) * 100
        : revenue > 0
          ? 100
          : 0;

    const activeCustomers = data.customers.filter(
      (c) => c.status === 'active'
    ).length;

    return {
      revenue,
      revenueChange,
      totalOrders: data.orders.length,
      recentOrdersCount: recentOrders.length,
      pendingOrders,
      activeCustomers,
      totalCustomers: data.customers.length,
      totalProducts: data.products.length,
      lowStockProducts,
      recentOrders: data.orders.slice(0, 8),
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const dayTotal = data.orders
        .filter((o) => {
          const d = new Date(o.placed_at);
          return d >= day && d < next && o.status !== 'cancelled';
        })
        .reduce((sum, o) => sum + Number(o.total), 0);
      days.push({
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        value: dayTotal,
      });
    }
    return days;
  }, [data]);

  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1);

  const statusBreakdown = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.orders.forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  if (loading || !metrics) return <FullPageSpinner label="Loading dashboard..." />;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl gradient-brand p-6 lg:p-8 text-white">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-white/80" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Welcome back
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Here's your operations at a glance
            </h2>
            <p className="text-sm text-white/70 mt-1.5">
              {metrics.pendingOrders} pending orders · {metrics.lowStockProducts.length} low stock alerts
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60 uppercase tracking-wider font-medium">
              Revenue (30d)
            </p>
            <p className="text-3xl font-bold tabular-nums mt-1">
              {formatCurrency(metrics.revenue)}
            </p>
            <div className="flex items-center justify-end gap-1 mt-1.5">
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs font-semibold',
                  metrics.revenueChange >= 0 ? 'text-emerald-300' : 'text-rose-300'
                )}
              >
                {metrics.revenueChange >= 0 ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                )}
                {Math.abs(metrics.revenueChange).toFixed(1)}%
              </span>
              <span className="text-xs text-white/60">vs prev 30d</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue (30d)"
          value={formatCurrency(metrics.revenue)}
          change={metrics.revenueChange}
          icon={DollarSign}
          iconBg="bg-emerald-50 text-emerald-600"
          accentColor="from-emerald-400 to-emerald-600"
        />
        <KpiCard
          label="Total Orders"
          value={metrics.totalOrders.toString()}
          sublabel={`${metrics.recentOrdersCount} in last 30 days`}
          icon={ShoppingCart}
          iconBg="bg-brand-50 text-[var(--brand-600)]"
          accentColor="from-brand-400 to-brand-600"
        />
        <KpiCard
          label="Active Customers"
          value={metrics.activeCustomers.toString()}
          sublabel={`${metrics.totalCustomers} total`}
          icon={Users}
          iconBg="bg-sky-50 text-sky-600"
          accentColor="from-sky-400 to-sky-600"
        />
        <KpiCard
          label="Products in Catalog"
          value={metrics.totalProducts.toString()}
          sublabel={`${metrics.lowStockProducts.length} low stock`}
          icon={Package}
          iconBg="bg-amber-50 text-amber-600"
          accentColor="from-amber-400 to-amber-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 p-6 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-ink-900">
                Revenue — Last 7 Days
              </h3>
              <p className="text-sm text-ink-400 mt-0.5">
                Daily order totals (excludes cancelled)
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
              <TrendingUp size={16} />
              {formatCurrency(chartData.reduce((s, d) => s + d.value, 0))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 h-48">
            {chartData.map((day, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2 group"
              >
                <div className="w-full flex-1 flex items-end relative">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-500 hover:from-brand-700 hover:to-brand-500 group-hover:shadow-lg group-hover:shadow-brand-200/60 animate-bar-grow"
                    style={{
                      height: `${Math.max((day.value / maxChartValue) * 100, 4)}%`,
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-xs font-medium px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                    {formatCurrency(day.value)}
                  </div>
                </div>
                <span className="text-xs text-ink-400 font-medium">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Status breakdown */}
        <Card className="p-6 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <h3 className="text-base font-semibold text-ink-900 mb-1">
            Order Status
          </h3>
          <p className="text-sm text-ink-400 mb-5">Distribution across all orders</p>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-ink-400 py-8 text-center">No orders yet</p>
          ) : (
            <div className="space-y-3.5">
              {statusBreakdown.map(({ status, count }) => {
                const pct = (count / metrics.totalOrders) * 100;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-ink-700 capitalize">
                        {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}
                      </span>
                      <span className="text-ink-400 tabular-nums">{count}</span>
                    </div>
                    <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700 ease-out',
                          ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS]?.split(' ')[0] ?? 'bg-ink-300'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row: recent orders + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent orders */}
        <Card className="lg:col-span-2 p-6 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-ink-900">
              Recent Orders
            </h3>
            <button className="text-xs font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)] flex items-center gap-1 transition-colors">
              View all
              <ArrowUpRight size={13} />
            </button>
          </div>
          {metrics.recentOrders.length === 0 ? (
            <p className="text-sm text-ink-400 py-8 text-center">
              No orders have been placed yet
            </p>
          ) : (
            <div className="space-y-1">
              {metrics.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-ink-50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                    <ShoppingCart size={18} className="text-[var(--brand-600)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-ink-400 truncate">
                      {order.customer?.name ?? 'Walk-in'} ·{' '}
                      {formatDate(order.placed_at)}
                    </p>
                  </div>
                  <span className={cn('badge', ORDER_STATUS_COLORS[order.status])}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <span className="text-sm font-bold text-ink-900 tabular-nums w-20 text-right">
                    {formatCurrency(Number(order.total))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Alerts */}
        <Card className="p-6 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <h3 className="text-base font-semibold text-ink-900 mb-4">
            Inventory Alerts
          </h3>
          {metrics.lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <TrendingUp size={26} className="text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-ink-700">
                All stock levels healthy
              </p>
              <p className="text-xs text-ink-400 mt-1">
                No products below reorder level
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.pendingOrders > 0 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/60">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      {metrics.pendingOrders} pending orders
                    </p>
                    <p className="text-xs text-amber-700">
                      Awaiting processing
                    </p>
                  </div>
                </div>
              )}
              {metrics.lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200/60"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} className="text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-rose-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-rose-700">
                      {product.stock} left · reorder at {product.reorder_level}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  change,
  icon: Icon,
  iconBg,
  accentColor,
}: {
  label: string;
  value: string;
  sublabel?: string;
  change?: number;
  icon: typeof DollarSign;
  iconBg: string;
  accentColor: string;
}) {
  return (
    <Card className="p-5 hover:shadow-lg hover:shadow-ink-200/40 transition-all duration-300 group relative overflow-hidden">
      <div className={cn('absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br opacity-5 blur-2xl transition-opacity duration-300 group-hover:opacity-10', accentColor)} />
      <div className="flex items-start justify-between relative">
        <div className="flex-1">
          <p className="text-sm text-ink-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-ink-900 mt-2 tabular-nums">
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-ink-400 mt-1">{sublabel}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
                  change >= 0
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-rose-700 bg-rose-50'
                )}
              >
                {change >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-ink-400">vs prev 30d</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
            iconBg
          )}
        >
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
