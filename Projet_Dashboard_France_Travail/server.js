const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { comparePassword } = require('./hashUtil');

const app = express();
const port = 8080;

// Connexion BDD
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'projet_tp9'
});

db.connect(err => {
    if (err) {
        console.error('Erreur de connexion à MySQL :', err);
        process.exit(1);
    }
    console.log('Connecté à MySQL.');
});

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'cle_secrete_projet',
    resave: false,
    saveUninitialized: true
}));

/* -------------------------------------------------------------------------- */
/*                                  ROUTES                                     */
/* -------------------------------------------------------------------------- */

// Page de login
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        return res.redirect('/dashboard');
    }
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Authentification
app.post('/auth', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.send("Veuillez entrer identifiant et mot de passe <a href='/'>Retour</a>");
    }

    db.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, results) => {
            if (err) return res.send("Erreur SQL");

            if (results.length === 0) {
                return res.send("Utilisateur inconnu <a href='/'>Retour</a>");
            }

            const user = results[0];
            const match = await comparePassword(password, user.password);

            if (!match) {
                return res.send("Mot de passe incorrect <a href='/'>Retour</a>");
            }

            // Login OK
            req.session.loggedin = true;
            req.session.username = username;
            req.session.role = user.role || 'user';

            return res.redirect('/dashboard');
        }
    );
});

/* -------------------------------------------------------------------------- */
/*                       PROTECTION DES PAGES INTERNES                         */
/* -------------------------------------------------------------------------- */

function requireLogin(req, res, next) {
    if (!req.session.loggedin) return res.redirect('/');
    next();
}

// Choix de la vue selon le rôle
app.get('/dashboard', requireLogin, (req, res) => {
    const role = req.session.role || 'user';
    const file = role === 'admin' ? 'dashboard_admin.html' : 'dashboard_user.html';
    res.sendFile(path.join(__dirname, 'public', file));
});

// Compatibilité ancienne URL
app.get('/dashboard.html', requireLogin, (req, res) => {
    res.redirect('/dashboard');
});

// Page des indicateurs complémentaires
app.get('/indicateurs.html', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'indicateurs.html'));
});

/* -------------------------------------------------------------------------- */

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
