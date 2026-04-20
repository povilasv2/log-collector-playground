import { spawn } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { COLLECTORS, type CollectorId } from "./collectors";

export const LIMITS = {
  configBytes: 64 * 1024,
  inputBytes: 256 * 1024,
  stdoutBytes: 1024 * 1024,
  stderrBytes: 256 * 1024,
  wallTimeMs: 10_000,
  memory: "128m",
  cpus: "0.5",
  pids: 64,
  tmpfsSize: "16m",
};

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  truncated: boolean;
}

const HOST_WORK_DIR = process.env.PLAYGROUND_WORK_DIR || join(tmpdir(), "playground");

export async function runCollector(
  collectorId: CollectorId,
  config: string,
  input: string,
): Promise<RunResult> {
  const spec = COLLECTORS[collectorId];
  const runId = randomUUID();
  const hostDir = await mkdtemp(join(HOST_WORK_DIR, `${collectorId}-`)).catch(async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(HOST_WORK_DIR, { recursive: true });
    return mkdtemp(join(HOST_WORK_DIR, `${collectorId}-`));
  });

  try {
    // mkdtemp defaults to 0700; the sandboxed container runs as nobody (65534)
    // and needs +x on the directory to traverse into the bind-mount.
    await chmod(hostDir, 0o755);
    await writeFile(join(hostDir, spec.configFilename), config, { mode: 0o644 });
    if (spec.inputMode === "file") {
      await writeFile(join(hostDir, "input.log"), input, { mode: 0o644 });
    }

    const containerName = `playground-${runId}`;
    const stdinFlag = spec.inputMode === "stdin" ? "-i" : null;
    const dockerArgs = [
      "run",
      "--rm",
      ...(stdinFlag ? [stdinFlag] : []),
      "--name", containerName,
      "--network=none",
      "--read-only",
      `--tmpfs=/tmp:rw,size=${LIMITS.tmpfsSize},mode=1777`,
      `--memory=${LIMITS.memory}`,
      `--memory-swap=${LIMITS.memory}`,
      `--cpus=${LIMITS.cpus}`,
      `--pids-limit=${LIMITS.pids}`,
      "--security-opt=no-new-privileges",
      "--cap-drop=ALL",
      "--user=65534:65534",
      "-v", `${hostDir}:/run-input:ro`,
      spec.image,
      ...spec.command,
    ];

    return await spawnDocker(
      containerName,
      dockerArgs,
      spec.inputMode === "stdin" ? input : null,
      spec.idleKillMs,
    );
  } finally {
    rm(hostDir, { recursive: true, force: true }).catch(() => {});
  }
}

function spawnDocker(
  containerName: string,
  args: string[],
  stdinData: string | null,
  idleKillMs: number | undefined,
): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn("docker", args, {
      stdio: [stdinData !== null ? "pipe" : "ignore", "pipe", "pipe"],
    });
    if (stdinData !== null && child.stdin) {
      child.stdin.on("error", () => {});
      child.stdin.end(stdinData);
    }

    let idleTimer: NodeJS.Timeout | null = null;
    let idleStopped = false;
    const armIdleKill = () => {
      if (!idleKillMs) return;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleStopped = true;
        spawn("docker", ["stop", "--time=1", containerName], { stdio: "ignore" });
      }, idleKillMs);
    };
    armIdleKill();

    let stdout = "";
    let stderr = "";
    let stdoutTrunc = false;
    let stderrTrunc = false;

    child.stdout!.on("data", (chunk: Buffer) => {
      armIdleKill();
      if (stdout.length >= LIMITS.stdoutBytes) { stdoutTrunc = true; return; }
      const remaining = LIMITS.stdoutBytes - stdout.length;
      stdout += chunk.length > remaining ? chunk.slice(0, remaining).toString() : chunk.toString();
      if (chunk.length > remaining) stdoutTrunc = true;
    });
    child.stderr!.on("data", (chunk: Buffer) => {
      armIdleKill();
      if (stderr.length >= LIMITS.stderrBytes) { stderrTrunc = true; return; }
      const remaining = LIMITS.stderrBytes - stderr.length;
      stderr += chunk.length > remaining ? chunk.slice(0, remaining).toString() : chunk.toString();
      if (chunk.length > remaining) stderrTrunc = true;
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      spawn("docker", ["kill", containerName], { stdio: "ignore" });
      child.kill("SIGKILL");
    }, LIMITS.wallTimeMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (idleTimer) clearTimeout(idleTimer);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        durationMs: Date.now() - started,
        timedOut: timedOut && !idleStopped,
        truncated: stdoutTrunc || stderrTrunc,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (idleTimer) clearTimeout(idleTimer);
      resolve({
        stdout,
        stderr: stderr + `\n[runner] failed to spawn docker: ${err.message}`,
        exitCode: null,
        durationMs: Date.now() - started,
        timedOut,
        truncated: stdoutTrunc || stderrTrunc,
      });
    });
  });
}
