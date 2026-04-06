import { defineEventHandler, getRequestHost, getRequestURL, sendRedirect } from "h3";

export default defineEventHandler((event) => {
  const host = getRequestHost(event);
  if (host.startsWith("www.")) {
    const url = getRequestURL(event);
    const target = `${url.protocol}//${host.slice(4)}${url.pathname}${url.search}`;
    return sendRedirect(event, target, 301);
  }
});
