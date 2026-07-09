import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Registrar error para logs
pool.on('error', (err) => {
  console.error('Error inesperado en cliente inactivo de base de datos:', err);
});

export default pool;
