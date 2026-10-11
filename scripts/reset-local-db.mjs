import { execFileSync } from "node:child_process";

const status = execFileSync("npx", ["supabase", "status", "-o", "env"], {
  encoding: "utf8",
});

const apiUrl = readStatus(status, "API_URL");

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(apiUrl)) {
  console.error("Refusing to reset because the Supabase API URL is not local.");
  console.error("This command only resets the Docker database from `npx supabase start`.");
  process.exit(1);
}

execFileSync("npx", ["supabase", "db", "reset"], { stdio: "inherit" });

function readStatus(output, name) {
  const match = output.match(new RegExp(`^${name}=(?:"([^"]+)"|([^\\n]+))$`, "m"));
  return match?.[1] ?? match?.[2] ?? "";
}
