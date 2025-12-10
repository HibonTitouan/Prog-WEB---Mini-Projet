# 🇫🇷 France Travail - Dashboard Assurance Chômage

![Statut](https://img.shields.io/badge/Status-Actif-success) ![Node](https://img.shields.io/badge/Node.js-v18+-green) ![License](https://img.shields.io/badge/License-MIT-blue)

Une application web interactive permettant de visualiser et d'analyser les indicateurs clés de l'assurance chômage en France. Le projet inclut un tableau de bord sécurisé avec cartographie dynamique et graphiques d'évolution.

## ✨ Fonctionnalités

* **Authentification sécurisée** : Système de login avec hachage de mots de passe (bcrypt) et gestion de sessions.
* **Tableau de bord interactif** : Visualisation des données via **Chart.js** (courbes, histogrammes, camemberts).
* **Cartographie** : Carte de France interactive avec **Leaflet** affichant la répartition des allocataires.
* **Filtres dynamiques** : Tri par année, mois, région et département.
* **Rôles utilisateurs** : Interface différenciée pour administrateurs et utilisateurs standards.

## 🛠️ Stack Technique

* **Backend** : Node.js, Express.js.
* **Base de données** : MySQL.
* **Frontend** : HTML5, Bootstrap 5.3, Vanilla JS.
* **Visualisation** : Chart.js, Leaflet.

## 🚀 Installation

### 1. Prérequis
Assurez-vous d'avoir **Node.js** et **MySQL** installés sur votre machine.

### 2. Cloner et installer
```bash
git clone [https://github.com/votre-user/projet-dashboard-fixe.git](https://github.com/votre-user/projet-dashboard-fixe.git)
cd projet-dashboard-fixe
npm install