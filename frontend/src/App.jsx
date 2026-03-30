import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ExamPage from "./pages/ExamPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import ExamSubmitted from "./pages/ExamSubmitted.jsx";
import JoinExam from "./pages/JoinExam";
import CreateExam from "./pages/CreateExam";
import ProfilePage from "./pages/ProfilePage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import ExamBuilder from "./pages/ExamBuilder";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (

  
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
          <ProtectedRoute>
          <Dashboard />
          </ProtectedRoute>
          }
        />
       
        <Route 
          path="/exam/:id" 
          element={
          <ProtectedRoute>
            <ExamPage />
          </ProtectedRoute>
          }
        />
        <Route
          path="/join"
          element={
          <ProtectedRoute>
            <JoinExam />
          </ProtectedRoute>
          }
        />
        <Route
          path="/create-exam"
          element={
          <ProtectedRoute>
            <CreateExam />
          </ProtectedRoute>
          }
         />
        <Route path="/exam-builder/:code" element={<ExamBuilder />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/analytics/:id" element={<AnalyticsPage />} />
        <Route path="/results/:id" element={<ResultPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/exam-submitted" element={<ExamSubmitted />} />

      </Routes>
    
  );
}