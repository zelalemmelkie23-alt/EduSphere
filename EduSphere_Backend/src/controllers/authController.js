function createAuthController(authService, { cookieName, secureCookie }) {
  const cookieOptions = [
    `Path=/api/v1`,
    `HttpOnly`,
    `SameSite=Strict`,
    ...(secureCookie ? ["Secure"] : [])
  ].join("; ");

  function setSessionCookie(res, token, expiresAt) {
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(token)}; ${cookieOptions}; Max-Age=${maxAge}; Expires=${expiresAt.toUTCString()}`);
  }

  function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", `${cookieName}=; ${cookieOptions}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
  }

  function requestInfo(req) {
    return {
      ipAddress: req.ip,
      requestId: req.get("x-request-id")?.slice(0, 100) || null
    };
  }

  return {
    async login(req, res) {
      const result = await authService.login({
        email: req.body?.email,
        password: req.body?.password,
        ...requestInfo(req),
        userAgent: req.get("user-agent")
      });
      req.clearLoginRateLimit?.();
      setSessionCookie(res, result.token, result.expiresAt);
      res.status(200).json({
        message: "Login successful.",
        data: { user: result.user, expiresAt: result.expiresAt.toISOString() }
      });
    },

    async logout(req, res) {
      await authService.logout(req.authSessionHash, req.auth, requestInfo(req));
      clearSessionCookie(res);
      res.status(200).json({ message: "Logout successful." });
    },

    me(req, res) {
      res.status(200).json({ data: { user: req.auth } });
    },

    async changePassword(req, res) {
      await authService.changePassword({
        user: req.auth,
        currentPassword: req.body?.currentPassword,
        newPassword: req.body?.newPassword,
        ...requestInfo(req)
      });
      clearSessionCookie(res);
      res.status(200).json({ message: "Password changed. Please log in again." });
    },

    setSessionCookie,
    clearSessionCookie
  };
}

module.exports = createAuthController;
