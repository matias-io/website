import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["next", "dev", "--port", "3300"], {
  stdio: "inherit",
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
