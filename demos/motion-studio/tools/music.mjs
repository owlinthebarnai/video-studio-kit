import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url";
const { renderMusic } = await import(pathToFileURL(path.join(process.env.TVHEAD_STUDIO || path.join(os.homedir(), "tvhead-studio"), "lib/music.mjs")).href);
const tl = (await import("../src/timeline.json", { with: { type: "json" } })).default;
renderMusic({ preset: "epic", duration: tl.total / tl.fps + 0.5, seed: 41 }, path.resolve(import.meta.dirname, "../public/music.mp3"));
console.log("ok");
