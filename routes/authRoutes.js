const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const authController = require('../controllers/authController');

// Registro
router.post('/register', async (req, res) => {
    const {
        username,
        firstName,
        lastName,
        gender,
        birthDate,
        email,
        password
    } = req.body;

    try {
        // Verifica campos requeridos
        if (!username || !firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        // Verifica si ya existe usuario con ese correo o nombre de usuario
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo o el nombre de usuario ya están registrados' });
        }

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            firstName,
            lastName,
            gender,
            birthDate,
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({ message: 'Usuario creado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Buscar usuario por correo
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        // Comparar contraseña en texto plano con el hash guardado
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Si todo va bien, puedes generar un token o simplemente responder OK
        res.status(200).json({ message: 'Login exitoso', username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});


module.exports = router;
