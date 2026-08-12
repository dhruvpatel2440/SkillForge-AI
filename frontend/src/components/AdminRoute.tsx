import { Navigate } from 'react-router-dom'
import { isAdminAuthenticated } from '../lib/adminApi'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isAdminAuthenticated()) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
