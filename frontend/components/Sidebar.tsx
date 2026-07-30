"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Dumbbell, BarChart2, Calendar, User, Sparkles, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkouts } from "@/hooks/useWorkouts";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { workouts } = useWorkouts();

  const NAV = [
    { href: "/",           icon: Home,     label: "Dashboard" },
    { href: "/treinos",    icon: Dumbbell, label: "Treinos",   badge: workouts.length > 0 ? String(workouts.length) : undefined },
    { href: "/calendario", icon: Calendar, label: "Histórico" },
    { href: "/progresso",  icon: BarChart2,label: "Evolução"  },
    { href: "/perfil",     icon: User,     label: "Perfil"    },
  ];

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  function handleLogout() {
    if (window.confirm("Tem certeza que deseja sair?")) logout();
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">F</div>
        <div className="sidebar-brand-name">FitAI</div>
      </div>

      {/* Nav */}
      <div className="side-section-label">Navegação</div>
      <div className="col gap-2">
        {NAV.map(({ href, icon: Icon, label, badge }) => {
          // "/" só fica ativo em match exato; as demais rotas ficam ativas
          // também em subpáginas (ex: /treinos/5 destaca "Treinos")
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`side-item${active ? " active" : ""}`}>
              <Icon size={18} />
              {label}
              {badge && <span className="badge">{badge}</span>}
            </Link>
          );
        })}
      </div>

      {/* Tools */}
      <div className="side-section-label">Ferramentas</div>
      <Link href="/ai-gen" className="side-item-cta">
        <Sparkles size={18} />
        Gerar treino com IA
      </Link>

      {/* User */}
      <div className="sidebar-bottom">
        <div className="side-user">
          <div className="avatar">{initials}</div>
          <div className="flex-1">
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
              {user?.name ?? "Usuário"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
              {user?.email ?? ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/perfil")}
            title="Configurações"
            aria-label="Configurações"
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}
          >
            <Settings size={16} color="var(--text-mute)" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            aria-label="Sair"
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}
          >
            <LogOut size={16} color="var(--text-mute)" />
          </button>
        </div>
      </div>
    </aside>
  );
}
