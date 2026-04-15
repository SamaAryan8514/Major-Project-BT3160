import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Users, CalendarDays, BedDouble, TrendingUp, Stethoscope, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import DoctorDashboard from "@/components/dashboard/DoctorDashboard";
import NurseDashboard from "@/components/dashboard/NurseDashboard";
import ReceptionistDashboard from "@/components/dashboard/ReceptionistDashboard";

type AppointmentWithDetails = Database['public']['Tables']['appointments']['Row'] & {
  patients: {
    first_name: string;
    last_name: string;
  } | null;
  doctors: {
    first_name: string;
    last_name: string;
  } | null;
};

const Index = () => {
  const { hasRole, isAdmin, isHospitalStaff } = useAuth();

  // Render role-specific dashboards
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (hasRole('doctor')) {
    return <DoctorDashboard />;
  }

  if (hasRole('nurse')) {
    return <NurseDashboard />;
  }

  if (hasRole('receptionist')) {
    return <ReceptionistDashboard />;
  }

  // Fallback dashboard for users without specific roles or loading state
  const navigate = useNavigate();

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments-today"],
    queryFn: async (): Promise<AppointmentWithDetails[]> => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("appointments")
        .select("*, patients(first_name, last_name), doctors(first_name, last_name)")
        .eq("appointment_date", today)
        .order("appointment_time");
      if (error) throw error;
      return data as AppointmentWithDetails[];
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("*");
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

  const { data: billing = [] } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billing").select("total, payment_status");
      if (error) throw error;
      return data;
    },
  });

  const availableBeds = beds.filter(b => b.status === "Available").length;
  const totalBeds = beds.length;
  const revenue = billing.filter(b => b.payment_status === "Paid").reduce((s, b) => s + Number(b.total), 0);
  const recentPatients = patients.slice(0, 5);

  const statusVariant = (s: string) =>
    s === "Admitted" ? "default" : s === "Active" ? "outline" : "secondary";

  const statusColor = (s: string) =>
    s === "Completed" ? "bg-success" : s === "In Progress" ? "bg-warning" : "bg-muted-foreground/30";

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Hospital overview · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard title="Patients" value={patients.length.toString()} change={`${patients.filter(p => p.status === "Admitted").length} admitted`} changeType="neutral" icon={Users} iconBg="bg-primary/10" iconColor="text-primary" />
        <StatCard title="Today's Appts" value={appointments.length.toString()} change={`${appointments.filter((a) => a.status === "Scheduled").length} remaining`} changeType="neutral" icon={CalendarDays} iconBg="bg-info/10" iconColor="text-info" />
        <StatCard title="Doctors" value={doctors.length.toString()} change={`${doctors.filter(d => d.availability === "Available").length} available`} changeType="neutral" icon={Stethoscope} iconBg="bg-accent/10" iconColor="text-accent" />
        <StatCard title="Beds" value={`${availableBeds}/${totalBeds}`} change={totalBeds > 0 ? `${Math.round((1 - availableBeds / totalBeds) * 100)}% occupancy` : "No beds"} changeType="neutral" icon={BedDouble} iconBg="bg-warning/10" iconColor="text-warning" />
        <StatCard title="Lab Reports" value="-" change="View reports" changeType="neutral" icon={FlaskConical} iconBg="bg-secondary" iconColor="text-secondary-foreground" />
        <StatCard title="Revenue" value={`$${(revenue / 1000).toFixed(1)}K`} change="Paid invoices" changeType="positive" icon={TrendingUp} iconBg="bg-success/10" iconColor="text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Recent Patients</h3>
            <button onClick={() => navigate("/patients")} className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="divide-y divide-border">
            {recentPatients.length === 0 ? (
              <p className="px-5 py-8 text-center text-muted-foreground text-sm">No patients yet. Add your first patient.</p>
            ) : recentPatients.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-muted-foreground">{p.patient_id}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Today's Appointments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Today's Appointments</h3>
            <button onClick={() => navigate("/appointments")} className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-1 p-3">
            {appointments.length === 0 ? (
              <p className="px-2 py-8 text-center text-muted-foreground text-sm">No appointments today.</p>
            ) : appointments.map((apt) => (
              <div key={apt.id} className={`flex items-center gap-4 rounded-lg px-3 py-3 transition-colors ${apt.status === "In Progress" ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"}`}>
                <div className="flex flex-col items-center w-12">
                  <span className="text-xs font-semibold text-foreground">{apt.appointment_time?.slice(0, 5)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{apt.patients?.first_name} {apt.patients?.last_name}</p>
                  <p className="text-xs text-muted-foreground">Dr. {apt.doctors?.first_name} {apt.doctors?.last_name} · {apt.type}</p>
                </div>
                <div className={`h-2 w-2 rounded-full ${statusColor(apt.status)}`} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
