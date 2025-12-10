// hashUtil.js
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

function hashPassword(password) {
    // Retourne une Promise -> à utiliser avec await
    return bcrypt.hash(password, SALT_ROUNDS);
}

function comparePassword(password, hashedPassword) {
    // Compare le mot de passe en clair avec le hash stocké en BDD
    return bcrypt.compare(password, hashedPassword);
}

module.exports = {
    hashPassword,
    comparePassword
};
