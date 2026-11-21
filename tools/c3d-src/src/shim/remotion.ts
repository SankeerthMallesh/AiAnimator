// Stand-in for Remotion's staticFile in the browser port: files are fetched from a base URL.
let base = "./";
export const setStaticBase = (b: string) => { base = b.endsWith("/") ? b : b + "/"; };
export const staticFile = (p: string) => base + p;
