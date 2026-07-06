import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Find Vercel token
function findToken() {
  const paths = [
    join(homedir(), ".vercel", "auth.json"),
    join(homedir(), "AppData", "Roaming", ".vercel", "auth.json"),
    join(homedir(), "AppData", "Local", ".vercel", "auth.json"),
    join(process.env.APPDATA || "", ".vercel", "auth.json"),
    join(process.env.LOCALAPPDATA || "", ".vercel", "auth.json"),
  ];
  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(p, "utf-8")).token;
    } catch {}
  }
  return null;
}

// Find project config
function findProjectConfig() {
  const paths = [
    join(__dirname, ".vercel", "project.json"),
    join(process.cwd(), ".vercel", "project.json"),
  ];
  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(p, "utf-8"));
    } catch {}
  }
  return null;
}

async function main() {
  const token = findToken();
  if (!token) {
    console.error("Vercel auth token not found. Run 'vercel login' first.");
    process.exit(1);
  }

  const proj = findProjectConfig();
  if (!proj) {
    console.error("Project not linked. Run 'vercel link' first.");
    process.exit(1);
  }

  const { projectId, orgId } = proj;
  const envFile = join(__dirname, ".env.local");
  const content = readFileSync(envFile, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith("NEXT_PUBLIC_") && !trimmed.startsWith("FIREBASE_") && !trimmed.startsWith("NEXT_PUBLIC_APP_URL")) continue;

    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!key || !value) continue;

    process.stdout.write(`Adding ${key} ... `);

    try {
      const body = JSON.stringify({
        type: "encrypted",
        key,
        value,
        target: ["production"],
      });

      const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env?teamId=${orgId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (res.ok) {
        console.log("\x1b[32mOK\x1b[0m");
      } else if (res.status === 409) {
        process.stdout.write("\x1b[33mupdating... \x1b[0m");
        // Find existing env id
        const listRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env?teamId=${orgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = await listRes.json();
        const existing = list.envs?.find((e) => e.key === key);
        if (existing) {
          const updateRes = await fetch(
            `https://api.vercel.com/v10/projects/${projectId}/env/${existing.id}?teamId=${orgId}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body,
            }
          );
          if (updateRes.ok) {
            console.log("\x1b[33mUpdated\x1b[0m");
          } else {
            console.log("\x1b[31mUpdate failed\x1b[0m");
          }
        }
      } else {
        const err = await res.text();
        console.log(`\x1b[31mFAILED (${res.status}): ${err}\x1b[0m`);
      }
    } catch (err) {
      console.log(`\x1b[31mERROR: ${err.message}\x1b[0m`);
    }
  }

  console.log("\n\x1b[36mAll done! Redeploy with: vercel --prod\x1b[0m");
}

main();
