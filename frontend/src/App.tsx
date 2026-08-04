import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CaptureFlowPage } from "./pages/CaptureFlowPage";
import { ReportPage } from "./pages/ReportPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ComparePage } from "./pages/ComparePage";
import { MyPage } from "./pages/MyPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/capture"
            element={
              <ProtectedRoute>
                <CaptureFlowPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/:sessionId"
            element={
              <ProtectedRoute>
                <ReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compare"
            element={
              <ProtectedRoute>
                <ComparePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/capture" replace />} />
          <Route path="*" element={<Navigate to="/capture" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
