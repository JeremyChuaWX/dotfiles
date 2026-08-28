import explorer from "./explorer/index.ts";
import worker from "./worker/index.ts";

export { childArgs, type SubagentProfile } from "./profile.ts";

/** Every profile listed here is registered as a spawn tool. Add a new agent by declaring it and appending it. */
export const profiles = [explorer, worker];
