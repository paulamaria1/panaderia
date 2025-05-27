const bcrypt = require('bcryptjs');

async function test() {
  const plainPassword = 'admin123';

  // Pega aquí la contraseña hasheada que tienes guardada en la base de datos
  const hashedPassword = '<aquí-va-tu-hash-de-la-DB>';

  const match = await bcrypt.compare(plainPassword, hashedPassword);

  console.log('¿Coincide la contraseña?', match);
}

test();
