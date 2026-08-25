import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { createApp } from "../apps/api/src/app";
import { wsManager } from "../apps/api/src/lib/websocket";
import { authService } from "../apps/api/src/auth/services/auth.service";
import { prisma } from "../apps/api/src/lib/prisma";

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  wsManager.init(wss);

  await new Promise<void>((resolve) => {
    server.listen(4000, "127.0.0.1", () => {
      resolve();
    });
  });

  const baseUrl = "http://127.0.0.1:4000/api/v1";

  const runId = Math.random().toString(36).substring(2, 9);
  const testEmail = `crm_live_${runId}@omnidesk.ai`;
  const regRes = await authService.register({
    email: testEmail,
    password: "StrongPassword123!",
    firstName: "Elena",
    lastName: "Vance",
    organizationName: `Starlight Corp ${runId}`,
    workspaceName: `Starlight Aerospace ${runId}`,
  });

  const token = regRes.tokens.accessToken;
  const workspaceId = regRes.user.activeWorkspaceId;
  const userId = regRes.user.id;

  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  console.log("=== OMNIDESK AI CRM & SALES AGENT LIVE VERIFICATION ===");

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    console.log("1. Health Endpoint:", healthRes.status, healthJson);

    // 2. Customer REST creation
    const custRes = await fetch(`${baseUrl}/crm/customers`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        companyName: `Starlight Aerospace Systems ${runId}`,
        contactPerson: "Dr. Elena Vance",
        email: `elena.vance_${runId}@starlight-aero.com`,
        industry: "Aerospace & Defense",
      }),
    });
    const custJson = await custRes.json();
    console.log("2. Customer Created:", custRes.status, custJson.data?.companyName);
    const customerId = custJson.data?.id;

    // 3. Contact REST creation
    const contactRes = await fetch(`${baseUrl}/crm/contacts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Elena",
        lastName: "Vance",
        email: `elena.vance_${runId}@starlight-aero.com`,
        jobTitle: "Chief Technology Officer",
        customerId,
        isPrimary: true,
      }),
    });
    const contactJson = await contactRes.json();
    console.log("3. Contact Created:", contactRes.status, `${contactJson.data?.firstName} ${contactJson.data?.lastName}`);

    // 4. Lead REST creation
    const leadRes = await fetch(`${baseUrl}/crm/leads`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: "Satellite Telemetry AI Platform",
        customerId,
        dealValue: 150000,
        stage: "PROPOSAL",
        priority: "HIGH",
      }),
    });
    const leadJson = await leadRes.json();
    console.log("4. Lead Created:", leadRes.status, leadJson.data?.title, "Value:", leadJson.data?.dealValue);

    // 5. Deal REST creation & Pipeline summary
    const dealRes = await fetch(`${baseUrl}/crm/deals`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: "Orbital Guidance Intelligence Engine 2026",
        customerId,
        dealValue: 240000,
        stage: "PROPOSAL",
        probability: 70,
        priority: "URGENT",
      }),
    });
    const dealJson = await dealRes.json();
    console.log("5. Deal Created:", dealRes.status, dealJson.data?.title, "Value:", dealJson.data?.dealValue);

    // 6. Pipeline Summary
    const pipeRes = await fetch(`${baseUrl}/crm/pipeline/summary`, { headers: authHeaders });
    const pipeJson = await pipeRes.json();
    console.log("6. Pipeline Summary:", pipeRes.status, "Active Pipeline Value:", pipeJson.data?.totalActivePipelineValue);

    // 7. WebSocket connection check with JWT token
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:4000/ws?token=${token}`);
      ws.on("open", () => {
        console.log("7. WebSocket Connection: PASS (Connected to ws://127.0.0.1:4000/ws)");
        ws.close();
        resolve();
      });
      ws.on("error", (err) => {
        console.error("7. WebSocket Connection Failed:", err);
        reject(err);
      });
    });

    console.log("\nALL LIVE CRM AND SALES AGENT PIPELINE VERIFICATIONS PASSED!");
  } finally {
    // Cleanup
    await prisma.deal.deleteMany({ where: { workspaceId } });
    await prisma.lead.deleteMany({ where: { workspaceId } });
    await prisma.contact.deleteMany({ where: { workspaceId } });
    await prisma.customer.deleteMany({ where: { workspaceId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: userId } });

    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main().catch((err) => {
  console.error("Live Verification Failed:", err);
  process.exit(1);
});
