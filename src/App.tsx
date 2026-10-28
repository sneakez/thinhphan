import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { emitPrimaryAction } from '@/lib/events';
import { ToastProvider } from '@/components/ui/Toast';
import { Sidebar, type PageId } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DashboardPage } from '@/pages/DashboardPage';
import { OrdersPage } from '@/pages/orders/OrdersPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { InventoryPage } from '@/pages/inventory/InventoryPage';
import { WarehousesPage } from '@/pages/warehouses/WarehousesPage';
import { TransfersPage } from '@/pages/transfers/TransfersPage';
import { BatchesPage } from '@/pages/batches/BatchesPage';
import { StockLedgerPage } from '@/pages/stockLedger/StockLedgerPage';
import { PurchaseOrdersPage } from '@/pages/purchaseOrders/PurchaseOrdersPage';
import { ChannelMappingPage } from '@/pages/channelMapping/ChannelMappingPage';
import { FulfillmentPage } from '@/pages/fulfillment/FulfillmentPage';
import { ReturnsPage } from '@/pages/returns/ReturnsPage';
import { LedgerPage } from '@/pages/ledger/LedgerPage';
import { FeeReconciliationPage } from '@/pages/feeReconciliation/FeeReconciliationPage';
import { MarginControlPage } from '@/pages/marginControl/MarginControlPage';
import { ComplaintsPage } from '@/pages/complaints/ComplaintsPage';
import { AuditTrailPage } from '@/pages/auditTrail/AuditTrailPage';
import { AutomationRulesPage } from '@/pages/automationRules/AutomationRulesPage';
import { WebhooksPage } from '@/pages/webhooks/WebhooksPage';
import { SimulatorPage } from '@/pages/simulator/SimulatorPage';

interface PageMeta {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  primaryLabel: string;
}

const PAGE_META: Record<PageId, PageMeta> = {
  dashboard: { title: 'Dashboard', subtitle: 'Enterprise overview & analytics', searchPlaceholder: 'Search...', primaryLabel: '' },
  orders: { title: 'Orders', subtitle: 'Unified order hub — multi-channel fulfillment', searchPlaceholder: 'Search by order # or customer...', primaryLabel: 'New Order' },
  customers: { title: 'Customers', subtitle: 'Unified CRM with loyalty & RFM scoring', searchPlaceholder: 'Search by name, email, or company...', primaryLabel: 'Add Customer' },
  complaints: { title: 'Complaints & AI', subtitle: 'PII-guarded complaint analysis with AI sentiment', searchPlaceholder: 'Search complaints...', primaryLabel: 'New Complaint' },
  returns: { title: 'Returns / RMA', subtitle: 'Post-purchase returns & failed delivery tracking', searchPlaceholder: 'Search by RMA # or order...', primaryLabel: 'New Return' },
  products: { title: 'Products & BOM', subtitle: 'Catalog with combo/bundle & multi-warehouse', searchPlaceholder: 'Search by name, SKU, or category...', primaryLabel: 'Add Product' },
  inventory: { title: '5-State Inventory', subtitle: 'Physical, Reserved, Available, Unavailable, Incoming', searchPlaceholder: 'Search by product or SKU...', primaryLabel: '' },
  warehouses: { title: 'Warehouses & Bins', subtitle: 'Multi-warehouse with bin location management', searchPlaceholder: 'Search warehouses...', primaryLabel: 'Add Warehouse' },
  transfers: { title: 'Stock Transfers', subtitle: 'Inter-warehouse transfers with status tracking', searchPlaceholder: 'Search transfers...', primaryLabel: 'New Transfer' },
  batches: { title: 'Batches & Serials', subtitle: 'FEFO batch tracking & Serial/IMEI management', searchPlaceholder: 'Search by batch # or serial...', primaryLabel: '' },
  stockLedger: { title: 'Stock Ledger', subtitle: 'Immutable stock transaction history', searchPlaceholder: 'Search ledger...', primaryLabel: '' },
  purchaseOrders: { title: 'Purchase Orders', subtitle: 'PO management with pre-order & incoming stock', searchPlaceholder: 'Search by PO # or supplier...', primaryLabel: 'New PO' },
  channelMapping: { title: 'Channel SKU Mapping', subtitle: 'Map internal SKUs to marketplace channel SKUs', searchPlaceholder: 'Search mappings...', primaryLabel: 'Add Mapping' },
  fulfillment: { title: 'Wave Picking & SLA', subtitle: 'Fulfillment waves, SLA countdown, scan-to-pack', searchPlaceholder: 'Search waves...', primaryLabel: 'New Wave' },
  ledger: { title: 'Double-Entry Ledger', subtitle: 'Journal entries with Debit == Credit invariant', searchPlaceholder: 'Search journal entries...', primaryLabel: 'New Entry' },
  feeReconciliation: { title: 'Fee Reconciliation', subtitle: 'Granular fee breakdown & discrepancy detection', searchPlaceholder: 'Search by order #...', primaryLabel: '' },
  marginControl: { title: 'Margin Circuit Breaker', subtitle: 'Auto-shutoff when negative margin detected', searchPlaceholder: 'Search...', primaryLabel: '' },
  auditTrail: { title: 'Audit Trail', subtitle: 'SHA-256 hash chain tamper-evident log', searchPlaceholder: 'Search audit logs...', primaryLabel: '' },
  automationRules: { title: 'Automation Rules', subtitle: 'IF-THEN order automation & gift engine', searchPlaceholder: 'Search rules...', primaryLabel: 'New Rule' },
  webhooks: { title: 'Outbound Webhooks', subtitle: 'HMAC-signed event delivery to external systems', searchPlaceholder: 'Search webhooks...', primaryLabel: 'Add Webhook' },
  simulator: { title: 'Chaos Simulator', subtitle: 'Flash sale, duplicate webhook, margin attack, tamper DB', searchPlaceholder: 'Search...', primaryLabel: '' },
};

