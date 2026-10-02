import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";

export class ServerProcess {
  readonly child: ChildProcess;
  readonly ready: Promise<string>;
  subscriptionCount = 0;

  constructor(file: string, env: NodeJS.ProcessEnv = {}) {
    this.child = spawn(process.execPath, ["--import", "tsx", file], {
      cwd: resolve(process.cwd()),
      env: { ...process.env, ...env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    this.child.on("message", (message) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "subscriptions" &&
        "count" in message &&
        typeof message.count === "number"
      ) {
        this.subscriptionCount = message.count;
      }
    });
    this.ready = new Promise((resolveUrl, reject) => {
      let output = "";
      const timer = setTimeout(() => {
        this.child.kill("SIGTERM");
        reject(new Error(`${file} did not start: ${output}`));
      }, 15_000);
      this.child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      this.child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`${file} exited with ${code}: ${output}`));
      });
      this.child.stderr!.on("data", (data: Buffer) => {
        output += data.toString();
      });
      this.child.stdout!.on("data", (data: Buffer) => {
        output += data.toString();
        const match = output.match(/Server ready at (http:\/\/\S+)/);
        if (match) {
          clearTimeout(timer);
          resolveUrl(match[1]);
        }
      });
    });
  }

  async stop() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    const exited = once(this.child, "exit");
    const timer = setTimeout(() => this.child.kill("SIGKILL"), 5_000);
    this.child.kill("SIGTERM");
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  }
}
