import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/app/DashboardPage';
import EmployeeAttendancePage from './pages/app/EmployeeAttendancePage';
import StudentAttendancePage from './pages/app/StudentAttendancePage';
import AttendanceRecapPage from './pages/app/AttendanceRecapPage';
import StudentsPage from './pages/app/StudentsPage';
import StudentDetailPage from './pages/app/StudentDetailPage';
import UserManagementPage from './pages/app/UserManagementPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="absensi-karyawan" element={<EmployeeAttendancePage />} />
            <Route path="absensi-siswa" element={<StudentAttendancePage />} />
            <Route path="rekap/:type" element={<AttendanceRecapPage />} />
            <Route path="data-siswa" element={<StudentsPage />} />
            <Route path="data-siswa/:id" element={<StudentDetailPage />} />
            <Route path="users" element={<UserManagementPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
