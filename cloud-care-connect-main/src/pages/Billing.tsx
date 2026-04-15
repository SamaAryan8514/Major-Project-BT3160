import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Eye, Edit, Trash2, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const paymentMethods = ["Cash", "Card", "Insurance", "Online", "Pending"];
const paymentStatuses = ["Pending", "Paid", "Partially Paid", "Overdue", "Refunded"];

interface BillItem { description: string; quantity: number; rate: number; amount: number; }

const Billing = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [items, setItems] = useState<BillItem[]>([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
  const [form, setForm] = useState({
    patient_id: "", payment_method: "Pending", payment_status: "Pending",
    tax: 0, discount: 0, notes: "", due_date: "",
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billing")
        .select("*, patients(first_name, last_name, patient_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("id, first_name, last_name, patient_id");
      if (error) throw error;
      return data;
    },
  });

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const total = subtotal + form.tax - form.discount;

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        patient_id: data.patient_id, items: JSON.stringify(items),
        subtotal, tax: data.tax, discount: data.discount, total,
        payment_method: data.payment_method, payment_status: data.payment_status,
        notes: data.notes || null, due_date: data.due_date || null,
        paid_at: data.payment_status === "Paid" ? new Date().toISOString() : null,
      };
      if (data.id) {
        const { error } = await supabase.from("billing").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("billing").insert({ ...payload, invoice_id: "" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success(editing ? "Invoice updated" : "Invoice created");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["billing"] }); toast.success("Invoice deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false); setEditing(null);
    setForm({ patient_id: "", payment_method: "Pending", payment_status: "Pending", tax: 0, discount: 0, notes: "", due_date: "" });
    setItems([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const updateItem = (idx: number, field: keyof BillItem, value: string | number) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = value;
    if (field === "quantity" || field === "rate") {
      newItems[idx].amount = newItems[idx].quantity * newItems[idx].rate;
    }
    setItems(newItems);
  };

  const statusVariant = (s: string) =>
    s === "Paid" ? "default" : s === "Pending" ? "secondary" : s === "Overdue" ? "destructive" : "outline";

  const filtered = invoices.filter(inv =>
    `${inv.invoice_id} ${(inv.patients as any)?.first_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = invoices.filter(i => i.payment_status === "Paid").reduce((s, i) => s + Number(i.total), 0);
  const totalPending = invoices.filter(i => i.payment_status === "Pending" || i.payment_status === "Overdue").reduce((s, i) => s + Number(i.total), 0);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Billing & Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">{invoices.length} invoices</p>
        </div>
        <Button className="gap-2" onClick={() => { closeDialog(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold font-display text-success">${totalRevenue.toFixed(2)}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Pending Amount</p><p className="text-xl font-bold font-display text-warning">${totalPending.toFixed(2)}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Total Invoices</p><p className="text-xl font-bold font-display text-foreground">{invoices.length}</p></div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Invoice</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Patient</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Method</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr> :
               filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No invoices found</td></tr> :
               filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{inv.invoice_id}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{(inv.patients as any)?.first_name} {(inv.patients as any)?.last_name}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-foreground">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{inv.payment_method || "-"}</td>
                  <td className="px-5 py-3.5"><Badge variant={statusVariant(inv.payment_status)}>{inv.payment_status}</Badge></td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(inv); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setEditing(inv);
                        const parsedItems = typeof inv.items === "string" ? JSON.parse(inv.items) : (Array.isArray(inv.items) ? inv.items : []);
                        setItems(parsedItems.length > 0 ? parsedItems : [{ description: "", quantity: 1, rate: 0, amount: 0 }]);
                        setForm({
                          patient_id: inv.patient_id, payment_method: inv.payment_method || "Pending",
                          payment_status: inv.payment_status, tax: Number(inv.tax), discount: Number(inv.discount),
                          notes: inv.notes || "", due_date: inv.due_date || "",
                        });
                        setDialogOpen(true);
                      }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(inv.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Invoice" : "Create Invoice"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate(editing ? { ...form, id: editing.id } : form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Patient</Label>
                <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_id})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <Label>Line Items</Label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 items-end">
                  <Input placeholder="Description" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                  <Input type="number" min={1} placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} />
                  <Input type="number" min={0} step="0.01" placeholder="Rate" value={item.rate} onChange={e => updateItem(idx, "rate", parseFloat(e.target.value) || 0)} />
                  <Input readOnly value={`$${item.amount.toFixed(2)}`} className="bg-muted" />
                  {items.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))}>×</Button>}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }])}>
                + Add Item
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
              <div className="space-y-1"><Label className="text-xs">Subtotal</Label><p className="font-semibold">${subtotal.toFixed(2)}</p></div>
              <div className="space-y-2"><Label>Tax ($)</Label><Input type="number" min={0} step="0.01" value={form.tax} onChange={e => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Discount ($)</Label><Input type="number" min={0} step="0.01" value={form.discount} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="text-right text-lg font-bold font-display text-foreground">Total: ${total.toFixed(2)}</div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Payment Status</Label>
                <Select value={form.payment_status} onValueChange={v => setForm({ ...form, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <DialogFooter><Button type="submit" disabled={upsertMutation.isPending}>{editing ? "Update" : "Create Invoice"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Invoice:</span> <strong>{viewing.invoice_id}</strong></div>
                <div><span className="text-muted-foreground">Patient:</span> {(viewing.patients as any)?.first_name} {(viewing.patients as any)?.last_name}</div>
                <div><span className="text-muted-foreground">Total:</span> <strong>${Number(viewing.total).toFixed(2)}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant(viewing.payment_status)}>{viewing.payment_status}</Badge></div>
                <div><span className="text-muted-foreground">Method:</span> {viewing.payment_method || "-"}</div>
                <div><span className="text-muted-foreground">Due:</span> {viewing.due_date || "-"}</div>
              </div>
              {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Billing;
