import 'dotenv/config';

async function run() {
  const response = await fetch('http://localhost:3000/api/admin/notifications/all', {
    method: 'DELETE',
    headers: {
      // Need an admin session... this is hard to mock without user credentials.
    }
  });
}
run();
