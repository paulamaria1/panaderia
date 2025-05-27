const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://miUsuario:miPassword123@panaderiacluster.tfvkyzf.mongodb.net/?retryWrites=true&w=majority&appName=PanaderiaCluster";

const client = new MongoClient(uri);

async function conectar() {
    try {
        await client.connect();
        console.log("Conectado a MongoDB Atlas");
        // Aquí puedes usar client.db('nombreBaseDatos') para acceder a tu DB
    } catch (err) {
        console.error(err);
    }
}

module.exports = { conectar, client };
