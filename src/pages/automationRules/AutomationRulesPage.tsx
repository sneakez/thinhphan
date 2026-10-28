import { useEffect, useState } from 'react';
import { Zap, Plus, Trash2, Power } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { OrderAutomationRule, AutomationTrigger } from '@/types';

interface AutomationRulesPageProps {
  search: string;
}

export function AutomationRulesPage({ search }: AutomationRulesPageProps) {
  const toast = useToast();
  const [rules, setRules] = useState<OrderAutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('order_automation_rules').select('*').order('priority', { ascending: true });
    setRules((data as OrderAutomationRule[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = rules.filter((r) =>
    !search || r.rule_name.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(rule: OrderAutomationRule) {
    const { error } = await supabase.from('order_automation_rules').update({ is_active: !rule.is_active }).eq('id', rule.id);
    if (error) { toast('Failed', 'error'); return; }
    toast(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`, 'success');
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('order_automation_rules').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) { toast('Failed', 'error'); return; }
    toast('Rule deleted', 'success');
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Automation Rules ({filtered.length})</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> New Rule</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Zap} title="No automation rules" message="Create IF-THEN rules to automate order processing" />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className={`card p-5 ${!r.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.is_active ? 'bg-amber-100' : 'bg-ink-100'}`}>
                    <Zap size={18} className={r.is_active ? 'text-amber-600' : 'text-ink-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-ink-800">{r.rule_name}</h3>
                      <span className="text-xs text-ink-400">Priority {r.priority}</span>
                      <span className="badge bg-slate-100 text-slate-600 border-slate-200 capitalize">{r.trigger_event.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-xs font-semibold text-ink-500 mb-1">Conditions (IF)</p>
                        <pre className="text-xs text-ink-600 bg-ink-50 rounded p-2 overflow-x-auto">{JSON.stringify(r.conditions_json, null, 2)}</pre>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink-500 mb-1">Actions (THEN)</p>
                        <pre className="text-xs text-ink-600 bg-ink-50 rounded p-2 overflow-x-auto">{JSON.stringify(r.actions_json, null, 2)}</pre>
                      </div>
                    </div>
                    <p className="text-xs text-ink-400 mt-2">Created {formatDate(r.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(r)} className={`btn-ghost p-2 ${r.is_active ? 'text-emerald-600' : 'text-ink-400'}`} title={r.is_active ? 'Deactivate' : 'Activate'}>
                    <Power size={18} />
                  </button>
                  <button onClick={() => setDeleteId(r.id)} className="btn-ghost p-2 text-rose-500 hover:bg-rose-50">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NewRuleModal open={showModal} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false); }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Rule?" message="This automation rule will be permanently deleted." confirmLabel="Delete" />
    </div>
  );

  function NewRuleModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState('');
    const [priority, setPriority] = useState(100);
    const [trigger, setTrigger] = useState<AutomationTrigger>('order_created');
    const [conditionsJson, setConditionsJson] = useState('{"order_total":{"gte":500}}');
    const [actionsJson, setActionsJson] = useState('{"add_free_gift":"PROMO-BAG"}');
    const [saving, setSaving] = useState(false);

    async function handleSave() {
      if (!name) { toast('Enter rule name', 'error'); return; }
      let conditions: Record<string, unknown>;
      let actions: Record<string, unknown>;
      try {
        conditions = JSON.parse(conditionsJson);
        actions = JSON.parse(actionsJson);
      } catch {
        toast('Invalid JSON', 'error');
        return;
      }
      setSaving(true);
      const { error } = await supabase.from('order_automation_rules').insert({
        rule_name: name, priority, trigger_event: trigger,
        conditions_json: conditions, actions_json: actions, is_active: true,
      });
      setSaving(false);
      if (error) { toast('Failed: ' + error.message, 'error'); return; }
      toast('Rule created', 'success');
      onSaved();
    }

    return (
      <Modal open={open} onClose={onClose} title="New Automation Rule" size="md"
        footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null} Create</button></>}>
        <div className="space-y-4">
          <div><label className="label">Rule Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Free gift over $500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Priority</label><input type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 100)} className="input" /></div>
            <div><label className="label">Trigger Event</label>
              <select value={trigger} onChange={(e) => setTrigger(e.target.value as AutomationTrigger)} className="input">
                <option value="order_created">Order Created</option>
                <option value="order_status_changed">Order Status Changed</option>
                <option value="payment_received">Payment Received</option>
              </select>
            </div>
          </div>
          <div><label className="label">Conditions (JSON)</label><textarea value={conditionsJson} onChange={(e) => setConditionsJson(e.target.value)} rows={3} className="input font-mono text-xs" /></div>
          <div><label className="label">Actions (JSON)</label><textarea value={actionsJson} onChange={(e) => setActionsJson(e.target.value)} rows={3} className="input font-mono text-xs" /></div>
        </div>
      </Modal>
    );
  }
}
