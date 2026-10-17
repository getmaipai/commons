/** What to tell a person whose browser will not share its location, naming the exact place to change it. Safari has
 * its own per-site Location setting; other browsers keep it in the address bar's site settings. Never throws. */
export function locationBlockedHelp(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const safari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edg|android/i.test(ua);
  const host = typeof location === "undefined" || !location.hostname ? "this site" : location.hostname;
  return safari
    ? `Location is blocked. In Safari, choose Safari > Settings > Websites > Location, set ${host} to Allow, then try again.`
    : "Location is blocked. Allow it in your browser's site settings for this page, then try again.";
}
