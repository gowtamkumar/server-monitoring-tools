const { NodeSSH } = require("node-ssh");
const dotenv = require("dotenv");
dotenv.config();

// VPS connection info (reusing the sanitized logic from your success)
const vps = {
  host: (process.env.VPS_HOST || "").replace(/['",]/g, ""),
  username: (process.env.VPS_USERNAME || "").replace(/['",]/g, ""),
  password: (process.env.VPS_PASSWORD || "").replace(/['",]/g, ""),
};

async function investigate() {
  const ssh = new NodeSSH();
  try {
    console.log("Connecting to VPS...");
    await ssh.connect(vps);

    console.log("\n--- CONTAINER LOGS (Last 50 lines) ---");
    const logs = await ssh.execCommand("docker logs --tail 50 somoypurbapar_client_app");
    console.log(logs.stdout || logs.stderr);

    console.log("\n--- CONTAINER PROCESSES (Top CPU) ---");
    // Attempt to see what's running inside
    const top = await ssh.execCommand("docker top somoypurbapar_client_app");
    console.log(top.stdout || top.stderr);

    // Check suspicious file
    console.log("\n--- SUSPICIOUS FILE CHECK ---");
    const checkFile = await ssh.execCommand("docker exec somoypurbapar_client_app ls -l /var/Sofia");
    console.log(checkFile.stdout || checkFile.stderr);

  } catch (err) {
    console.error("Error investigating:", err);
  } finally {
    ssh.dispose();
  }
}

investigate();
