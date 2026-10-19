// Routes de l'appli web. Adresses identiques à l'appli mobile (/match/12, /user/3…) : les liens des notifications marchent partout.
import { lazy, ReactNode, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './lib/auth';
import { useBadgePolling } from './lib/badge';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { AppShell } from './ui/Layout';
import { Loading } from './ui/ui';
import Forgot from './pages/auth/Forgot';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Welcome from './pages/auth/Welcome';
import Verify from './pages/auth/Verify';
const Matches = lazy(() => import('./pages/Matches'));
const MatchDetail = lazy(() => import('./pages/MatchDetail'));
const Create = lazy(() => import('./pages/Create'));
const VenueNew = lazy(() => import('./pages/VenueNew'));
const Rate = lazy(() => import('./pages/Rate'));
const Feed = lazy(() => import('./pages/Feed'));
const PostNew = lazy(() => import('./pages/PostNew'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamDetail = lazy(() => import('./pages/TeamDetail'));
const TeamEdit = lazy(() => import('./pages/TeamEdit'));
const TeamFind = lazy(() => import('./pages/TeamFind'));
const ChallengeNew = lazy(() => import('./pages/ChallengeNew'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Friends = lazy(() => import('./pages/Friends'));
const Chat = lazy(() => import('./pages/Chat'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Profile = lazy(() => import('./pages/Profile'));
const MeEdit = lazy(() => import('./pages/MeEdit'));
const Settings = lazy(() => import('./pages/Settings'));
const Password = lazy(() => import('./pages/Password'));
const Account = lazy(() => import('./pages/Account'));
const Shop = lazy(() => import('./pages/Shop'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Pro = lazy(() => import('./pages/Pro'));
const Org = lazy(() => import('./pages/Org'));
const Moderation = lazy(() => import('./pages/Moderation'));
const Help = lazy(() => import('./pages/Help'));
const Cgu = lazy(() => import('./pages/Cgu'));
const Mentions = lazy(() => import('./pages/Mentions'));

/** Pages réservées aux joueurs connectés : sinon, connexion, puis retour sur la page demandée. */
function Private() {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <Outlet />;
}

/** Pages d'entrée (connexion, inscription) : un joueur déjà connecté va directement à l'appli. */
function Guest() {
  const { user } = useAuth();
  const loc = useLocation();
  // Tout juste inscrit : on confirme l'e-mail avant tout.
  if (user && !user.email_verified && loc.pathname === '/register') return <Navigate to="/verify" replace />;
  if (user) return <Navigate to={new URLSearchParams(loc.search).get('next') || '/'} replace />;
  return <Outlet />;
}

/** Accueil : les matchs pour un joueur connecté, l'écran d'entrée sinon. */
function Home() {
  const { user } = useAuth();
  return user ? <Matches /> : <Welcome />;
}

function Root({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  useBadgePolling(user?.id ?? null);
  if (!ready) return <Loading />;
  return <>{children}</>;
}

function Shell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  // Pas encore connecté : l'écran d'entrée prend toute la page, l'aide et les pages légales s'affichent centrées.
  if (!user) return pathname === '/' ? <Outlet /> : <div className="solo"><Outlet /></div>;
  return <AppShell />;
}

export function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <Root>
          <ErrorBoundary>
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<Guest />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot" element={<Forgot />} />
            </Route>
            <Route element={<Shell />}>
              <Route index element={<Home />} />
              <Route path="help" element={<Help />} />
              <Route path="cgu" element={<Cgu />} />
              <Route path="mentions" element={<Mentions />} />
              <Route element={<Private />}>
                <Route path="feed" element={<Feed />} />
                <Route path="create" element={<Create />} />
                <Route path="teams" element={<Teams />} />
                <Route path="profile" element={<Profile />} />
                <Route path="verify" element={<Verify />} />
                <Route path="match/:id" element={<MatchDetail />} />
                <Route path="venue/new" element={<VenueNew />} />
                <Route path="rate/:id" element={<Rate />} />
                <Route path="post/new" element={<PostNew />} />
                <Route path="post/:id" element={<PostDetail />} />
                <Route path="team/find" element={<TeamFind />} />
                <Route path="team/edit/:id" element={<TeamEdit />} />
                <Route path="team/:id" element={<TeamDetail />} />
                <Route path="challenge/new" element={<ChallengeNew />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="friends" element={<Friends />} />
                <Route path="chat/:scope/:id" element={<Chat />} />
                <Route path="user/:id" element={<UserProfile />} />
                <Route path="me/edit" element={<MeEdit />} />
                <Route path="settings" element={<Settings />} />
                <Route path="password" element={<Password />} />
                <Route path="account" element={<Account />} />
                <Route path="shop" element={<Shop />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="pro" element={<Pro />} />
                <Route path="org/:id" element={<Org />} />
                <Route path="moderation" element={<Moderation />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </Root>
      </AuthProvider>
    </BrowserRouter>
  );
}
