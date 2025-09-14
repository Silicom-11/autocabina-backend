const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Agrega esto a tu .env

exports.register = async (req, res) => {
  try {
    const {
      username, firstName, lastName, gender, birthDate,
      email, password
    } = req.body;

    if (!username || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Campos requeridos faltantes' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Correo o usuario ya registrados' });
    }

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

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ msg: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '3h',
    });

    res.status(200).json({ token, userId: user._id, email: user.email });
  } catch (err) {
    res.status(500).json({ msg: 'Error en el servidor' });
  }
};

// 🔐 Iniciar sesión o registrarse con Google
exports.loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    // ✨ Debugging logs
    console.log('📧 Google login request received');
    console.log('📋 Request body:', req.body);
    console.log('🎫 idToken received:', idToken ? 'TOKEN_PRESENT' : 'TOKEN_MISSING');
    console.log('🎫 idToken length:', idToken ? idToken.length : 0);
    console.log('🔑 GOOGLE_CLIENT_ID configured:', process.env.GOOGLE_CLIENT_ID ? 'YES' : 'NO');
    
    if (!idToken) {
      console.error('❌ No idToken provided');
      return res.status(400).json({ msg: 'idToken es requerido' });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, sub } = payload;
    
    // ✨ More debugging logs
    console.log('✅ Token verified successfully');
    console.log('👤 User payload:', { email, given_name, family_name, sub });

    let user = await User.findOne({ email });

    // Si no existe, crear usuario automático
    if (!user) {
      console.log('🆕 Creating new user for email:', email);
      user = new User({
        username: `google_${sub}`,
        firstName: given_name || 'Usuario',
        lastName: family_name || 'Google', // Valor por defecto si no viene family_name
        email,
        password: await bcrypt.hash(sub, 10), // Valor dummy, ya que se usa Google
      });
      await user.save();
      console.log('✅ New user created with ID:', user._id);
    } else {
      console.log('👋 Existing user found:', user._id);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '3h',
    });

    console.log('🎉 Login successful, sending response for user:', user.email);
    res.status(200).json({
      token,
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ msg: 'Token de Google inválido' });
  }
};
