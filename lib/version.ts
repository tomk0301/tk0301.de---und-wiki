import { version } from "../package.json";

if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Ungültige Wiki-Version");

export const WIKI_VERSION = version;
