import {
  Dumbbell,
  Flame,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Radio,
  Salad,
  Shield,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

const NAV = [
  { to: "/app", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/app/trainer", label: "AI Trainer", icon: Dumbbell },
  { to: "/app/performance", label: "Performance", icon: TrendingUp },
  { to: "/app/diet", label: "Dietician", icon: Salad },
  { to: "/app/chat", label: "Gym Buddy", icon: MessageCircle },
  { to: "/app/habits", label: "Habits", icon: Flame },
  { to: "/app/iot", label: "Smart Gym", icon: Radio },
  { to: "/app/reco", label: "Recommendations", icon: MapPin },
];

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
      isActive
        ? "bg-accent text-accent-ink"
        : "text-ink-3 hover:bg-surface-raised hover:text-ink"
    }`;

  const nav = (
    <nav className="space-y-1">
      {NAV.map(({ to, label, end, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={linkClass}
          onClick={() => setOpen(false)}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
      {user?.role === "admin" && (
        <NavLink to="/app/admin" className={linkClass} onClick={() => setOpen(false)}>
          <Shield className="h-4 w-4 shrink-0" aria-hidden />
          Admin
        </NavLink>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-hairline bg-canvas-deep p-4 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-accent" aria-hidden />
            <span className="display text-lg leading-none text-ink">Kinetiq</span>
          </div>
          <button
            className="p-1 text-ink-3 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {nav}
      </aside>

      {/* Backdrop for mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas/85 px-4 py-3 backdrop-blur">
          <button
            className="rounded-lg p-2 text-ink-3 transition hover:bg-surface-raised hover:text-ink md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-ink-4 sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-hairline px-3 py-1.5 font-medium text-ink-2 transition hover:border-hairline-strong hover:text-ink"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
