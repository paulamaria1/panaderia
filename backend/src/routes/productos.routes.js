const express = require('express');
const router = express.Router();
const Producto = require('../models/producto');

router.post('/registrar', async (req, res) => {
    try {
        const producto = new Producto(req.body);
        await producto.save();
        res.status(201).json({ mensaje: 'Producto registrado' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const productos = await Producto.find();
    res.json(productos);
});

module.exports = router;
