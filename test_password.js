const bcrypt = require('bcryptjs');

const hash = "$2b$10$etZc/Q89M4.zlmPlsU6mVe1UndA8gi3dsK9uOPwtKaTv6X5Pw75vu"; // hash que tienes guardado
const password = "admin123"; // la contraseña que crees que corresponde

bcrypt.compare(password, hash, (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log('¿Coincide la contraseña?', res);
  }
});
