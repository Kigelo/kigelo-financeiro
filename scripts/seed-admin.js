// Cria o primeiro administrador do sistema.
// Uso: DATABASE_URL=... node scripts/seed-admin.js "Seu Nome" "voce@kigelo.com" "senha-forte"
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Uso: node scripts/seed-admin.js "Nome" "email" "senha"');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, active)
     VALUES ($1,$2,$3,'ADMIN',true)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [name, email, hash]
  );
  console.log('Administrador criado:', email);
  await pool.end();
}
main();
