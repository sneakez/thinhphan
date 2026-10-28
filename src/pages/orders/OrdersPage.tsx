import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { onPrimaryAction } from '@/lib/events';
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { OrderFormModal } from './OrderFormModal';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import type { Order, OrderStatus } from '@/types';

interface OrdersPageProps {
  search: string;
}

const STATUS_FILTERS: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export function OrdersPage({ search }: OrdersPageProps) {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  async function loadOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .order('placed_at', { ascending: false });
    if (error) {
      toast('Failed to load orders: ' + error.message, 'error');
    }
    setOrders(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    return onPrimaryAction('orders', () => setShowForm(true));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o.customer?.company?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  function openOrder(order: Order) {
    setSelectedOrder(order);
    setShowDrawer(true);
  }

  function onOrderUpdated() {
    loadOrders();
  }

  function onOrderDeleted() {
    loadOrders();
    setShowDrawer(false);
  }

  if (loading) return <FullPageSpinner label="Loading orders..." />;

  const counts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        <Filter size={16} className="text-ink-400 shrink-0" />
        {STATUS_FILTERS.map((s) => {
          const count = s === 'all' ? orders.length : (counts[s] ?? 0);
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
                active
                  ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                  : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
              )}
            >
              {s === 'all' ? 'All' : ORDER_STATUS_LABELS[s as OrderStatus]}
              <span
                className={cn(
                  'ml-1.5 text-xs',
                  active ? 'text-ink-300' : 'text-ink-400'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title={search ? 'No matching orders' : 'No orders yet'}
            description={
              search
                ? 'Try adjusting your search or filters'
                : 'Create your first order to get started'
            }
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Create Order
              </button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">Order</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Customer</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Date</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Status</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Payment</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => openOrder(order)}
                    className="hover:bg-ink-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink-900 group-hover:text-[var(--brand-600)] transition-colors">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-ink-400">
                        {order.order_items?.length ?? 0} items
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink-800">
                        {order.customer?.name ?? 'Walk-in'}
                      </p>
                      <p className="text-xs text-ink-400">
                        {order.customer?.company ?? '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-ink-500">
                      {formatDate(order.placed_at)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('badge', ORDER_STATUS_COLORS[order.status])}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('badge', PAYMENT_STATUS_COLORS[order.payment_status])}>
                        {PAYMENT_STATUS_LABELS[order.payment_status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-ink-900 tabular-nums">
                      {formatCurrency(Number(order.total))}
                    </td>
                    <td className="px-3 py-4 text-ink-300 group-hover:text-ink-500 transition-colors">
                      <ChevronRight size={18} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <OrderFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={loadOrders}
      />

      {selectedOrder && showDrawer && (
        <OrderDetailDrawer
          order={orders.find((o) => o.id === selectedOrder.id) ?? selectedOrder}
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
          onUpdated={onOrderUpdated}
          onDeleted={onOrderDeleted}
        />
      )}
    </div>
  );
}
