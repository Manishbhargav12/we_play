// Very small password check for the admin API.
// The dashboard sends the password in the `x-admin-password` header.
// Swap this for a proper session/JWT scheme if you need multiple
// admin accounts or finer-grained access later.
function isAuthorized(req) {
  const provided = req.headers['x-admin-password'];
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Fail closed if the env var was never set.
    return false;
  }
  return provided === expected;
}

module.exports = { isAuthorized };
