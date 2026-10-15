async function check() {
  try {
    const res = await fetch("http://localhost:3000/api/admin/dashboard-data");
    console.log("Status:", res.status, await res.text());
  } catch (e) {
    console.error("fetch error:", e);
  }
}
check();
