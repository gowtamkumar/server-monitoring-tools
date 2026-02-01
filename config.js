const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  // Mode: 'remote' (SSH to VPS) or 'local' (run on VPS itself)
  mode: process.env.MODE || "local",

  // VPS connection settings (for remote mode)
  vps: {
    host: process.env.VPS_HOST?.replace(/['\",]/g, "") || "",
    username: process.env.VPS_USERNAME?.replace(/['\",]/g, "") || "",
    password: process.env.VPS_PASSWORD?.replace(/['\",]/g, "") || "",
  },

  // API server settings
  api: {
    port: parseInt(process.env.API_PORT || "4000"),
    apiKey: process.env.API_KEY || null, // Optional API key for authentication
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL || "30000"), // 30 seconds default
    enableCors: process.env.ENABLE_CORS !== "false", // true by default
  },

  // Monitoring configuration
  monitoring: {
    services: (process.env.SERVICES || "nginx,docker").split(","),
    enableBandwidthMonitoring: process.env.ENABLE_BANDWIDTH !== "false",
    enableContainerLogs: process.env.ENABLE_CONTAINER_LOGS !== "false",
    topProcessCount: parseInt(process.env.TOP_PROCESS_COUNT || "10"),
    containerLogLines: parseInt(process.env.CONTAINER_LOG_LINES || "50"),
  },

  // Email/SMTP settings
  mail: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    from: process.env.SMTP_FROM || '"VPS Monitor" <alerts@example.com>',
  },
};
