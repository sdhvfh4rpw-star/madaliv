import { ChevronLeft } from 'lucide-react'

export default function TopBar({ title, onBack, children }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 safe-top">
      <div className="flex items-center h-14 px-4 gap-3">
        {onBack && (
          <button onClick={onBack} className="p-1 -ml-1 text-gray-500 hover:text-gray-800 transition">
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="flex-1 font-bold text-base text-gray-900 truncate">{title}</h1>
        {children}
      </div>
    </header>
  )
}
