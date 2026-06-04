const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  accepted:  'bg-blue-100 text-blue-700',
  pickup:    'bg-purple-100 text-purple-700',
  ontheway:  'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_DOTS = {
  pending:   'bg-yellow-400',
  accepted:  'bg-blue-400',
  pickup:    'bg-purple-400',
  ontheway:  'bg-orange-400 dot-ping',
  delivered: 'bg-green-400',
  cancelled: 'bg-red-400',
}

export default function StatusBadge({ status, label }) {
  return (
    <span className={`status-badge ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status] || 'bg-gray-400'}`} />
      {label}
    </span>
  )
}
