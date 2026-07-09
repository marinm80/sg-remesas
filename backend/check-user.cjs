const { Client } = require('pg');
const path = require('path');

// Load environment variables from local .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://remesas_user:remesas_password@localhost:5432/sg_remesas_db';

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, u.is_active, u.email_verified
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1
    `, ['euclidesm195@gmail.com']);

    if (res.rows.length > 0) {
      console.log('--- DETALLES DEL USUARIO ---');
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('El usuario euclidesm195@gmail.com no fue encontrado en la base de datos.');
    }
  } catch (err) {
    console.error('Error al consultar:', err.message);
  } finally {
    await client.end();
  }
}

main();