function AppInner() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [search, setSearch] = useState('');
  const [sidebarStats, setSidebarStats] = useState({ pendingOrders: 0, lowStock: 0 });

  async function refreshStats() {
    const [ordersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('status').in('status', ['pending', 'processing']),
      supabase.from('products').select('stock, reorder_level, safety_stock'),
    ]);
    setSidebarStats({
      pendingOrders: ordersRes.data?.length ?? 0,
      lowStock: productsRes.data?.filter((p) => p.stock <= (p.reorder_level ?? 10)).length ?? 0,
    });
  }

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, []);

  function navigate(p: PageId) {
    setPage(p);
    setSearch('');
  }

  const meta = PAGE_META[page];
  const showPrimary = page !== 'dashboard' && page !== 'inventory' && page !== 'batches' &&
    page !== 'stockLedger' && page !== 'feeReconciliation' && page !== 'marginControl' &&
    page !== 'auditTrail' && page !== 'simulator';

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar current={page} onNavigate={navigate} stats={sidebarStats} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={meta.searchPlaceholder}
          onPrimaryAction={showPrimary ? () => emitPrimaryAction(page) : undefined}
          primaryActionLabel={meta.primaryLabel}
        />
        <main className="flex-1">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'orders' && <OrdersPage search={search} />}
          {page === 'customers' && <CustomersPage search={search} />}
          {page === 'complaints' && <ComplaintsPage search={search} />}
          {page === 'returns' && <ReturnsPage search={search} />}
          {page === 'products' && <ProductsPage search={search} />}
          {page === 'inventory' && <InventoryPage search={search} />}
          {page === 'warehouses' && <WarehousesPage search={search} />}
          {page === 'transfers' && <TransfersPage search={search} />}
          {page === 'batches' && <BatchesPage search={search} />}
          {page === 'stockLedger' && <StockLedgerPage search={search} />}
          {page === 'purchaseOrders' && <PurchaseOrdersPage search={search} />}
          {page === 'channelMapping' && <ChannelMappingPage search={search} />}
          {page === 'fulfillment' && <FulfillmentPage search={search} />}
          {page === 'ledger' && <LedgerPage search={search} />}
          {page === 'feeReconciliation' && <FeeReconciliationPage search={search} />}
          {page === 'marginControl' && <MarginControlPage />}
          {page === 'auditTrail' && <AuditTrailPage search={search} />}
          {page === 'automationRules' && <AutomationRulesPage search={search} />}
          {page === 'webhooks' && <WebhooksPage search={search} />}
          {page === 'simulator' && <SimulatorPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
