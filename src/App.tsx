import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/modules/auth/require-auth";
import { AuthPage, ForgotPasswordPage, ResetPasswordPage } from "@/modules/auth/auth-pages";

import { OverviewPage } from "./routes/index";
import { MyTasksPage } from "./routes/my-tasks";
import { TeamTasksPage } from "./routes/team-tasks";
import { ProjectsPage } from "./routes/projects";
import { PlannerPage } from "./routes/planner";
import { LearningPage } from "./routes/learning";
import { ReviewsPage } from "./routes/reviews";
import { AnalyticsPage } from "./routes/analytics";
import { SettingsPage } from "./routes/settings";
import { NotFoundPage } from "./routes/not-found";
import {
  CreateWorkspacePage,
  MyInvitationsPage,
  MyWorkspacePage,
  SharedWorkspacesPage,
  WorkspaceInvitationsPage,
  WorkspaceMembersPage,
  WorkspaceOverviewPage,
  WorkspaceSettingsPage,
} from "@/modules/workspaces/workspace-pages";
import { InvitationAcceptPage } from "@/modules/invitations/invitation-accept-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/my-workspace" element={<MyWorkspacePage />} />
        <Route path="/workspaces" element={<SharedWorkspacesPage />} />
        <Route path="/workspaces/new" element={<CreateWorkspacePage />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspaceOverviewPage />} />
        <Route path="/workspaces/:workspaceId/members" element={<WorkspaceMembersPage />} />
        <Route path="/workspaces/:workspaceId/invitations" element={<WorkspaceInvitationsPage />} />
        <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
        <Route path="/invitations" element={<MyInvitationsPage />} />
        <Route path="/invitations/accept" element={<InvitationAcceptPage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/team-tasks" element={<TeamTasksPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/learning" element={<LearningPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
