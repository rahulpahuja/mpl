import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { CricketMotifs } from './components/CricketMotifs'
import { ProfileSetupModal } from './components/ProfileSetupModal'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { Login } from './pages/Login'

// Every route below is role- or flow-specific — a Team Manager never needs the
// Admin dashboard's code, a Viewer never needs the bidding page, etc. Lazy
// splitting them means a visit only downloads the JS its role actually uses,
// instead of every page in the app bundled into one chunk on every load. Only
// Home and Login stay eager since virtually every visit hits one of them first.
const JoinAuction = lazy(() => import('./pages/JoinAuction').then((m) => ({ default: m.JoinAuction })))
const AdminAuctions = lazy(() => import('./pages/AdminAuctions').then((m) => ({ default: m.AdminAuctions })))
const AdminTeams = lazy(() => import('./pages/AdminTeams').then((m) => ({ default: m.AdminTeams })))
const AdminVenues = lazy(() => import('./pages/AdminVenues').then((m) => ({ default: m.AdminVenues })))
const AdminUsers = lazy(() => import('./pages/AdminUsers').then((m) => ({ default: m.AdminUsers })))
const AdminPlayers = lazy(() => import('./pages/AdminPlayers').then((m) => ({ default: m.AdminPlayers })))
const BootstrapAdmin = lazy(() => import('./pages/BootstrapAdmin').then((m) => ({ default: m.BootstrapAdmin })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const AuctionSetup = lazy(() => import('./pages/AuctionSetup').then((m) => ({ default: m.AuctionSetup })))
const AuctionManagerPanel = lazy(() =>
  import('./pages/AuctionManagerPanel').then((m) => ({ default: m.AuctionManagerPanel })),
)
const TeamManagerBidding = lazy(() =>
  import('./pages/TeamManagerBidding').then((m) => ({ default: m.TeamManagerBidding })),
)
const ViewerFeed = lazy(() => import('./pages/ViewerFeed').then((m) => ({ default: m.ViewerFeed })))
const Results = lazy(() => import('./pages/Results').then((m) => ({ default: m.Results })))
const Docs = lazy(() => import('./pages/Docs').then((m) => ({ default: m.Docs })))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CricketMotifs />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/join" element={<JoinAuction />} />
            <Route path="/viewer/:auctionId" element={<ViewerFeed />} />
            <Route path="/results/:auctionId" element={<Results />} />
            <Route path="/bootstrap-admin" element={<BootstrapAdmin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/docs/:sectionId?" element={<Docs />} />

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
                <ProtectedRoute roles={['admin', 'auctionManager']}>
                  <AdminTeams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/venues"
              element={
                <ProtectedRoute roles={['admin', 'auctionManager']}>
                  <AdminVenues />
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
        </Suspense>
        <ProfileSetupModal />
      </BrowserRouter>
    </AuthProvider>
  )
}
