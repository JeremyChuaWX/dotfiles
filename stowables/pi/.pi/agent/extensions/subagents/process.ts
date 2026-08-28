import { type ChildProcess, spawn } from "node:child_process";

/**
 * Signal a child's whole process group when possible (taskkill /T on Windows, where signals cannot
 * reach descendants), falling back to the direct child if tree termination races with exit. Never
 * throws.
 */
export function killProcessTree(child: ChildProcess, signal: NodeJS.Signals): void {
    if (child.pid) {
        if (process.platform === "win32") {
            try {
                const sweeper = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
                    stdio: "ignore",
                    windowsHide: true,
                });
                let signalled = false;
                const fallback = () => {
                    if (signalled) return;
                    signalled = true;
                    try {
                        child.kill(signal);
                    } catch {
                        // The child may have exited between the checks.
                    }
                };
                sweeper.once("error", fallback);
                sweeper.once("close", (code) => {
                    if (code !== 0) fallback();
                });
                sweeper.unref();
                return;
            } catch {
                // Fall back to signaling just the direct child.
            }
        } else {
            try {
                process.kill(-child.pid, signal);
                return;
            } catch {
                // Fall back to signaling just the direct child.
            }
        }
    }
    try {
        child.kill(signal);
    } catch {
        // The child may have exited between the checks.
    }
}

export interface GracefulTermination {
    /** Send SIGTERM and arm SIGKILL escalation after the grace. Idempotent. */
    begin(): void;
    /** Escalate once more as the direct child closes so no descendant that ignored SIGTERM survives. */
    escalateOnClose(): void;
    /** Clear the escalation timer once the run settles. */
    dispose(): void;
}

/** SIGTERM, then SIGKILL after graceMs. */
export function createGracefulTermination(
    sendSignal: (signal: NodeJS.Signals) => void,
    graceMs: number,
): GracefulTermination {
    let killTimer: NodeJS.Timeout | undefined;
    let begun = false;
    return {
        begin() {
            if (begun) return;
            begun = true;
            sendSignal("SIGTERM");
            killTimer = setTimeout(() => sendSignal("SIGKILL"), graceMs);
        },
        escalateOnClose() {
            if (begun) sendSignal("SIGKILL");
        },
        dispose() {
            if (killTimer) clearTimeout(killTimer);
            killTimer = undefined;
        },
    };
}
