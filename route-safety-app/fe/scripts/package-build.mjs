import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectDir = process.cwd();
const distDir = resolve(projectDir, "dist");
const archive = resolve(projectDir, "route-safety-app.zip");

if (!existsSync(distDir)) throw new Error("Папка dist не найдена. Сначала запустите Vite build.");
if (existsSync(archive)) rmSync(archive);

const result = spawnSync("zip", ["-qr", archive, "."], { cwd: distDir, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`zip завершился с кодом ${result.status}`);

console.log(`\n✓ ZIP создан: ${archive}`);
