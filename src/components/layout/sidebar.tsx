"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Radio,
  FileText,
  Search,
  Settings,
  MessageSquare,
  LogOut,
  Brain,
  Zap,
} from "lucide-react"
import { signOut } from "next-auth/react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Sources", href: "/sources", icon: Radio },
  { name: "Content", href: "/content", icon: FileText },
  { name: "Analysis", href: "/analysis", icon: Brain },
  { name: "Search", href: "/search", icon: Search },
  { name: "Prompts", href: "/settings/prompts", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Sign Out", href: "#signout", icon: LogOut, isSignOut: true },
] as const

// Logo component with custom design
function Logo() {
  return (
    <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
      <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-card" />
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Enhanced Header */}
      <div className="flex h-20 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo />
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
              Disruption Intel
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              AI-Powered Insights
            </span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1.5 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && item.href !== "#signout" && pathname.startsWith(item.href))

          // Handle Sign Out specially
          if ('isSignOut' in item && item.isSignOut) {
            return (
              <button
                key={item.name}
                onClick={() => signOut()}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all w-full text-left",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </button>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
