import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Timeline from './pages/Timeline.jsx'
import Upload from './pages/Upload.jsx'
import CreateSummary from './pages/CreateSummary.jsx'
import SharedSummary from './pages/SharedSummary.jsx'
import Placeholder from './pages/Placeholder.jsx'

export default function App() {
  const { t } = useTranslation()
  return (
    <Routes>
      {/* Public routes — no login required */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/shared/:token" element={<SharedSummary />} />

      {/* Protected routes — require a logged-in user */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Timeline />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <Layout>
              <Upload />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/summaries/new"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateSummary />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <Placeholder title={t('placeholder.reportDetail')} />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family"
        element={
          <ProtectedRoute>
            <Layout>
              <Placeholder title={t('placeholder.family')} />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Placeholder title={t('placeholder.settingsTitle')} />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
