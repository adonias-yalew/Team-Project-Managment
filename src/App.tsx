import { Navigate, Route, Routes } from "react-router-dom";

import { OverviewPage } from "./routes/index";
import { MyTasksPage } from "./routes/my-tasks";
import { TeamTasksPage } from "./routes/team-tasks";
import { ProjectsPage } from "./routes/projects";
import { PlannerPage } from "./routes/planner";
import { LearningPage } from "./routes/learning";
import { ReviewsPage } from "./routes/reviews";
import { AnalyticsPage } from "./routes/analytics";
import { SettingsPage } from "./routes/settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/my-tasks" element={<MyTasksPage />} />
      <Route path="/team-tasks" element={<TeamTasksPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/planner" element={<PlannerPage />} />
      <Route path="/learning" element={<LearningPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
