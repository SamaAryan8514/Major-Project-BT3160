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
import { Search, Plus, Filter, Eye, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const statusVariant = (s: string) =>
  s === "Admitted" ? "default" : s === "Discharged" ? "secondary" : s === "Active" ? "outline" : "destructive";

const emptyPatient = {
  first_name: "", last_name: "", date_of_birth: "", gender: "Male" as string,
  blood_group: "" as string, phone: "", email: "", address: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  insurance_provider: "", insurance_id: "", allergies: "", medical_history: "",
  status: "Active" as string,
};

const Patients = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyPatient);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      if (data.id) {
        const { id, ...rest } = data;
        const { error } = await supabase.from("patients").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patients").insert({
          ...data,
          patient_id: "",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(editing ? "Patient updated" : "Patient added");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyPatient);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      first_name: p.first_name, last_name: p.last_name, date_of_birth: p.date_of_birth,
      gender: p.gender, blood_group: p.blood_group || "", phone: p.phone,
      email: p.email || "", address: p.address || "",
      emergency_contact_name: p.emergency_contact_name || "",
      emergency_contact_phone: p.emergency_contact_phone || "",
      insurance_provider: p.insurance_provider || "", insurance_id: p.insurance_id || "",
      allergies: p.allergies || "", medical_history: p.medical_history || "",
      status: p.status,
    });
    setDialogOpen(true);
  };

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.patient_id}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage patient records — {patients.length} total</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm(emptyPatient); setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Patient
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patients..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age/Gender</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blood</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No patients found</td></tr>
              ) : filtered.map(p => {
                const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000) : "-";
                return (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                        <span className="text-sm font-medium text-foreground">{p.first_name} {p.last_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.patient_id}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{age} / {p.gender?.[0]}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.phone}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.blood_group || "-"}</td>
                    <td className="px-5 py-3.5"><Badge variant={statusVariant(p.status)}>{p.status}</Badge></td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(p); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Patient" : "Add New Patient"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate(editing ? { ...form, id: editing.id } : form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" required value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></div>
              <div className="space-y-2"><Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Blood Group</Label>
                <Select value={form.blood_group} onValueChange={v => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Phone</Label><Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Admitted">Admitted</SelectItem><SelectItem value="Discharged">Discharged</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Emergency Contact</Label><Input value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Emergency Phone</Label><Input value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={e => setForm({ ...form, insurance_provider: e.target.value })} /></div>
              <div className="space-y-2"><Label>Insurance ID</Label><Input value={form.insurance_id} onChange={e => setForm({ ...form, insurance_id: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Allergies</Label><Textarea value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} /></div>
            <div className="space-y-2"><Label>Medical History</Label><Textarea value={form.medical_history} onChange={e => setForm({ ...form, medical_history: e.target.value })} /></div>
            <DialogFooter><Button type="submit" disabled={upsertMutation.isPending}>{editing ? "Update" : "Add Patient"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Patient Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Name:</span> <strong>{viewing.first_name} {viewing.last_name}</strong></div>
                <div><span className="text-muted-foreground">ID:</span> {viewing.patient_id}</div>
                <div><span className="text-muted-foreground">DOB:</span> {viewing.date_of_birth}</div>
                <div><span className="text-muted-foreground">Gender:</span> {viewing.gender}</div>
                <div><span className="text-muted-foreground">Blood Group:</span> {viewing.blood_group || "-"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {viewing.phone}</div>
                <div><span className="text-muted-foreground">Email:</span> {viewing.email || "-"}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant(viewing.status)}>{viewing.status}</Badge></div>
              </div>
              {viewing.address && <div><span className="text-muted-foreground">Address:</span> {viewing.address}</div>}
              {viewing.emergency_contact_name && <div><span className="text-muted-foreground">Emergency:</span> {viewing.emergency_contact_name} ({viewing.emergency_contact_phone})</div>}
              {viewing.insurance_provider && <div><span className="text-muted-foreground">Insurance:</span> {viewing.insurance_provider} — {viewing.insurance_id}</div>}
              {viewing.allergies && <div><span className="text-muted-foreground">Allergies:</span> {viewing.allergies}</div>}
              {viewing.medical_history && <div><span className="text-muted-foreground">Medical History:</span> {viewing.medical_history}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Patients;
