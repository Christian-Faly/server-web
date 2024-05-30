const Pool = require('pg').Pool;

module.exports.connecter = function (bdd) { 
    return new Pool({
        user : 'postgres',
        password : 'vony',
        host: 'localhost',
        port : 5432,
        database : bdd
    });
};
// Configuration de la connexion a la base de donnee