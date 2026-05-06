import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Users, CalendarDays, Pill, FileText, Stethoscope, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

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

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: appointments = [] } = useQuery({
    queryKey: ["doctor-appointments"],
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

  const { data: appointmentsOverview = [] } = useQuery({
    queryKey: ["doctor-appointment-overview"],
    queryFn: async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const fromDate = weekStart.toISOString().split("T")[0];
      const { data, error } = await supabase.from("appointments")
        .select("appointment_date, status")
        .gte("appointment_date", fromDate)
        .order("appointment_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const appointmentStatusCounts: Record<string, number> = appointmentsOverview.reduce((acc, appointment) => {
    const status = appointment.status || "Unknown";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartColors = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9"];
  const appointmentStatusData = Object.entries(appointmentStatusCounts).map(([name, value]) => ({ name, value }));

  const weeklyAppointments = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    const key = date.toISOString().split("T")[0];
    return {
      day: label,
      count: appointmentsOverview.filter((item) => item.appointment_date === key).length,
    };
  });

  const { data: recentPatients = [] } = useQuery({
    queryKey: ["doctor-recent-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const todayAppointments = appointments.filter(apt => apt.status !== "Completed");
  const completedToday = appointments.filter(apt => apt.status === "Completed").length;
  const activePatients = recentPatients.filter(p => p.status === "Admitted").length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Doctor Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, Dr. {profile?.full_name || 'Doctor'} · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Badge variant="default" className="flex items-center gap-2">
            <Stethoscope className="h-3 w-3" />
            Doctor
          </Badge>
        </div>
      </div>

      {/* Doctor Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/appointments")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Today's Schedule</p>
              <p className="text-xs text-muted-foreground">View appointments</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/prescriptions")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Pill className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">Prescribe Medication</p>
              <p className="text-xs text-muted-foreground">Create prescriptions</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/patients")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">Patient Records</p>
              <p className="text-xs text-muted-foreground">View patient history</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/medical-records")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">Medical Records</p>
              <p className="text-xs text-muted-foreground">Upload documents</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Doctor Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Today's Appointments" value={todayAppointments.length.toString()} change={`${appointments.filter((a) => a.status === "Scheduled").length} scheduled`} changeType="neutral" icon={CalendarDays} iconBg="bg-primary/10" iconColor="text-primary" />
        <StatCard title="Completed Today" value={completedToday.toString()} change="Appointments done" changeType="positive" icon={CheckCircle} iconBg="bg-success/10" iconColor="text-success" />
        <StatCard title="Active Patients" value={activePatients.toString()} change="Currently admitted" changeType="neutral" icon={Users} iconBg="bg-accent/10" iconColor="text-accent" />
        <StatCard title="Total Patients" value={recentPatients.length.toString()} change="Under care" changeType="neutral" icon={Users} iconBg="bg-info/10" iconColor="text-info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Weekly Appointments</h3>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={weeklyAppointments}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }} />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Appointment Status</h3>
              <p className="text-sm text-muted-foreground">Today's distribution</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={appointmentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card rounded-3xl p-5 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-border/60">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Quick Doctor Summary</h3>
              <p className="text-sm text-muted-foreground">Your daily performance</p>
            </div>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>Average appointments/day</span>
              <span className="font-semibold text-foreground">{Math.round(weeklyAppointments.reduce((sum, item) => sum + item.count, 0) / 7)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>Patients seen today</span>
              <span className="font-semibold text-foreground">{todayAppointments.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>Next available slot</span>
              <span className="font-semibold text-foreground">{appointments.filter((a) => a.status === "Scheduled")[0]?.appointment_time?.slice(0, 5) || "None"}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Today's Appointments</h3>
            <button onClick={() => navigate("/appointments")} className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-1 p-3">
            {todayAppointments.length === 0 ? (
              <p className="px-2 py-8 text-center text-muted-foreground text-sm">No appointments scheduled for today.</p>
            ) : todayAppointments.slice(0, 5).map((apt) => (
              <div key={apt.id} className={`flex items-center gap-4 rounded-lg px-3 py-3 transition-colors ${apt.status === "In Progress" ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"}`}>
                <div className="flex flex-col items-center w-12">
                  <span className="text-xs font-semibold text-foreground">{apt.appointment_time?.slice(0, 5)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{apt.patients?.first_name} {apt.patients?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{apt.type}</p>
                </div>
                <Badge variant={apt.status === "In Progress" ? "default" : "outline"} className="text-xs">
                  {apt.status}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Patients */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Recent Patients</h3>
            <button onClick={() => navigate("/patients")} className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="divide-y divide-border">
            {recentPatients.length === 0 ? (
              <p className="px-5 py-8 text-center text-muted-foreground text-sm">No patients yet.</p>
            ) : recentPatients.slice(0, 5).map(p => (
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
                <Badge variant={p.status === "Admitted" ? "default" : "outline"} className="text-xs">{p.status}</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;