'use client'

import { IconBell, IconMenu2 } from '@tabler/icons-react'

interface TopbarAction {
  label: string
  onClick?: () => void
}

interface TopbarProps {
  title: string
  subtitle: string
  action?: TopbarAction
  onMobileMenuOpen?: () => void
}

export default function Topbar({ title, subtitle, action, onMobileMenuOpen }: TopbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 h-12 flex-shrink-0">
      {/* Left — hamburger (mobile only) + title + subtitle */}
      <div className="flex items-center gap-3">
        {onMobileMenuOpen && (
          <button
            type="button"
            aria-label="Open menu"
            onClick={onMobileMenuOpen}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex-shrink-0"
          >
            <IconMenu2 size={15} strokeWidth={1.75} />
          </button>
        )}
        <div className="flex flex-col justify-center">
        <h1 className="text-[15px] font-medium text-gray-900 dark:text-gray-100 leading-tight">
          {title}
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-px">
          {subtitle}
        </p>
        </div>
      </div>

      {/* Right — notification bell + optional action */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="flex items-center justify-center w-8 h-8 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <IconBell size={15} strokeWidth={1.75} />
        </button>

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
