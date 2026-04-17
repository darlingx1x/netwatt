import { Routes, Route, BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ScenariosPage from '@/pages/ScenariosPage'
import CatalogPage from '@/pages/CatalogPage'
import WizardPage from '@/pages/WizardPage'
import ScenarioResultPage from '@/pages/ScenarioResultPage'
import AdminUsersPage from '@/pages/AdminUsersPage'
import AdminEquipmentPage from '@/pages/AdminEquipmentPage'
import AdminAuditPage from '@/pages/AdminAuditPage'
import AdminSessionsPage from '@/pages/AdminSessionsPage'
import CompareScenariosPage from '@/pages/CompareScenariosPage'
import AboutPage from '@/pages/AboutPage'

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/scenarios/new" element={<WizardPage />} />
            <Route path="/scenarios/compare" element={<CompareScenariosPage />} />
            <Route path="/scenarios/:id" element={<ScenarioResultPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipment"
              element={
                <ProtectedRoute adminOnly>
                  <AdminEquipmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute adminOnly>
                  <AdminAuditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sessions"
              element={
                <ProtectedRoute adminOnly>
                  <AdminSessionsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/about" element={<AboutPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
