import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';

/** 路由级懒加载：减小首包、加快首页打开；进入子页再拉对应 chunk */
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const MovieList = lazy(() => import('./pages/MovieList'));
const MovieDetail = lazy(() => import('./pages/MovieDetail'));
const Recommend = lazy(() => import('./pages/Recommend'));
const Charts = lazy(() => import('./pages/Charts'));
const Profile = lazy(() => import('./pages/Profile'));
const MyRatings = lazy(() => import('./pages/MyRatings'));
const MyComments = lazy(() => import('./pages/MyComments'));
const ActorDetail = lazy(() => import('./pages/ActorDetail'));
const MyFavorites = lazy(() => import('./pages/MyFavorites'));
const MyLogs = lazy(() => import('./pages/MyLogs'));
const Feedback = lazy(() => import('./pages/Feedback'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminMovies = lazy(() => import('./pages/admin/Movies'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminTags = lazy(() => import('./pages/admin/Tags'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminLogs = lazy(() => import('./pages/admin/Logs'));
const AdminFeedbacks = lazy(() => import('./pages/admin/Feedbacks'));
const AdminRatings = lazy(() => import('./pages/admin/Ratings'));
const AdminExplore = lazy(() => import('./pages/admin/AdminExplore'));

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="route-fallback__spinner" aria-hidden />
      <span className="route-fallback__text">加载中…</span>
    </div>
  );
}

function ProtectedRoute({ children, admin }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="movies" element={<MovieList />} />
            <Route path="movies/:id" element={<MovieDetail />} />
            <Route path="actors/:tmdbId" element={<ActorDetail />} />
            <Route path="recommend" element={<Recommend />} />
            <Route path="charts" element={<Charts />} />
            <Route path="feedback" element={<Feedback />} />

            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile/ratings"
              element={
                <ProtectedRoute>
                  <MyRatings />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile/comments"
              element={
                <ProtectedRoute>
                  <MyComments />
                </ProtectedRoute>
              }
            />
            <Route
              path="favorites"
              element={
                <ProtectedRoute>
                  <MyFavorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="logs"
              element={
                <ProtectedRoute>
                  <MyLogs />
                </ProtectedRoute>
              }
            />

            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute admin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/movies"
              element={
                <ProtectedRoute admin>
                  <AdminMovies />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/categories"
              element={
                <ProtectedRoute admin>
                  <AdminCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/tags"
              element={
                <ProtectedRoute admin>
                  <AdminTags />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute admin>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/ratings"
              element={
                <ProtectedRoute admin>
                  <AdminRatings />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/explore/:type"
              element={
                <ProtectedRoute admin>
                  <AdminExplore />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/logs"
              element={
                <ProtectedRoute admin>
                  <AdminLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/feedbacks"
              element={
                <ProtectedRoute admin>
                  <AdminFeedbacks />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
