"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Dumbbell, BarChart2, Calendar, User, Sparkles, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkouts } from "@/hooks/useWorkouts";

const truncateStyle = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { workouts } = useWorkouts();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o menu mobile automaticamente ao navegar para outra rota — ajusta
  // durante o render (padrão recomendado pelo React) em vez de useEffect
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

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
  const displayName = user?.name || user?.email?.split("@")[0] || "Usuário";
  const displayEmail = user?.email ?? "";

  function handleLogout() {
    if (window.confirm("Tem certeza que deseja sair?")) logout();
  }

  return (
    <>
      {/* Botão hambúrguer — só visível em telas estreitas (ver globals.css) */}
      <button
        type="button"
        className="hamburger-btn"
        onClick={() => setMobileOpen(o => !o)}
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay atrás do menu aberto no mobile — clicar fecha */}
      <div
        className={`sidebar-backdrop${mobileOpen ? " visible" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
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
            <div title={displayName} style={{ ...truncateStyle, fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
              {displayName}
            </div>
            <div title={displayEmail} style={{ ...truncateStyle, fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
              {displayEmail}
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/perfil")}
            title="Configurações"
            aria-label="Configurações"
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, flexShrink: 0 }}
          >
            <Settings size={16} color="var(--text-mute)" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            aria-label="Sair"
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, flexShrink: 0 }}
          >
            <LogOut size={16} color="var(--text-mute)" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
