const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Registro usuario
router.post('/register', async (req, res) => {
    const { nombre_usuario, clave, rol } = req.body;

    try {
        let user = await Usuario.findOne({ nombre_usuario });
        if(user) return res.status(400).json({ msg: 'Usuario ya existe' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(clave, salt);

        user = new Usuario({
            nombre_usuario,
            clave: hash,
            rol: rol || 'vendedor'
        });

        await user.save();
        res.status(201).json({ msg: 'Usuario registrado' });

    } catch(err) {
        console.error(err);
        res.status(500).send('Error en el servidor');
    }
});

// Login usuario
router.post('/login', async (req, res) => {
    console.log('Datos recibidos en login:', req.body);  // <-- Aquí agregué el console.log

    const { nombre_usuario, clave } = req.body;

    try {
        const user = await Usuario.findOne({ nombre_usuario });
        if(!user) return res.status(400).json({ msg: 'Usuario no encontrado' });

        const isMatch = await bcrypt.compare(clave, user.clave);
        if(!isMatch) return res.status(400).json({ msg: 'Clave incorrecta' });

        const payload = { id: user._id, nombre_usuario: user.nombre_usuario, rol: user.rol };
        const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });

        res.json({ token });

    } catch(err) {
        console.error(err);
        res.status(500).send('Error en el servidor');
    }
});

module.exports = router;
