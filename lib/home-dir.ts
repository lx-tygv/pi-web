import { homedir as nodeHomedir } from "os";

// @vercel/nft (Next's build-time file tracer) installs a mock for the "os"
// module whose homedir() it evaluates to the build machine's real home
// directory. Combined with its fs mock, any fs call whose argument is derived
// from homedir() — readdirSync(homedir()), stat(path.join(homedir(), ...)) —
// is then expanded into a recursive glob over the whole user profile at build
// time. On machines with cloud-sync drivers (Baidu Netdisk and friends) that
// walk dies: placeholder files return EPERM instead of EINVAL on readlink,
// which fails the production build.
//
// A fresh arrow function is a value the evaluator cannot attribute to the os
// mock, so every call site importing this wrapper stays statically unknown;
// runtime behavior is unchanged.
export const homedir = (() => nodeHomedir()) as () => string;
