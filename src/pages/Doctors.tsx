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
import { Search, Plus, Eye, Edit, Trash2, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const departments = ["Cardiology", "Neurology", "Orthopedics", "Oncology", "Pediatrics", "General", "Dermatology", "Radiology", "Emergency"];

const emptyDoctor = {
  first_name: "", last_name: "", specialization: "", department: departments[0],
  phone: "", email: "", qualification: "", experience_years: 0,
  consultation_fee: 0, availability: "Available" as string, bio: "",
};

const Doctors = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyDoctor);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      if (data.id) {
        const { id, ...rest } = data;
        const { error } = await supabase.from("doctors").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("doctors").insert({ ...data, doctor_id: "" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success(editing ? "Doctor updated" : "Doctor added");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doctors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["doctors"] }); toast.success("Doctor deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyDoctor); };
  const openEdit = (d: any) => {
    setEditing(d);
    setForm({
      first_name: d.first_name, last_name: d.last_name, specialization: d.specialization,
      department: d.department, phone: d.phone, email: d.email, qualification: d.qualification,
      experience_years: d.experience_years, consultation_fee: Number(d.consultation_fee),
      availability: d.availability, bio: d.bio || "",
    });
    setDialogOpen(true);
  };

  const filtered = doctors.filter(d =>
    `${d.first_name} ${d.last_name} ${d.specialization} ${d.department}`.toLowerCase().includes(search.toLowerCase())
  );

  const availabilityVariant = (s: string) => s === "Available" ? "default" : s === "Busy" ? "destructive" : "secondary";

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Doctors</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage doctor profiles — {doctors.length} registered</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm(emptyDoctor); setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Doctor
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="col-span-full">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search doctors..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {isLoading ? <p className="col-span-full text-center text-muted-foreground py-8">Loading...</p> :
         filtered.length === 0 ? <p className="col-span-full text-center text-muted-foreground py-8">No doctors found</p> :
         filtered.map(d => (
          <div key={d.id} className="glass-card rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Dr. {d.first_name} {d.last_name}</p>
                  <p className="text-xs text-muted-foreground">{d.doctor_id}</p>
                </div>
              </div>
              <Badge variant={availabilityVariant(d.availability)}>{d.availability}</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Dept:</strong> {d.department} · <strong>Spec:</strong> {d.specialization}</p>
              <p><strong>Qual:</strong> {d.qualification} · <strong>Exp:</strong> {d.experience_years} yrs</p>
              <p><strong>Fee:</strong> ${Number(d.consultation_fee).toFixed(2)}</p>
            </div>
            <div className="flex gap-1 mt-auto pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => { setViewing(d); setViewOpen(true); }}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Doctor" : "Add New Doctor"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate(editing ? { ...form, id: editing.id } : form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Specialization</Label><Input required value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} /></div>
              <div className="space-y-2"><Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Phone</Label><Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Qualification</Label><Input required value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} /></div>
              <div className="space-y-2"><Label>Experience (years)</Label><Input type="number" min={0} value={form.experience_years} onChange={e => setForm({ ...form, experience_years: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Consultation Fee ($)</Label><Input type="number" min={0} step="0.01" value={form.consultation_fee} onChange={e => setForm({ ...form, consultation_fee: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Availability</Label>
                <Select value={form.availability} onValueChange={v => setForm({ ...form, availability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Available">Available</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Busy">Busy</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
            <DialogFooter><Button type="submit" disabled={upsertMutation.isPending}>{editing ? "Update" : "Add Doctor"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Doctor Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Name:</span> <strong>Dr. {viewing.first_name} {viewing.last_name}</strong></div>
                <div><span className="text-muted-foreground">ID:</span> {viewing.doctor_id}</div>
                <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
                <div><span className="text-muted-foreground">Specialization:</span> {viewing.specialization}</div>
                <div><span className="text-muted-foreground">Qualification:</span> {viewing.qualification}</div>
                <div><span className="text-muted-foreground">Experience:</span> {viewing.experience_years} years</div>
                <div><span className="text-muted-foreground">Phone:</span> {viewing.phone}</div>
                <div><span className="text-muted-foreground">Email:</span> {viewing.email}</div>
                <div><span className="text-muted-foreground">Fee:</span> ${Number(viewing.consultation_fee).toFixed(2)}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={availabilityVariant(viewing.availability)}>{viewing.availability}</Badge></div>
              </div>
              {viewing.bio && <div><span className="text-muted-foreground">Bio:</span> {viewing.bio}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Doctors;
