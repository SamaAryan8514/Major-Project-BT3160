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
import { Search, Plus, Eye, Edit, Trash2, FlaskConical } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const categories = ["Blood Test", "Urine Test", "X-Ray", "MRI", "CT Scan", "Ultrasound", "ECG", "Other"];
const reportStatuses = ["Pending", "In Progress", "Completed", "Cancelled"];

const emptyReport = {
  patient_id: "", doctor_id: "", test_name: "", test_category: categories[0],
  status: "Pending", results: "", normal_range: "", remarks: "",
  report_date: new Date().toISOString().split("T")[0],
};

const LabReports = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyReport);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["lab-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_reports")
        .select("*, patients(first_name, last_name, patient_id), doctors(first_name, last_name)")
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

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("id, first_name, last_name");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, doctor_id: data.doctor_id || null };
      if (data.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("lab_reports").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lab_reports").insert({ ...payload, report_id: "" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-reports"] });
      toast.success(editing ? "Report updated" : "Report created");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lab-reports"] }); toast.success("Report deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyReport); };

  const statusVariant = (s: string) =>
    s === "Completed" ? "default" : s === "Pending" ? "secondary" : s === "In Progress" ? "outline" : "destructive";

  const filtered = reports.filter(r =>
    `${r.test_name} ${r.report_id} ${(r.patients as any)?.first_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Lab Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{reports.length} total reports</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm(emptyReport); setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> New Report
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search reports..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Report ID</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Patient</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Test</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Category</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr> :
               filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No reports found</td></tr> :
               filtered.map(r => (
                <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{r.report_id}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{(r.patients as any)?.first_name} {(r.patients as any)?.last_name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{r.test_name}</td>
                  <td className="px-5 py-3.5"><Badge variant="outline">{r.test_category}</Badge></td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{r.report_date}</td>
                  <td className="px-5 py-3.5"><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setEditing(r);
                        setForm({
                          patient_id: r.patient_id, doctor_id: r.doctor_id || "",
                          test_name: r.test_name, test_category: r.test_category,
                          status: r.status, results: r.results || "",
                          normal_range: r.normal_range || "", remarks: r.remarks || "",
                          report_date: r.report_date,
                        });
                        setDialogOpen(true);
                      }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Report" : "New Lab Report"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate(editing ? { ...form, id: editing.id } : form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Patient</Label>
                <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Referring Doctor</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Test Name</Label><Input required value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Category</Label>
                <Select value={form.test_category} onValueChange={v => setForm({ ...form, test_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" required value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{reportStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Results</Label><Textarea value={form.results} onChange={e => setForm({ ...form, results: e.target.value })} /></div>
            <div className="space-y-2"><Label>Normal Range</Label><Input value={form.normal_range} onChange={e => setForm({ ...form, normal_range: e.target.value })} /></div>
            <div className="space-y-2"><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
            <DialogFooter><Button type="submit" disabled={upsertMutation.isPending}>{editing ? "Update" : "Create Report"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lab Report Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Report ID:</span> <strong>{viewing.report_id}</strong></div>
                <div><span className="text-muted-foreground">Patient:</span> {(viewing.patients as any)?.first_name} {(viewing.patients as any)?.last_name}</div>
                <div><span className="text-muted-foreground">Test:</span> {viewing.test_name}</div>
                <div><span className="text-muted-foreground">Category:</span> {viewing.test_category}</div>
                <div><span className="text-muted-foreground">Date:</span> {viewing.report_date}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant(viewing.status)}>{viewing.status}</Badge></div>
              </div>
              {viewing.results && <div><span className="text-muted-foreground">Results:</span><p className="mt-1 p-2 bg-muted rounded">{viewing.results}</p></div>}
              {viewing.normal_range && <div><span className="text-muted-foreground">Normal Range:</span> {viewing.normal_range}</div>}
              {viewing.remarks && <div><span className="text-muted-foreground">Remarks:</span> {viewing.remarks}</div>}
              {viewing.doctors && <div><span className="text-muted-foreground">Doctor:</span> Dr. {(viewing.doctors as any)?.first_name} {(viewing.doctors as any)?.last_name}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LabReports;
