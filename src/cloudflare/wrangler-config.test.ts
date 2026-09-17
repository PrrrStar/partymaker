import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface WranglerConfig {
  main?: string;
  assets?: { directory?: string };
}

interface PackageConfig {
  scripts?: { build?: string };
}

describe("Cloudflare deployment config", () => {
  it("builds vinext assets before the default Wrangler deploy", () => {
    const wrangler = JSON.parse(
      readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8"),
    ) as WranglerConfig;
    const packageConfig = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as PackageConfig;

    expect(packageConfig.scripts?.build).toBe("next build && vinext build");
    expect(wrangler.main).toBe("src/cloudflare/worker.ts");
    expect(wrangler.assets?.directory).toBe("dist/client");
  });
});
