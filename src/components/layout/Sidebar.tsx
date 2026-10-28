import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Boxes,
  Sparkles,
  Warehouse,
  ArrowLeftRight,
  FlaskConical,
  ScrollText,
  ClipboardList,
  Layers,
  Truck,
  Receipt,
  ShieldCheck,
  Bot,
  Webhook,
  Zap,
  TrendingUp,
  PackageCheck,
  BadgePercent,
  ScanLine,
  Banknote,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type PageId =
  | 'dashboard'
  | 'orders'
  | 'customers'
  | 'products'
  | 'inventory'
  | 'warehouses'
  | 'transfers'
  | 'batches'
  | 'stockLedger'
  | 'purchaseOrders'
  | 'channelMapping'
  | 'fulfillment'
  | 'returns'
  | 'ledger'
  | 'feeReconciliation'
  | 'marginControl'
  | 'complaints'
  | 'auditTrail'
  | 'automationRules'
  | 'webhooks'
  | 'simulator';

interface NavGroup {
  label: string;
  items: { id: PageId; label: string; icon: typeof LayoutDashboard }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Sales',
    items: [
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'complaints', label: 'Complaints & AI', icon: Bot },
      { id: 'returns', label: 'Returns / RMA', icon: PackageCheck },
    ],
  },
  {
    label: 'Catalog & Inventory',
    items: [
      { id: 'products', label: 'Products & BOM', icon: Package },
      { id: 'inventory', label: '5-State Inventory', icon: Boxes },
      { id: 'warehouses', label: 'Warehouses & Bins', icon: Warehouse },
      { id: 'transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
      { id: 'batches', label: 'Batches & Serials', icon: FlaskConical },
      { id: 'stockLedger', label: 'Stock Ledger', icon: ScrollText },
      { id: 'purchaseOrders', label: 'Purchase Orders', icon: ClipboardList },
      { id: 'channelMapping', label: 'Channel SKU Mapping', icon: Layers },
    ],
  },
  {
    label: 'Fulfillment',
    items: [
      { id: 'fulfillment', label: 'Wave Picking & SLA', icon: Truck },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'ledger', label: 'Double-Entry Ledger', icon: Banknote },
      { id: 'feeReconciliation', label: 'Fee Reconciliation', icon: Receipt },
      { id: 'marginControl', label: 'Margin Circuit Breaker', icon: BadgePercent },
    ],
  },
  {
    label: 'Governance & Platform',
    items: [
      { id: 'auditTrail', label: 'Audit Trail (SHA-256)', icon: ShieldCheck },
      { id: 'automationRules', label: 'Automation Rules', icon: Zap },
      { id: 'webhooks', label: 'Outbound Webhooks', icon: Webhook },
      { id: 'simulator', label: 'Chaos Simulator', icon: Activity },
    ],
  },
];

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  stats: { pendingOrders: number; lowStock: number };
}

export function Sidebar({ current, onNavigate, stats }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 bg-ink-950 text-ink-100 flex flex-col h-screen sticky top-0 overflow-y-auto overflow-x-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />

      <div className="relative px-5 py-5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Boxes size={22} className="text-white" />
            <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse-glow" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">NexusOMS</h1>
            <p className="text-[11px] text-ink-400 font-medium flex items-center gap-1">
              <Sparkles size={9} className="text-brand-400" />
              Enterprise v3.0
            </p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 px-3 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = current === item.id;
                const Icon = item.icon;
                const badge =
                  item.id === 'orders'
                    ? stats.pendingOrders
                    : item.id === 'inventory' || item.id === 'products'
                      ? stats.lowStock
                      : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                      active
                        ? 'bg-brand-600/15 text-brand-200 border border-brand-600/20'
                        : 'text-ink-300 hover:bg-white/5 hover:text-white border border-transparent'
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-brand-400" />
                    )}
                    <Icon
                      size={17}
                      className={cn(
                        'transition-transform duration-200 group-hover:scale-110 shrink-0',
                        active ? 'text-brand-300' : ''
                      )}
                    />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          'text-[10px] font-semibold rounded-full px-1.5 py-0.5 transition-all shrink-0',
                          active
                            ? 'bg-brand-500 text-white'
                            : 'bg-white/10 text-ink-200 group-hover:bg-white/15'
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative px-4 py-4 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 px-1">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-900/30">
            OM
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-ink-950" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Ops Manager</p>
            <p className="text-[11px] text-ink-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Admin Access
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
