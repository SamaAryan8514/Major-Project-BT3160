import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Users, CalendarDays, BedDouble, TrendingUp, Stethoscope, FlaskConical, Shield, UserCheck, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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