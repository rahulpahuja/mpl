import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { CricketMotifs } from './components/CricketMotifs'
import { HelpButton } from './components/HelpButton'
import { ProfileSetupModal } from './components/ProfileSetupModal'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { JoinAuction } from './pages/JoinAuction'
import { AdminAuctions } from './pages/AdminAuctions'
import { AdminTeams } from './pages/AdminTeams'
import { AdminUsers } from './pages/AdminUsers'
import { AdminPlayers } from './pages/AdminPlayers'
import { BootstrapAdmin } from './pages/BootstrapAdmin'
import { Profile } from './pages/Profile'
import { AuctionSetup } from './pages/AuctionSetup'
import { AuctionManagerPanel } from './pages/AuctionManagerPanel'
import { TeamManagerBidding } from './pages/TeamManagerBidding'
import { ViewerFeed } from './pages/ViewerFeed'
import { Results } from './pages/Results'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CricketMotifs />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<JoinAuction />} />
          <Route path="/viewer/:auctionId" element={<ViewerFeed />} />
          <Route path="/results/:auctionId" element={<Results />} />
          <Route path="/bootstrap-admin" element={<BootstrapAdmin />} />
          <Route path="/profile" element={<Profile />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminAuctions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teams"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminTeams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/players"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminPlayers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/auctions/:auctionId/setup"
            element={
              <ProtectedRoute roles={['admin', 'auctionManager']}>
                <AuctionSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage/:auctionId"
            element={
              <ProtectedRoute roles={['admin', 'auctionManager']}>
                <AuctionManagerPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bid/:auctionId"
            element={
              <ProtectedRoute roles={['manager']}>
                <TeamManagerBidding />
              </ProtectedRoute>
            }
          />
        </Routes>
        <HelpButton />
        <ProfileSetupModal />
      </BrowserRouter>
    </AuthProvider>
  )
}
