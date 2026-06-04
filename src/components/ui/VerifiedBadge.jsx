import { ShieldCheck } from 'lucide-react'

/**
 * Badge "Livreur vérifié" — affiché sur le profil une fois validé par l'admin.
 * size: 'sm' | 'md' | 'lg'
 * showLabel: affiche le texte à côté de l'icône
 */
export default function VerifiedBadge({ size = 'md', showLabel = false, className = '' }) {
  const sizes = {
    sm: { icon: 12, px: 'px-1.5 py-0.5', text: 'text-[10px]', gap: 'gap-1' },
    md: { icon: 14, px: 'px-2 py-1',     text: 'text-xs',      gap: 'gap-1.5' },
    lg: { icon: 16, px: 'px-3 py-1.5',   text: 'text-sm',      gap: 'gap-2' },
  }
  const s = sizes[size]

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.px} rounded-full
        bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-sm ${className}`}
    >
      <ShieldCheck size={s.icon} strokeWidth={2.5} />
      {showLabel && <span className={s.text}>Livreur vérifié</span>}
    </span>
  )
}
