import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import EvaluationResults from './pages/EvaluationResults';
import TrainerPanel from './pages/TrainerPanel';
import AdminDashboard from './pages/AdminDashboard';
import SubmissionsPage from './pages/SubmissionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import TeacherDashboard from './pages/TeacherDashboard';
import QuestionEditor from './pages/QuestionEditor';
import QuestionRoadmap from './pages/QuestionRoadmap';
import AIQuestionGenerator from './pages/AIQuestionGenerator';
import AIMentorPage from './pages/AIMentorPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
           <Route index element={<Dashboard />} />
           <Route path="welcome" element={<LandingPage />} />
           <Route path="student" element={<StudentDashboard />} />
           <Route path="roadmap" element={<QuestionRoadmap />} />
           <Route path="results" element={<EvaluationResults />} />
           <Route path="results/:id" element={<EvaluationResults />} />
           <Route path="teacher" element={<TeacherDashboard />} />
           <Route path="teacher/editor" element={<QuestionEditor />} />
           <Route path="teacher/editor/:id" element={<QuestionEditor />} />
           <Route path="trainer" element={<Navigate to="/teacher?tab=builder" replace />} />
           <Route path="admin" element={<AdminDashboard />} />
           <Route path="submissions" element={<SubmissionsPage />} />
           <Route path="analytics" element={<AnalyticsPage />} />
           <Route path="settings" element={<SettingsPage />} />
           {/* AI Features */}
           <Route path="ai-questions" element={<AIQuestionGenerator />} />
           <Route path="ai-mentor" element={<AIMentorPage />} />
           <Route path="*" element={<LandingPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
