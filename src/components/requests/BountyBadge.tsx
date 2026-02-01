'use client'

interface BountyBadgeProps {
  amount: number
  currency?: string
  size?: 'sm' | 'md' | 'lg'
  showCurrency?: boolean
}

export function BountyBadge({
  amount,
  currency = 'USDC',
  size = 'md',
  showCurrency = true,
}: BountyBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const formatAmount = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`
  }

  if (amount === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 font-medium ${sizeClasses[size]}`}
      >
        No Bounty
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 font-semibold ${sizeClasses[size]}`}
    >
      <svg
        className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z"
          clipRule="evenodd"
        />
      </svg>
      {formatAmount(amount)}
      {showCurrency && <span className="text-green-600">{currency}</span>}
    </span>
  )
}
