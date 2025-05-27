// models/Producto.js
const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre_producto: { type: String, required: true },
  id_categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria' },
  precio: { type: Number, required: true },
  cantidad: { type: Number, required: true },
  fecha_ingreso: { type: Date, required: true }
});

module.exports = mongoose.model('Producto', productoSchema);
