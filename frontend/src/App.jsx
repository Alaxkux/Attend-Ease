import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ScrollToTop from "./components/shared/ScrollToTop";

// Auth
import AuthPage from "./pages/auth/AuthPage";
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Onboarding from "./pages/auth/Onboarding";
import PendingApproval from "./pages/auth/PendingApproval";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import AttendPage from "./pages/student/AttendPage";
import InsightsPage from "./pages/student/InsightsPage";
import CoursesPage from "./pages/student/CoursesPage";
import HistoryPage from "./pages/student/HistoryPage";
import SchedulePage from "./pages/student/SchedulePage";
import CheckInSuccess from "./pages/student/CheckInSuccess";

// Lecturer
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import SessionPage from "./pages/lecturer/SessionPage";
import ReportsPage from "./pages/lecturer/ReportsPage";
import SessionsHistoryPage from "./pages/lecturer/SessionsHistoryPage";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import LecturersPage from "./pages/admin/LecturersPage";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage";
import PolicyPage from "./pages/admin/PolicyPage";
import ExcusesPage from "./pages/admin/ExcusesPage";

// Shared
import ProfilePage from "./pages/shared/ProfilePage";
import NotificationsPage from "./pages/shared/NotificationsPage";

import "./styles/globals.css";

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{width:40,height:40,border:"3px solid var(--border)",borderTop:"3px solid var(--green)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );
  if (!user) return <Navigate to="/" replace/>;
  if (role && !role.includes(user.role)) return <Navigate to={user.role==="lecturer"?"/lecturer":user.role==="admin"?"/admin":"/student"} replace/>;
  return children;
}

function OnboardingGuard({ children }) {
  const { user } = useAuth();
  if (user && !user.hasSeenOnboarding) return <Navigate to="/onboarding" replace/>;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const defaultPath = user ? (user.role==="lecturer"?"/lecturer":user.role==="admin"?"/admin":"/student") : "/";

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={user ? <Navigate to={defaultPath} replace/> : <AuthPage/>}/>
      <Route path="/admin234" element={user ? <Navigate to={defaultPath} replace/> : <AdminLoginPage/>}/>
      <Route path="/verify-email" element={<VerifyEmail/>}/>
      <Route path="/forgot-password" element={<ForgotPassword/>}/>
      <Route path="/reset-password" element={<ResetPassword/>}/>
      <Route path="/pending-approval" element={<PendingApproval/>}/>
      <Route path="/onboarding" element={<ProtectedRoute role={["student","lecturer","admin"]}><Onboarding/></ProtectedRoute>}/>

      {/* Shared */}
      <Route path="/profile" element={<ProtectedRoute role={["student","lecturer","admin"]}><ProfilePage/></ProtectedRoute>}/>

      {/* Student */}
      <Route path="/student" element={<ProtectedRoute role={["student"]}><OnboardingGuard><StudentDashboard/></OnboardingGuard></ProtectedRoute>}/>
      <Route path="/student/attend/:courseId" element={<ProtectedRoute role={["student"]}><AttendPage/></ProtectedRoute>}/>
      <Route path="/student/checkin-success" element={<ProtectedRoute role={["student"]}><CheckInSuccess/></ProtectedRoute>}/>
      <Route path="/student/insights" element={<ProtectedRoute role={["student"]}><InsightsPage/></ProtectedRoute>}/>
      <Route path="/student/courses" element={<ProtectedRoute role={["student"]}><CoursesPage/></ProtectedRoute>}/>
      <Route path="/student/history" element={<ProtectedRoute role={["student"]}><HistoryPage/></ProtectedRoute>}/>
      <Route path="/student/schedule" element={<ProtectedRoute role={["student"]}><SchedulePage/></ProtectedRoute>}/>
      <Route path="/student/notifications" element={<ProtectedRoute role={["student"]}><NotificationsPage backPath="/student"/></ProtectedRoute>}/>

      {/* Lecturer */}
      <Route path="/lecturer" element={<ProtectedRoute role={["lecturer"]}><OnboardingGuard><LecturerDashboard/></OnboardingGuard></ProtectedRoute>}/>
      <Route path="/lecturer/session/:courseId" element={<ProtectedRoute role={["lecturer"]}><SessionPage/></ProtectedRoute>}/>
      <Route path="/lecturer/reports" element={<ProtectedRoute role={["lecturer"]}><ReportsPage/></ProtectedRoute>}/>
      <Route path="/lecturer/reports/:courseId" element={<ProtectedRoute role={["lecturer"]}><ReportsPage/></ProtectedRoute>}/>
      <Route path="/lecturer/sessions" element={<ProtectedRoute role={["lecturer"]}><SessionsHistoryPage/></ProtectedRoute>}/>
      <Route path="/lecturer/students" element={<ProtectedRoute role={["lecturer"]}><ReportsPage/></ProtectedRoute>}/>
      <Route path="/lecturer/notifications" element={<ProtectedRoute role={["lecturer"]}><NotificationsPage backPath="/lecturer"/></ProtectedRoute>}/>

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute role={["admin"]}><AdminDashboard/></ProtectedRoute>}/>
      <Route path="/admin/lecturers" element={<ProtectedRoute role={["admin"]}><LecturersPage/></ProtectedRoute>}/>
      <Route path="/admin/students" element={<ProtectedRoute role={["admin"]}><AdminStudentsPage/></ProtectedRoute>}/>
      <Route path="/admin/courses" element={<ProtectedRoute role={["admin"]}><AdminCoursesPage/></ProtectedRoute>}/>
      <Route path="/admin/policy" element={<ProtectedRoute role={["admin"]}><PolicyPage/></ProtectedRoute>}/>
      <Route path="/admin/excuses" element={<ProtectedRoute role={["admin"]}><ExcusesPage/></ProtectedRoute>}/>
      <Route path="/admin/notifications" element={<ProtectedRoute role={["admin"]}><NotificationsPage backPath="/admin"/></ProtectedRoute>}/>

      <Route path="*" element={<Navigate to={defaultPath} replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop/>
          <AppRoutes/>
          <Toaster position="top-center" toastOptions={{
            style:{background:"var(--bg-card)",color:"var(--text-primary)",border:"1px solid var(--border)",fontFamily:"var(--font)",fontSize:"0.88rem",borderRadius:"12px",padding:"12px 16px"},
            success:{iconTheme:{primary:"var(--green)",secondary:"#fff"}},
            error:{iconTheme:{primary:"var(--red)",secondary:"#fff"}},
          }}/>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}