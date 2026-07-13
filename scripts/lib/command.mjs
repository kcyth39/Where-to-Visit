import { spawn, spawnSync } from "node:child_process";

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : "pipe"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    const error = new Error(`${command} exited with status ${result.status}`);
    error.status = result.status;
    error.stdout = result.stdout ?? "";
    error.stderr = result.stderr ?? "";
    throw error;
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

export function runCommandAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      signal: options.signal,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"]
    });
    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    let settled = false;
    const rejectOnce = (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    child.on("error", rejectOnce);
    child.on("close", (status) => {
      const result = {
        status: status ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8")
      };

      if (result.status !== 0 && !options.allowFailure) {
        const error = new Error(`${command} exited with status ${result.status}`);
        Object.assign(error, result);
        rejectOnce(error);
        return;
      }
      if (!settled) {
        settled = true;
        resolve(result);
      }
    });
    if (options.input !== undefined) {
      child.stdin.on("error", rejectOnce);
      child.stdin.end(options.input);
    }
  });
}
