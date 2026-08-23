import WebSocket from "ws";

async function verifyAllLive(): Promise<void> {
  console.log("1. Checking API Health Endpoint: http://localhost:4000/api/v1/health");
  const res = await fetch("http://localhost:4000/api/v1/health");
  if (!res.ok) {
    throw new Error(`API health check failed with status: ${res.status}`);
  }
  const data = await res.json();
  console.log("API Health Check Response:", JSON.stringify(data, null, 2));

  if (data.status !== "ok") {
    throw new Error(`Expected status: ok, got: ${data.status}`);
  }
  if (!data.database || data.database.status !== "connected") {
    throw new Error(`Expected database.status: connected, got: ${data.database?.status}`);
  }

  console.log("\n2. Checking Vite Proxy: http://localhost:5173/api/v1/health");
  const viteRes = await fetch("http://localhost:5173/api/v1/health");
  if (!viteRes.ok) {
    throw new Error(`Vite proxy check failed with status: ${viteRes.status}`);
  }
  const viteData = await viteRes.json();
  console.log("Vite Proxy Response Status:", viteData.status);

  console.log("\n3. Checking WebSocket Gateway: ws://localhost:4000/ws");
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:4000/ws");
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket connection timeout"));
    }, 5000);

    ws.on("open", () => {
      console.log("WebSocket connection successfully opened!");
      ws.send(JSON.stringify({ event: "ping" }));
    });

    ws.on("message", (msg) => {
      const parsed = JSON.parse(msg.toString());
      console.log("Received WebSocket Event:", JSON.stringify(parsed));
      if (parsed.event === "system.connected" || parsed.event === "pong") {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log("\nALL LIVE ENDPOINTS AND REALTIME GATEWAYS VERIFIED SUCCESSFULLY!");
}

verifyAllLive().catch((err) => {
  console.error("Live verification failed:", err);
  process.exit(1);
});
