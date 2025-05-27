const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://miUsuario:miPassword123@panaderiacluster.tfvkyzf.mongodb.net/?retryWrites=true&w=majority';

async function actualizarClave() {
  const client = await MongoClient.connect(uri);
  const db = client.db('panaderia');

  const hash = await bcrypt.hash('admin123', 10); // Cambia 'admin123' por la contraseña que quieras usar

  const result = await db.collection('usuarios').updateOne(
    { nombre_usuario: 'admin' },  // Usuario a actualizar
    { $set: { clave: hash } }
  );

  console.log('Usuario actualizado:', result.modifiedCount);

  client.close();
}

actualizarClave();
