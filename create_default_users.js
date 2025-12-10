// create_default_users.js
const mysql = require('mysql2/promise');
const { hashPassword } = require('./hashUtil');

async function createDefaultUsers() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'projet_tp9'
    });

    // Hash des mots de passe
    const adminHash = await hashPassword('admin1234');
    const userHash  = await hashPassword('user1234');

    const sql = `
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            password = VALUES(password),
            role = VALUES(role)
    `;

    await connection.execute(sql, ['admin', adminHash, 'admin']);
    await connection.execute(sql, ['user',  userHash,  'user']);

    console.log('Utilisateurs admin et user créés/mis à jour avec succès.');
    await connection.end();
}

createDefaultUsers()
    .then(() => {
        console.log('Terminé.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Erreur lors de la création des utilisateurs :', err);
        process.exit(1);
    });
