'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboardIcon,
  InboxIcon,
  BadgeCheckIcon,
  PackageIcon,
  HardHatIcon,
  ArchiveIcon,
  UsersIcon,
  LogOutIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Stage } from '@/types'

interface SidebarProps {
  stageCounts: Partial<Record<Stage, number>>
}

const NAV_BOARDS: { key: Stage; label: string; href: string; icon: React.ElementType }[] = [
  { key: 'enquiries', label: 'Enquiries', href: '/board/enquiries', icon: InboxIcon },
  { key: 'qualified_leads', label: 'Qualified Leads', href: '/board/qualified_leads', icon: BadgeCheckIcon },
  { key: 'order_processing', label: 'Order Processing', href: '/board/order_processing', icon: PackageIcon },
  { key: 'project_management', label: 'Project Management', href: '/board/project_management', icon: HardHatIcon },
  { key: 'archived', label: 'Archived', href: '/board/archived', icon: ArchiveIcon },
]

export default function Sidebar({ stageCounts }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className="flex-none flex flex-col h-screen overflow-y-auto"
      style={{
        width: '224px',
        backgroundColor: '#161A18',
        borderRight: '1px solid #252B28',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #252B28' }}>
        <p className="text-base font-bold text-white tracking-tight">KBB Collective</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: '#B89763' }}>CRM</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Dashboard */}
        <NavItem
          href="/dashboard"
          label="Dashboard"
          icon={LayoutDashboardIcon}
          active={isActive('/dashboard')}
        />

        {/* Divider */}
        <div className="pt-4 pb-2 px-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#3A403D' }}>
            Boards
          </p>
        </div>

        {/* Board items */}
        {NAV_BOARDS.map((board) => (
          <NavItem
            key={board.key}
            href={board.href}
            label={board.label}
            icon={board.icon}
            active={isActive(board.href)}
            count={stageCounts[board.key]}
          />
        ))}

        {/* Divider */}
        <div className="pt-4 pb-2 px-2">
          <div style={{ height: '1px', backgroundColor: '#252B28' }} />
        </div>

        {/* Install Calendar */}
        <NavItem
          href="/install-calendar"
          label="Install Calendar"
          icon={CalendarDaysIcon}
          active={isActive('/install-calendar')}
        />

        {/* To-Do */}
        <NavItem
          href="/todo"
          label="To-Do"
          icon={ClipboardListIcon}
          active={isActive('/todo')}
        />

        {/* Team */}
        <NavItem
          href="/team"
          label="Team"
          icon={UsersIcon}
          active={isActive('/team')}
        />
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #252B28' }}>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
          style={{ color: '#6B7280' }}
        >
          <LogOutIcon size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  count,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  count?: number
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors group"
      style={
        active
          ? { backgroundColor: '#B8976318', color: '#B89763' }
          : { color: '#9CA3AF' }
      }
    >
      <span className="flex items-center gap-2.5">
        <Icon size={15} />
        <span className="font-medium leading-none">{label}</span>
      </span>
      {count !== undefined && count > 0 && (
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded-full"
          style={
            active
              ? { backgroundColor: '#B8976330', color: '#B89763' }
              : { backgroundColor: '#252B28', color: '#6B7280' }
          }
        >
          {count}
        </span>
      )}
    </Link>
  )
}
