export const detectPlatform = (userAgent = "") => {
  const ua = userAgent.toLowerCase();

  if (
    ua.includes("android") ||
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("mobile") ||
    ua.includes("okhttp") ||  // typical for native HTTP clients
    ua.includes("flutter") ||
    ua.includes("reactnative") ||
    ua.includes("wv") || // webview
    ua.includes("vscode")
  ) {
    return "mobile";
  }

  return "web";
};
