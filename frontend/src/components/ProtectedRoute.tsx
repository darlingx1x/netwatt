import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/auth'

export function ProtectedRoute({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, accessToken, me } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (accessToken && !user) {
      void me()
    }
  }, [accessToken, user, me])

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (adminOnly && user && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
