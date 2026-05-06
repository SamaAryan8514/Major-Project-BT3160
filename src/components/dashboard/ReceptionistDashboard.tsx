import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Users, CalendarDays, Clock, Phone, CheckCircle, AlertCircle } from "lucide-react";
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

const ReceptionistDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: appointments = [] } = useQuery({
    queryKey: ["receptionist-appointments"],
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

  const { data: patients = [] } = useQuery({
    queryKey: ["receptionist-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["upcoming-appointments"],
    queryFn: async (): Promise<AppointmentWithDetails[]> => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const { data, error } = await supabase.from("appointments")
        .select("*, patients(first_name, last_name), doctors(first_name, last_name)")
        .eq("appointment_date", tomorrowStr)
        .eq("status", "Scheduled")
        .order("appointment_time")
        .limit(5);
      if (error) throw error;
      return data as AppointmentWithDetails[];
    },
  });

  const { data: appointmentsOverview = [] } = useQuery({
    queryKey: ["receptionist-appointment-overview"],
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

  const appointmentStatusData = Object.entries(appointmentStatusCounts).map(([name, value]) => ({ name, value }));
  const chartColors = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9"];

  const weeklySchedule = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    const key = date.toISOString().split("T")[0];
    return {
      day: label,
      count: appointmentsOverview.filter((item) => item.appointment_date === key).length,
    };
  });

  const todayScheduled = appointments.filter(apt => apt.status === "Scheduled").length;
  const todayCompleted = appointments.filter(apt => apt.status === "Completed").length;
  const totalPatients = patients.length;
  const newPatientsToday = patients.filter(p => {
    const createdDate = new Date(p.created_at).toDateString();
    const today = new Date().toDateString();
    return createdDate === today;
  }).length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Reception Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, {profile?.full_name || 'Receptionist'} · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <Phone className="h-3 w-3" />
            Receptionist
          </Badge>
        </div>
      </div>

      {/* Receptionist Quick Actions */}
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
              <p className="font-medium text-foreground">Schedule Appointment</p>
              <p className="text-xs text-muted-foreground">Book new appointments</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/patients")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">Register Patient</p>
              <p className="text-xs text-muted-foreground">Add new patients</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/appointments")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">Check-in Patients</p>
              <p className="text-xs text-muted-foreground">Manage arrivals</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/billing")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">Billing Support</p>
              <p className="text-xs text-muted-foreground">Assist with payments</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Receptionist Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Today's Appointments" value={appointments.length.toString()} change={`${todayScheduled} scheduled`} changeType="neutral" icon={CalendarDays} iconBg="bg-primary/10" iconColor="text-primary" />
        <StatCard title="Completed Today" value={todayCompleted.toString()} change="Appointments done" changeType="positive" icon={CheckCircle} iconBg="bg-success/10" iconColor="text-success" />
        <StatCard title="Total Patients" value={totalPatients.toString()} change="Registered patients" changeType="neutral" icon={Users} iconBg="bg-accent/10" iconColor="text-accent" />
        <StatCard title="New Today" value={newPatientsToday.toString()} change="New registrations" changeType="positive" icon={AlertCircle} iconBg="bg-info/10" iconColor="text-info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Weekly Booking Trend</h3>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={weeklySchedule}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }} />
                <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Appointment Status</h3>
              <p className="text-sm text-muted-foreground">Daily distribution</p>
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
              <h3 className="font-display text-lg font-semibold text-foreground">Reception Summary</h3>
              <p className="text-sm text-muted-foreground">Front desk insights</p>
            </div>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>Tomorrow appointments</span>
              <span className="font-semibold text-foreground">{upcomingAppointments.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>New patients today</span>
              <span className="font-semibold text-foreground">{newPatientsToday}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>Completed bookings</span>
              <span className="font-semibold text-foreground">{todayCompleted}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Today's Appointments</h3>
            <button onClick={() => navigate("/appointments")} className="text-xs font-medium text-primary hover:underline">Manage All</button>
          </div>
          <div className="space-y-1 p-3">
            {appointments.length === 0 ? (
              <p className="px-2 py-8 text-center text-muted-foreground text-sm">No appointments scheduled for today.</p>
            ) : appointments.slice(0, 6).map((apt) => (
              <div key={apt.id} className={`flex items-center gap-4 rounded-lg px-3 py-3 transition-colors ${
                apt.status === "In Progress" ? "bg-primary/5 border border-primary/20" :
                apt.status === "Completed" ? "bg-success/5" : "hover:bg-muted/50"
              }`}>
                <div className="flex flex-col items-center w-12">
                  <span className="text-xs font-semibold text-foreground">{apt.appointment_time?.slice(0, 5)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{apt.patients?.first_name} {apt.patients?.last_name}</p>
                  <p className="text-xs text-muted-foreground">Dr. {apt.doctors?.first_name} {apt.doctors?.last_name} · {apt.type}</p>
                </div>
                <Badge variant={
                  apt.status === "Completed" ? "default" :
                  apt.status === "In Progress" ? "secondary" : "outline"
                } className="text-xs">
                  {apt.status}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tomorrow's Appointments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Tomorrow's Schedule</h3>
            <button onClick={() => navigate("/appointments")} className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-1 p-3">
            {upcomingAppointments.length === 0 ? (
              <p className="px-2 py-8 text-center text-muted-foreground text-sm">No appointments scheduled for tomorrow.</p>
            ) : upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center w-12">
                  <span className="text-xs font-semibold text-foreground">{apt.appointment_time?.slice(0, 5)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{apt.patients?.first_name} {apt.patients?.last_name}</p>
                  <p className="text-xs text-muted-foreground">Dr. {apt.doctors?.first_name} {apt.doctors?.last_name} · {apt.type}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Scheduled
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ReceptionistDashboard;