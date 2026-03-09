import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';

// 页面
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MovieList from './pages/MovieList';
import MovieDetail from './pages/MovieDetail';
import Recommend from './pages/Recommend';
import Charts from './pages/Charts';
import Profile from './pages/Profile';
import MyFavorites from './pages/MyFavorites';
import MyLogs from './pages/MyLogs';
import QA from './pages/QA';
import QADetail from './pages/QADetail';
import Feedback from './pages/Feedback';
import AdminMovies from './pages/admin/Movies';
import AdminCategories from './pages/admin/Categories';
import AdminTags from './pages/admin/Tags';
import AdminUsers from './pages/admin/Users';
import AdminLogs from './pages/admin/Logs';
import AdminFeedbacks from './pages/admin/Feedbacks';
import AdminRatings from './pages/admin/Ratings';

function ProtectedRoute({ children, admin }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="movies" element={<MovieList />} />
          <Route path="movies/:id" element={<MovieDetail />} />
          <Route path="recommend" element={<Recommend />} />
          <Route path="charts" element={<Charts />} />
          <Route path="qa" element={<QA />} />
          <Route path="qa/:id" element={<QADetail />} />
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
    </AuthProvider>
  );
}
