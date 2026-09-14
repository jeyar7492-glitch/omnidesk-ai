import { Router } from "express";
import { healthRouter } from "./health.router";
import { authRouter } from "../auth/routes/auth.router";
import { createAIRouter } from "../ai/routes/ai.router";
import { crmRouter } from "../crm/routes/crm.router";
import { projectsRouter } from "../projects/routes/projects.router";
import { milestonesRouter } from "../projects/routes/milestones.router";
import { tasksRouter } from "../tasks/routes/tasks.router";
import { dashboardRouter } from "../dashboard/routes/dashboard.router";
import { searchRouter } from "../search/routes/search.router";
import { financeRouter } from "../finance/routes/finance.router";
import {
  documentRouter,
  knowledgeBaseRouter,
  knowledgeSearchRouter,
} from "../documents/routes/document.router";
import {
  notificationRouter,
  notificationPreferenceRouter,
} from "../notifications/routes/notification.router";
import { communicationRouter } from "../communication/routes/communication.router";

export const v1Router = Router();

// Version 1 Routes
v1Router.use("/health", healthRouter);
v1Router.use("/auth", authRouter);
v1Router.use("/ai", createAIRouter());
v1Router.use("/crm", crmRouter);
v1Router.use("/projects", projectsRouter);
v1Router.use("/milestones", milestonesRouter);
v1Router.use("/tasks", tasksRouter);
v1Router.use("/dashboard", dashboardRouter);
v1Router.use("/search", searchRouter);
v1Router.use("/finance", financeRouter);
v1Router.use("/documents", documentRouter);
v1Router.use("/knowledge-bases", knowledgeBaseRouter);
v1Router.use("/knowledge", knowledgeSearchRouter);
v1Router.use("/notifications", notificationRouter);
v1Router.use("/notification-preferences", notificationPreferenceRouter);
v1Router.use("/communication", communicationRouter);

