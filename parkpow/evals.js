// @ts-nocheck
// This file contains the evaluation functions for our monitors

// Default Kener eval function (cleaned up)
// async function dfgdfg(statusCode, responseTime, responseRaw, modules) {
//   const statusCodeShort = Math.floor(statusCode / 100);
//   if (statusCode === 429 || (statusCodeShort >= 2 && statusCodeShort <= 3)) {
//     return {
//       status: "UP",
//       latency: responseTime,
//     };
//   }
//   return {
//     status: "DOWN",
//     latency: responseTime,
//   };
// }

// Simple API eval — checks status code and response time
// Remove `temp` on paste
async function api(statusCode, responseTime) {
  const isSuccess = statusCode === 429 || (statusCode >= 200 && statusCode < 400);
  const status = !isSuccess ? "DOWN" : responseTime > 20000 ? "DEGRADED" : "UP";
  return { status, latency: responseTime };
}

// SFTP eval — checks status code, response time, and raw response
// Remove `sftp` on paste
async function sftp(statusCode, responseTime, responseRaw) {
  const isSuccess = statusCode === 429 || (statusCode >= 200 && statusCode < 400);
  if (!isSuccess || responseRaw.trim() !== "ok")
    return { status: "DOWN", latency: responseTime };
  if (responseTime > 20000) return { status: "DEGRADED", latency: responseTime };
  return { status: "UP", latency: responseTime };
}

// HTML content eval — checks status code and that response contains "parkpow"
// Remove `html` on paste
async function html(statusCode, responseTime, responseRaw) {
  const isSuccess = statusCode === 429 || (statusCode >= 200 && statusCode < 400);
  if (!isSuccess || !responseRaw.toLowerCase().includes("parkpow"))
    return { status: "DOWN", latency: responseTime };
  if (responseTime > 5000) return { status: "DEGRADED", latency: responseTime };
  return { status: "UP", latency: responseTime };
}

// Health check eval — parses JSON response and checks all values are "working"
// Remove `health` on paste
async function health(statusCode, responseTime, responseRaw) {
  const isSuccess = statusCode === 429 || (statusCode >= 200 && statusCode < 400);
  if (!isSuccess) return { status: "DOWN", latency: responseTime };

  const values = Object.values(JSON.parse(responseRaw));
  const total = values.length;
  const working = values.filter((v) => v === "working").length;

  if (working === 0) return { status: "DOWN", latency: responseTime };
  if (working < total) return { status: "DEGRADED", latency: responseTime };
  if (responseTime > 20000) return { status: "DEGRADED", latency: responseTime };
  return { status: "UP", latency: responseTime };
}
