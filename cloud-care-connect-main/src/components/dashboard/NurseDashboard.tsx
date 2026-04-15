import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Users, BedDouble, Clock, Heart, Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const NurseDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: patients = [] } = useQuery({
    queryKey: ["nurse-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients")
        .select("*, beds(bed_number, ward, floor)")
        .eq("status", "Admitted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: beds = [] } = useQuery({
    queryKey: ["beds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("beds").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["nurse-appointments"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("appointments")
        .select("*, patients(first_name, last_name)")
        .eq("appointment_date", today)
        .eq("status", "In Progress");
      if (error) throw error;
      return data;
    },
  });

  const { data: labReports = [] } = useQuery({
    queryKey: ["nurse-lab-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_reports")
        .select("*, patients(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const occupiedBeds = beds.filter(b => b.status === "Occupied").length;
  const criticalPatients = patients.filter(p => p.status === "Critical").length;
  const pendingLabs = labReports.filter(l => l.status === "Pending").length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Nurse Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, {profile?.full_name || 'Nurse'} · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Heart className="h-3 w-3" />
            Nurse
          </Badge>
        </div>
      </div>

      {/* Nurse Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/patients")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Patient Care</p>
              <p className="text-xs text-muted-foreground">Monitor patients</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/beds")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <BedDouble className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">Bed Management</p>
              <p className="text-xs text-muted-foreground">Assign beds</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/lab")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">Lab Results</p>
              <p className="text-xs text-muted-foreground">View test results</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/appointments")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">Active Appointments</p>
              <p className="text-xs text-muted-foreground">Assist with procedures</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Nurse Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Admitted Patients" value={patients.length.toString()} change="Under care" changeType="neutral" icon={Users} iconBg="bg-primary/10" iconColor="text-primary" />
        <StatCard title="Occupied Beds" value={occupiedBeds.toString()} change="Currently occupied" changeType="neutral" icon={BedDouble} iconBg="bg-accent/10" iconColor="text-accent" />
        <StatCard title="Critical Patients" value={criticalPatients.toString()} change="Require attention" changeType="negative" icon={AlertTriangle} iconBg="bg-destructive/10" iconColor="text-destructive" />
        <StatCard title="Pending Labs" value={pendingLabs.toString()} change="Awaiting results" changeType="neutral" icon={Activity} iconBg="bg-info/10" iconColor="text-info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Patients */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Current Patients</h3>
            <button onClick={() => navigate("/patients")} className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="divide-y divide-border">
            {patients.length === 0 ? (
              <p className="px-5 py-8 text-center text-muted-foreground text-sm">No admitted patients currently.</p>
            ) : patients.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                    p.status === "Critical" ? "bg-destructive/10 text-destructive" :
                    p.status === "Stable" ? "bg-success/10 text-success" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-muted-foreground">{p.beds && p.beds.length > 0 ? `Bed ${p.beds[0].bed_number} · ${p.beds[0].ward}` : 'No bed assigned'}</p>
                  </div>
                </div>
                <Badge variant={p.status === "Critical" ? "destructive" : "outline"} className="text-xs">
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active Appointments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Active Appointments</h3>
            <button onClick={() => navigate("/appointments")} className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-1 p-3">
            {appointments.length === 0 ? (
              <p className="px-2 py-8 text-center text-muted-foreground text-sm">No active appointments at the moment.</p>
            ) : appointments.slice(0, 5).map((apt) => (
              <div key={apt.id} className="flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center w-12">
                  <span className="text-xs font-semibold text-foreground">{apt.appointment_time?.slice(0, 5)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{apt.patients?.first_name} {apt.patients?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{apt.type}</p>
                </div>
                <Badge variant="default" className="text-xs">
                  In Progress
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default NurseDashboard;