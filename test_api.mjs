import fetch from 'node-fetch';

async function testFetch() {
  const token = 'not-a-real-jwt-but-long-enough-to-pass-length-checks-1234567890';
  const res = await fetch('http://localhost:3000/api/admin/system-status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(res.status, await res.text());
}
testFetch();
