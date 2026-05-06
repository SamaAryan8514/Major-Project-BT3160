import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import {
  Users,
  CalendarDays,
  BedDouble,
  TrendingUp,
  Stethoscope,
  FlaskConical,
  Shield,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*");
      if (error) throw error;
      return data;
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

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments-today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("appointments")
        .select("*, patients(first_name, last_name), doctors(first_name, last_name)")
        .eq("appointment_date", today);
      if (error) throw error;
      return data;
    },
  });

  const { data: appointmentsOverview = [] } = useQuery({
    queryKey: ["appointments-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments")
        .select("appointment_date, status")
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const appointmentStatusCounts: Record<string, number> = appointmentsOverview.reduce((acc, appointment) => {
    const status = appointment.status || "Unknown";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const today = new Date();
  const weeklyAppointments = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
    const dayKey = date.toISOString().split("T")[0];
    const count = appointmentsOverview.filter((appointment) => appointment.appointment_date === dayKey).length;
    return { day: dayLabel, count };
  });

  const appointmentStatusData = Object.entries(appointmentStatusCounts).map(([status, value]) => ({ name: status, value }));

  const statusColors: Record<string, string> = {
    Scheduled: "#4f46e5",
    Completed: "#22c55e",
    Cancelled: "#ef4444",
    "In Progress": "#f59e0b",
    Unknown: "#64748b",
  };

  const chartColors = ["#4f46e5", "#22c55e", "#ef4444", "#f59e0b", "#0ea5e9", "#8b5cf6"];

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

  const { data: users = [] } = useQuery({
    queryKey: ["users-count"],
    queryFn: async () => {
      // Get users from profiles table instead of admin API
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const availableBeds = beds.filter(b => b.status === "Available").length;
  const totalBeds = beds.length;
  const revenue = billing.filter(b => b.payment_status === "Paid").reduce((s, b) => s + Number(b.total), 0);
  const pendingPayments = billing.filter(b => b.payment_status === "Pending").length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, {profile?.full_name || 'Administrator'} · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Badge variant="destructive" className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Administrator
          </Badge>
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/user-management")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Manage Users</p>
              <p className="text-xs text-muted-foreground">Add staff & assign roles</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/doctors")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">Staff Directory</p>
              <p className="text-xs text-muted-foreground">View all hospital staff</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/billing")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">Financial Reports</p>
              <p className="text-xs text-muted-foreground">Revenue & billing overview</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate("/beds")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <BedDouble className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">Bed Management</p>
              <p className="text-xs text-muted-foreground">Monitor bed occupancy</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Admin Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Users" value={users.length.toString()} change={`${doctors.length} staff members`} changeType="neutral" icon={Users} iconBg="bg-primary/10" iconColor="text-primary" />
        <StatCard title="Today's Appts" value={appointments.length.toString()} change={`${appointments.filter((a) => a.status === "Scheduled").length} scheduled`} changeType="neutral" icon={CalendarDays} iconBg="bg-info/10" iconColor="text-info" />
        <StatCard title="Active Patients" value={patients.filter(p => p.status === "Admitted").length.toString()} change="Currently admitted" changeType="neutral" icon={Users} iconBg="bg-accent/10" iconColor="text-accent" />
        <StatCard title="Bed Occupancy" value={`${availableBeds}/${totalBeds}`} change={`${totalBeds > 0 ? Math.round((1 - availableBeds / totalBeds) * 100) : 0}% occupied`} changeType="neutral" icon={BedDouble} iconBg="bg-warning/10" iconColor="text-warning" />
        <StatCard title="Pending Bills" value={pendingPayments.toString()} change="Awaiting payment" changeType="negative" icon={CreditCard} iconBg="bg-destructive/10" iconColor="text-destructive" />
        <StatCard title="Monthly Revenue" value={`$${(revenue / 1000).toFixed(1)}K`} change="This month" changeType="positive" icon={TrendingUp} iconBg="bg-success/10" iconColor="text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Weekly Appointment Trend</h3>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          <div className="h-60">
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
              <h3 className="font-display text-lg font-semibold text-foreground">Status Distribution</h3>
              <p className="text-sm text-muted-foreground">Appointment breakdown</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={appointmentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={entry.name} fill={statusColors[entry.name] || chartColors[index % chartColors.length]} />
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
              <h3 className="font-display text-lg font-semibold text-foreground">Quick Summary</h3>
              <p className="text-sm text-muted-foreground">Your hospital at a glance</p>
            </div>
            <Badge variant="secondary" className="uppercase tracking-[0.3em] text-[10px]">Live</Badge>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>Average daily bookings</span>
              <span className="font-semibold text-foreground">{Math.max(...weeklyAppointments.map((item) => item.count), 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>Open bed ratio</span>
              <span className="font-semibold text-foreground">{totalBeds > 0 ? `${Math.round((availableBeds / totalBeds) * 100)}%` : "N/A"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 p-4 shadow-sm">
              <span>Paid invoices</span>
              <span className="font-semibold text-foreground">{billing.filter(b => b.payment_status === "Paid").length}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">System Overview</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Patients</span>
              <span className="font-medium">{patients.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Doctors</span>
              <span className="font-medium">{doctors.filter(d => d.availability === "Available").length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Beds</span>
              <span className="font-medium">{availableBeds}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Today's Appointments</span>
              <span className="font-medium">{appointments.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display font-semibold text-foreground">Recent Activity</h3>
            <button onClick={() => navigate("/notifications")} className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                <div>
                  <p className="text-sm font-medium">New patient registered</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-accent mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Appointment completed</p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-warning mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Bed occupancy alert</p>
                  <p className="text-xs text-muted-foreground">6 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;