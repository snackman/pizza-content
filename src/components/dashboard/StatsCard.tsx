'use client'

interface StatsCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
  className = '',
}: StatsCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
          {trend && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span>{trend.value}%</span>
            </p>
          )}
        </div>
        <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
          {icon}
        </div>
      </div>
    </div>
  )
}
