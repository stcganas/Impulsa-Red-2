async function check() {
  try {
    const res = await fetch("http://localhost:3000/api/health");
    console.log("Health:", await res.text());
    
    // Test auth without token
    const res2 = await fetch("http://localhost:3000/api/admin/system-status");
    console.log("Status without token:", res2.status, await res2.text());
  } catch (e) {
    console.error("fetch error:", e);
  }
}
check();
