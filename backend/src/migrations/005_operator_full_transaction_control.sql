-- Migracion 005: Habilitar control completo de transacciones para operadores
-- Permite que operadores puedan revertir transacciones completadas sin recrear la BD.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'transactions.revert'
WHERE r.name = 'operador'
ON CONFLICT DO NOTHING;
