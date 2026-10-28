import { useEffect, useState } from 'react';
import {
  User,
  Calendar,
  DollarSign,
  CreditCard,
  MapPin,
  StickyNote,
  Clock,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_FLOW,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/utils';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type {
  Order,
  OrderStatus,
  OrderStatusLog,
  OrderItem,
  PaymentStatus,
} from '@/types';

interface OrderDetailDrawerProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function OrderDetailDrawer({
  order,
  open,
  onClose,
  onUpdated,
  onDeleted,
}: OrderDetailDrawerProps) {
  const toast = useToast();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [logs, setLogs] = useState<OrderStatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!order) return;
    setLoading(true);
    Promise.all([
      supabase.from('order_items').select('*').eq('order_id', order.id),
      supabase
        .from('order_status_log')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false }),
    ]).then(([itemsRes, logsRes]) => {
      setItems(itemsRes.data ?? []);
      setLogs(logsRes.data ?? []);
      setLoading(false);
    });
  }, [order]);

  async function updateStatus(newStatus: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    const oldStatus = order.status;

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'shipped') updates.shipped_at = new Date().toISOString();
    if (newStatus === 'delivered')
      updates.delivered_at = new Date().toISOString();
    if (newStatus === 'cancelled' || newStatus === 'refunded') {
      updates.shipped_at = null;
      updates.delivered_at = null;
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id);

    if (error) {
      toast('Failed to update status: ' + error.message, 'error');
      setUpdating(false);
      return;
    }

    await supabase.from('order_status_log').insert({
      order_id: order.id,
      from_status: oldStatus,
      to_status: newStatus,
    });

    // If cancelling, restore stock
    if (newStatus === 'cancelled' || newStatus === 'refunded') {
      for (const item of items) {
        await supabase.rpc('restore_stock', {
          p_product_id: item.product_id,
          p_qty: item.quantity,
        });
      }
    }

    toast(`Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`, 'success');
    setUpdating(false);
    onUpdated();
  }

  async function updatePayment(newPayment: PaymentStatus) {
    if (!order) return;
    setUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: newPayment })
      .eq('id', order.id);

    if (error) {
      toast('Failed to update payment status', 'error');
    } else {
      toast(`Payment status set to ${PAYMENT_STATUS_LABELS[newPayment]}`, 'success');
      onUpdated();
    }
    setUpdating(false);
  }

  async function handleDelete() {
    if (!order) return;
    // Restore stock before deleting
    for (const item of items) {
      await supabase.rpc('restore_stock', {
        p_product_id: item.product_id,
        p_qty: item.quantity,
      });
    }
    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) {
      toast('Failed to delete order', 'error');
      return;
    }
    toast('Order deleted', 'success');
    onDeleted();
    onClose();
  }

  if (!order) return null;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={order.order_number}
        subtitle={`Placed ${formatDateTime(order.placed_at)}`}
        footer={
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={16} />
              Delete
            </button>
            <div className="flex-1" />
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </>
        }
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={28} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status + payment badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className={`badge ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
                {PAYMENT_STATUS_LABELS[order.payment_status]}
              </span>
              {order.payment_method && (
                <span className="badge bg-ink-100 text-ink-600 border-ink-200">
                  <CreditCard size={12} />
                  {order.payment_method.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Status workflow */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-ink-700 mb-3">
                Update Status
              </p>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    disabled={updating || s === order.status}
                    onClick={() => updateStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      s === order.status
                        ? ORDER_STATUS_COLORS[s] + ' opacity-70 cursor-default'
                        : 'border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50'
                    }`}
                  >
                    {ORDER_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-ink-100">
                <p className="text-sm font-semibold text-ink-700 mb-2">
                  Payment Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    ['unpaid', 'paid', 'partially_paid', 'refunded'] as PaymentStatus[]
                  ).map((p) => (
                    <button
                      key={p}
                      disabled={updating || p === order.payment_status}
                      onClick={() => updatePayment(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        p === order.payment_status
                          ? PAYMENT_STATUS_COLORS[p] + ' opacity-70 cursor-default'
                          : 'border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50'
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Customer info */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-ink-700 mb-3">
                Customer
              </p>
              {order.customer ? (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {order.customer.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900">
                      {order.customer.name}
                    </p>
                    {order.customer.company && (
                      <p className="text-sm text-ink-500">
                        {order.customer.company}
                      </p>
                    )}
                    {order.customer.email && (
                      <p className="text-sm text-ink-500 mt-1">
                        {order.customer.email}
                      </p>
                    )}
                    {order.customer.phone && (
                      <p className="text-sm text-ink-500">{order.customer.phone}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-400">Walk-in customer</p>
              )}
            </div>

            {/* Items */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-ink-700 mb-3">
                Line Items ({items.length})
              </p>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2.5 border-b border-ink-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-ink-400">
                        {item.product_sku} · Qty {item.quantity} ×{' '}
                        {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-ink-900 tabular-nums">
                      {formatCurrency(Number(item.line_total))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-ink-100 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(order.subtotal))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Tax</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(order.tax))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Shipping</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(order.shipping))}
                  </span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Discount</span>
                    <span className="font-medium text-rose-600 tabular-nums">
                      −{formatCurrency(Number(order.discount))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-ink-100">
                  <span className="text-base font-semibold text-ink-900">
                    Total
                  </span>
                  <span className="text-lg font-bold text-ink-900 tabular-nums">
                    {formatCurrency(Number(order.total))}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="card p-5 space-y-3">
              <DetailRow icon={Calendar} label="Placed">
                {formatDateTime(order.placed_at)}
              </DetailRow>
              {order.shipped_at && (
                <DetailRow icon={ArrowRight} label="Shipped">
                  {formatDateTime(order.shipped_at)}
                </DetailRow>
              )}
              {order.delivered_at && (
                <DetailRow icon={DollarSign} label="Delivered">
                  {formatDateTime(order.delivered_at)}
                </DetailRow>
              )}
              {order.shipping_address && (
                <DetailRow icon={MapPin} label="Shipping Address">
                  {order.shipping_address}
                </DetailRow>
              )}
              {order.notes && (
                <DetailRow icon={StickyNote} label="Notes">
                  {order.notes}
                </DetailRow>
              )}
            </div>

            {/* Status history */}
            {logs.length > 0 && (
              <div className="card p-5">
                <p className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-ink-400" />
                  Status History
                </p>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-ink-800 font-medium capitalize">
                          {log.to_status}
                        </span>
                        {log.from_status && (
                          <span className="text-ink-400">
                            {' '}
                            ← from {log.from_status}
                          </span>
                        )}
                        <p className="text-xs text-ink-400 mt-0.5">
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Order?"
        message={`This will permanently delete order ${order.order_number} and restore all product stock. This cannot be undone.`}
        confirmLabel="Delete Order"
      />
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-ink-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-400 font-medium">{label}</p>
        <p className="text-sm text-ink-800">{children}</p>
      </div>
    </div>
  );
}
