const User = require('../models/User'); // Importamos nuestro "Plano" de usuario
const bcrypt = require('bcryptjs');     // El cerrajero de contraseñas
const jwt = require('jsonwebtoken');    // El generador de pases VIP

// ----------------------------------------------------
// FUNCION 1: REGISTRAR UN NUEVO USUARIO
// ----------------------------------------------------
exports.register = async (req, res) => {
  try {
    // 1. Recibimos los datos que vienen del frontend (React)
    const { name, email, password } = req.body;

    // 2. ¿El usuario ya existe? Buscamos en MySQL si ese correo ya está registrado
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ mensaje: 'Este correo ya está en uso' });
    }

    // 3. Encriptar la contraseña (¡Nunca se guarda en texto plano!)
    // Un "salt" es texto aleatorio que se le suma a la contraseña para hacerla indescifrable
    const salt = await bcrypt.genSalt(10); 
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Crear el usuario en la Base de Datos
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword // Guardamos la versión encriptada
    });

    // 5. Crear el Token (El pase VIP)
    // El 'payload' es la información pública que viaja dentro del token
    const payload = { userId: newUser.id };
    
    // Firmamos el token con nuestra palabra secreta. Expira en 8 horas.
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // 6. Le respondemos al Frontend con éxito
    res.status(201).json({ 
      mensaje: 'Usuario creado exitosamente', 
      token, // React guardará esto
      user: { name: newUser.name, email: newUser.email } 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

// ----------------------------------------------------
// FUNCION 2: INICIAR SESIÓN (LOGIN)
// ----------------------------------------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Buscar al usuario por su correo
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // 2. Comparar la contraseña que escribió con la encriptada en MySQL
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // 3. Si todo está bien, generamos un nuevo Token
    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ 
      mensaje: 'Login exitoso', 
      token, 
      user: { name: user.name, email: user.email } 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};