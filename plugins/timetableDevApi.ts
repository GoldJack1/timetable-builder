import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const JSON_PATH = "wordpress/kwvr-timetable/sample/timetable.json";

function readBody(req: { on: (ev: string, fn: (c?: Buffer) => void) => void }): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => {
      if (c) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function writeDoc(raw: string) {
  const doc = JSON.parse(raw) as { version?: number };
  if (doc.version !== 1) throw new Error("Not a timetable document.");
  const file = resolve(process.cwd(), JSON_PATH);
  writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
}

function git(args: string[]) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function send(res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (s: string) => void }, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function timetableDevApi(): Plugin {
  return {
    name: "timetable-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (req.method !== "POST" || (url !== "/api/save-timetable" && url !== "/api/publish-timetable")) {
          next();
          return;
        }
        try {
          const raw = await readBody(req);
          writeDoc(raw);
          if (url === "/api/save-timetable") {
            send(res, 200, { ok: true, message: "Saved to sample/timetable.json" });
            return;
          }
          git(["add", JSON_PATH]);
          const status = git(["status", "--porcelain", "--", JSON_PATH]).trim();
          if (status) {
            git(["commit", "-m", "Publish timetable JSON to the WordPress site"]);
          }
          git(["push", "-u", "origin", "HEAD"]);
          send(res, 200, {
            ok: true,
            message: status
              ? "Pushed to GitHub. Fetch timetable now on the WordPress site (or wait up to 5 minutes)."
              : "Already up to date on GitHub. Fetch timetable now on WordPress if the page looks old.",
          });
        } catch (err) {
          const e = err as { message?: string; stderr?: string };
          send(res, 500, { ok: false, error: (e.stderr || e.message || String(err)).trim() });
        }
      });
    },
  };
}
