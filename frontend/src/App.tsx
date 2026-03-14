import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './pages/Login';
import Home from './pages/Home';
import SampleEntryChoice from './pages/SampleEntryChoice';
import SampleEntryForm from './pages/SampleEntryForm';
import SampleTracking from './pages/SampleTracking';
import ReportHandling from './pages/ReportHandling';
import ReportAnalyser from './pages/ReportAnalyser';
import ReportReview from './pages/ReportReview';
import UserManagement from './pages/UserManagement';
import './App.css';

export default function App() {
  return (
    <BrowserRouter basename="/vijayrekha">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <div className="app">
                  <Header />
                  <Outlet />
                  <Footer />
                </div>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/sample-entry" element={<SampleEntryChoice />} />
              <Route path="/sample-entry/form" element={<SampleEntryForm />} />
              <Route path="/sample-entry/tracking" element={<SampleTracking />} />
              <Route path="/report-handling" element={<ReportHandling />} />
              <Route path="/report-review/:reportId" element={<ReportReview />} />
              <Route path="/report-analyser" element={<ReportAnalyser />} />
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
