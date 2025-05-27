// crearUsuario.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const uri = 'mongodb+srv://miUsuario:miPassword123@panaderiacluster.tfvkyzf.mongodb.net/panaderia';

const UsuarioSchema = new mongoose.Schema({
  nombre_usuario: { type: String, required: true, unique: true },
  clave: { type: String, required: true },
  rol: { type: String, enum: ['admin', 'vendedor'], default: 'vendedor' }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);

async function crearUsuario() {
  await mongoose.connect(uri);

  const claveHash = await bcrypt.hash('admin123', 10);  // Hashea la contraseña

  const usuario = new Usuario({
    nombre_usuario: 'admin',
    clave: claveHash,
    rol: 'admin'
  });

  await usuario.save();
  console.log('Usuario creado con clave hasheada');
  mongoose.disconnect();
}

crearUsuario().catch(console.error);
