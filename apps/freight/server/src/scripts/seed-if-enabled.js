import "dotenv/config";
import { spawn } from "node:child_process";

if (process.env.AUTO_SEED_ADMIN !== "true") {
  console.log("Admin seed skipped. Set AUTO_SEED_ADMIN=true to run it.");
  process.exit(0);
}

const child = spawn(process.execPath, ["src/scripts/seed.js"], {
  stdio: "inherit",
  shell: false
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
