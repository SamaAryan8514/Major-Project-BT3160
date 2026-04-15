import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Clock, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const types = ["Consultation", "Follow-up", "Checkup", "Surgery", "Lab Review", "Emergency"];
const statuses = ["Scheduled", "Completed", "Cancelled", "No Show", "In Progress"];

const Appointments = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({
    patient_id: "", doctor_id: "", appointment_date: dateFilter,
    appointment_time: "09:00", duration_minutes: 30, type: "Consultation", status: "Scheduled", notes: "",
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments")
        .select("*, patients(first_name, last_name, patient_id), doctors(first_name, last_name, doctor_id)")
        .eq("appointment_date", dateFilter)
        .order("appointment_time", { ascending: true });
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
      const { data, error } = await supabase.from("doctors").select("id, first_name, last_name, doctor_id");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const { id, ...rest } = data;
        const { error } = await supabase.from("appointments").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert({ ...data, appointment_id: "" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(editing ? "Appointment updated" : "Appointment scheduled");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false); setEditing(null);
    setForm({ patient_id: "", doctor_id: "", appointment_date: dateFilter, appointment_time: "09:00", duration_minutes: 30, type: "Consultation", status: "Scheduled", notes: "" });
  };

  const statusColor = (s: string) =>
    s === "Completed" ? "bg-success/10 text-success" : s === "In Progress" ? "bg-warning/10 text-warning" :
    s === "Cancelled" || s === "No Show" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">{appointments.length} appointments for selected date</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-auto" />
          <Button className="gap-2" onClick={() => { setForm({ ...form, appointment_date: dateFilter }); setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> New Appointment
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        {isLoading ? <p className="text-center text-muted-foreground py-8">Loading...</p> :
         appointments.length === 0 ? <p className="text-center text-muted-foreground py-8">No appointments for this date</p> :
         appointments.map((apt: any) => (
          <div key={apt.id} className={`glass-card rounded-xl p-4 flex items-center gap-5 ${apt.status === "In Progress" ? "ring-2 ring-primary/30" : ""}`}>
            <div className="flex flex-col items-center justify-center w-16 shrink-0">
              <Clock className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-sm font-bold font-display text-foreground">{apt.appointment_time?.slice(0, 5)}</span>
              <span className="text-[10px] text-muted-foreground">{apt.duration_minutes} min</span>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {apt.patients?.first_name} {apt.patients?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Dr. {apt.doctors?.first_name} {apt.doctors?.last_name} · {apt.type}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(apt.status)}`}>
              {apt.status}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                setEditing(apt);
                setForm({
                  patient_id: apt.patient_id, doctor_id: apt.doctor_id,
                  appointment_date: apt.appointment_date, appointment_time: apt.appointment_time,
                  duration_minutes: apt.duration_minutes, type: apt.type, status: apt.status, notes: apt.notes || "",
                });
                setDialogOpen(true);
              }}><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(apt.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Appointment" : "Schedule Appointment"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate(editing ? { ...form, id: editing.id } : form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Patient</Label>
                <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_id})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Doctor</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" required value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" required value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} /></div>
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min={10} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })} /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {editing && (
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <DialogFooter><Button type="submit" disabled={upsertMutation.isPending}>{editing ? "Update" : "Schedule"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Appointments;
