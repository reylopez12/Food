// Start Expo off Replit (Windows, macOS, Linux).
//
// Phones running Expo Go can't reach "localhost" on your computer, so this
// points the app at your computer's Wi-Fi/LAN address, where the API server
// (`pnpm dev:api`, port 5000) is listening. Extra args are passed to
// `expo start`, e.g. `pnpm dev:local --web`.
//
// Override the API address with API_URL=http://host:port if needed.

const { spawn } = require("node:child_process");
const os = require("node:os");

function lanAddress() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      // Skip virtual adapters (WSL, Hyper-V, VirtualBox, Docker, VPNs)
      if (/vEthernet|VirtualBox|VMware|docker|WSL|Loopback|tailscale|zerotier/i.test(name)) continue;
      candidates.push(addr.address);
    }
  }
  return (
    candidates.find((a) => a.startsWith("192.168.")) ??
    candidates.find((a) => a.startsWith("10.")) ??
    candidates[0] ??
    "localhost"
  );
}

const host = lanAddress();
const apiUrl = process.env.API_URL ?? `http://${host}:5000`;

console.log(`\n  Expo will use the API at ${apiUrl}`);
console.log("  Make sure the API is running in another terminal:  pnpm dev:api\n");

// Run Expo's CLI with this same Node binary — no shell needed on any OS.
const expoCli = require.resolve("expo/bin/cli", { paths: [__dirname] });
const child = spawn(process.execPath, [expoCli, "start", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: apiUrl,
    REACT_NATIVE_PACKAGER_HOSTNAME: host,
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
