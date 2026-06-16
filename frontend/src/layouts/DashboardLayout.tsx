import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

const NAV = [
  { to: "/app", label: "Dashboard", end: true },
  { to: "/app/trainer", label: "AI Trainer" },
  { to: "/app/performance", label: "Performance" },
  { to: "/app/diet", label: "Dietician" },
  { to: "/app/chat", label: "Gym Buddy" },
  { to: "/app/habits", label: "Habits" },
  { to: "/app/iot", label: "Smart Gym" },
  { to: "/app/reco", label: "Recommendations" },
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
    `block rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-brand text-white"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  const nav = (
    <nav className="space-y-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={linkClass}
          onClick={() => setOpen(false)}
        >
          {item.label}
        </NavLink>
      ))}
      {user?.role === "admin" && (
        <NavLink to="/app/admin" className={linkClass} onClick={() => setOpen(false)}>
          Admin
        </NavLink>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white p-4 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 px-2 text-lg font-bold text-brand-dark">
          🏋️ Gym AI
        </div>
        {nav}
      </aside>

      {/* Backdrop for mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <button
            className="rounded p-2 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
