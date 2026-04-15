import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, BedDouble, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

type Bed = Database['public']['Tables']['beds']['Row'] & {
  patients?: {
    first_name: string;
    last_name: string;
    patient_id: string;
  } | null;
};

type Patient = Pick<Database['public']['Tables']['patients']['Row'], 'id' | 'first_name' | 'last_name' | 'patient_id'>;

type FormData = {
  bed_number: string;
  ward: string;
  floor: number;
  bed_type: string;
  status: string;
  daily_rate: number;
  patient_id: string | null;
  notes: string;
};

const bedTypes = ["General", "Semi-Private", "Private", "ICU", "Emergency"];
const bedStatuses = ["Available", "Occupied", "Maintenance", "Reserved"];
const wards = ["Ward A", "Ward B", "Ward C", "ICU", "Emergency", "Maternity", "Pediatrics"];

const emptyBed = {
  bed_number: "", ward: wards[0], floor: 1, bed_type: bedTypes[0],
  status: "Available", daily_rate: 0, patient_id: null as string | null, notes: "",
};

const Beds = () => {
  
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bed | null>(null);
  const [wardFilter, setWardFilter] = useState("all");
  const [form, setForm] = useState<FormData>(emptyBed);

  const { data: beds = [], isLoading } = useQuery({
    queryKey: ["beds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("beds").select("*, patients(first_name, last_name, patient_id)").order("bed_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("id, first_name, last_name, patient_id").eq("status", "Admitted");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: FormData & { id?: string }) => {
      const payload = { ...data, patient_id: data.patient_id || null };
      if (data.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("beds").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("beds").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      toast.success(editing ? "Bed updated" : "Bed added");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("beds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["beds"] }); toast.success("Bed removed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyBed); };

  const filtered = wardFilter === "all" ? beds : beds.filter(b => b.ward === wardFilter);
  const stats = {
    total: beds.length,
    available: beds.filter(b => b.status === "Available").length,
    occupied: beds.filter(b => b.status === "Occupied").length,
    maintenance: beds.filter(b => b.status === "Maintenance").length,
  };

  const statusColor = (s: string) =>
    s === "Available" ? "bg-success/15 border-success/30 text-success" :
    s === "Occupied" ? "bg-destructive/15 border-destructive/30 text-destructive" :
    s === "Reserved" ? "bg-warning/15 border-warning/30 text-warning" :
    "bg-muted border-border text-muted-foreground";

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Bed Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{stats.available} available / {stats.total} total beds</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm(emptyBed); setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Bed
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Beds", value: stats.total, color: "text-foreground" },
          { label: "Available", value: stats.available, color: "text-success" },
          { label: "Occupied", value: stats.occupied, color: "text-destructive" },
          { label: "Maintenance", value: stats.maintenance, color: "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={wardFilter} onValueChange={setWardFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by ward" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {wards.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {isLoading ? <p className="col-span-full text-center text-muted-foreground py-8">Loading...</p> :
         filtered.map(bed => (
          <div key={bed.id} className={`rounded-xl border p-3 text-center cursor-pointer transition-all hover:shadow-md ${statusColor(bed.status)}`}
            onClick={() => {
              setEditing(bed);
              setForm({
                bed_number: bed.bed_number, ward: bed.ward, floor: bed.floor,
                bed_type: bed.bed_type, status: bed.status, daily_rate: Number(bed.daily_rate),
                patient_id: bed.patient_id, notes: bed.notes || "",
              });
              setDialogOpen(true);
            }}>
            <BedDouble className="h-6 w-6 mx-auto mb-1 opacity-70" />
            <p className="text-sm font-bold">{bed.bed_number}</p>
            <p className="text-[10px] opacity-80">{bed.bed_type}</p>
            <p className="text-[10px] opacity-60">{bed.ward}</p>
            {bed.patients && <p className="text-[10px] mt-1 font-medium">{bed.patients.first_name} {bed.patients.last_name}</p>}
          </div>
        ))}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Bed" : "Add New Bed"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate(editing ? { ...form, id: editing.id } : form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Bed Number</Label><Input required value={form.bed_number} onChange={e => setForm({ ...form, bed_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>Ward</Label>
                <Select value={form.ward} onValueChange={v => setForm({ ...form, ward: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{wards.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Floor</Label><Input type="number" min={1} value={form.floor} onChange={e => setForm({ ...form, floor: parseInt(e.target.value) || 1 })} /></div>
              <div className="space-y-2"><Label>Bed Type</Label>
                <Select value={form.bed_type} onValueChange={v => setForm({ ...form, bed_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{bedTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{bedStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Daily Rate ($)</Label><Input type="number" min={0} step="0.01" value={form.daily_rate} onChange={e => setForm({ ...form, daily_rate: parseFloat(e.target.value) || 0 })} /></div>
              {form.status === "Occupied" && (
                <div className="col-span-2 space-y-2"><Label>Assigned Patient</Label>
                  <Select value={form.patient_id || ""} onValueChange={v => setForm({ ...form, patient_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between">
              {editing && <Button type="button" variant="destructive" onClick={() => { deleteMutation.mutate(editing.id); closeDialog(); }}>Delete</Button>}
              <Button type="submit" disabled={upsertMutation.isPending}>{editing ? "Update" : "Add Bed"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Beds;
