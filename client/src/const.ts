export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
// Login state and code exchange stay on the server. The browser only navigates
// to this first-party route, so Google client secrets never reach the frontend.
export const startLogin = () => {
  window.location.assign("/api/auth/google");
};
