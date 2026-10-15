// Try fetching API
async function check() {
  try {
    const res = await fetch("http://localhost:3000/api/health");
    console.log("Health:", res.status, await res.text());
  } catch (e) {
    console.error("Health fetch error:", e);
  }
}
check();
