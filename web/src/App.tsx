// Routes de l'appli web. Adresses identiques à l'appli mobile (/match/12, /user/3…) : les liens des notifications marchent partout.
import { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './lib/auth';
import { useBadgePolling } from './lib/badge';
import { AppShell } from './ui/Layout';
import { Loading } from './ui/ui';
import Forgot from './pages/auth/Forgot';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Welcome from './pages/auth/Welcome';
import Verify from './pages/auth/Verify';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Create from './pages/Create';
import VenueNew from './pages/VenueNew';
import Rate from './pages/Rate';
import Feed from './pages/Feed';
import PostNew from './pages/PostNew';
import PostDetail from './pages/PostDetail';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import TeamEdit from './pages/TeamEdit';
import TeamFind from './pages/TeamFind';
import ChallengeNew from './pages/ChallengeNew';
import Notifications from './pages/Notifications';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import UserProfile from './pages/UserProfile';
import Profile from './pages/Profile';
import MeEdit from './pages/MeEdit';
import Settings from './pages/Settings';
import Password from './pages/Password';
import Account from './pages/Account';
import Shop from './pages/Shop';
import Inventory from './pages/Inventory';
import Pro from './pages/Pro';
import Org from './pages/Org';
import Moderation from './pages/Moderation';
import Help from './pages/Help';
import Cgu from './pages/Cgu';
import Mentions from './pages/Mentions';

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
        </Root>
      </AuthProvider>
    </BrowserRouter>
  );
}
