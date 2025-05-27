// models/Categoria.js
const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nombre_categoria: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Categoria', categoriaSchema);
