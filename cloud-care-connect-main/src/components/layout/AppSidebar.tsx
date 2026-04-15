import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, CalendarDays, BedDouble, Stethoscope,
  FlaskConical, CreditCard, LogOut, Pill, Bell, FileText, UserCheck,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/appointments", icon: CalendarDays, label: "Appointments" },
  { to: "/doctors", icon: Stethoscope, label: "Doctors" },
  { to: "/beds", icon: BedDouble, label: "Bed Management" },
  { to: "/lab", icon: FlaskConical, label: "Lab Reports" },
  { to: "/prescriptions", icon: Pill, label: "Prescriptions" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/medical-records", icon: FileText, label: "Medical Records" },
  { to: "/user-management", icon: UserCheck, label: "User Management", adminOnly: true },
  { to: "/billing", icon: CreditCard, label: "Billing" },
];

const AppSidebar = () => {
  const location = useLocation();
  const { user, signOut, isAdmin } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Stethoscope className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-sidebar-primary-foreground">Medicloud</h1>
          <p className="text-[11px] text-sidebar-muted">Hospital Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-accent-foreground">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.user_metadata?.full_name || user?.email}</p>
            <p className="text-[11px] text-sidebar-muted truncate">{user?.email}</p>
          </div>
          <button onClick={signOut} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
