// Reads a password on stdin and prints its DASHBOARD_PASSWORD_HASH value.
// Used by ../../set-password.sh; never echoes the password.
import { hashPassword } from '../auth.js';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', async () => {
  const password = input.replace(/\r?\n$/, '');
  if (password.length < 12) {
    console.error('Password must be at least 12 characters.');
    process.exit(1);
  }
  console.log(await hashPassword(password));
});
