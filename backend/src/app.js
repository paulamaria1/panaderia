const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;


const uri = 'mongodb+srv://miUsuario:miPassword123@panaderiacluster.tfvkyzf.mongodb.net/?retryWrites=true&w=majority';

let db;

async function insertarCategoriaYProducto() {
  const categoriaExistente = await db.collection('categorias').findOne({ nombre_categoria: 'Panadería' });
  if (categoriaExistente) {
    console.log('ℹ️ La categoría "Panadería" ya existe, no se inserta nuevamente.');
    return;
  }

  const nuevaCategoria = {
    _id: new ObjectId(),
    nombre_categoria: 'Panadería'
  };

  await db.collection('categorias').insertOne(nuevaCategoria);
  console.log('🟢 Categoría insertada:', nuevaCategoria);

  const nuevoProducto = {
    nombre_producto: 'Pan Francés',
    id_categoria: nuevaCategoria._id,
    precio: 1500,
    cantidad: 100,
    fecha_ingreso: new Date()
  };

  await db.collection('productos').insertOne(nuevoProducto);
  console.log('🟢 Producto insertado:', nuevoProducto);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../frontend'));

async function main() {
  try {
    const client = await MongoClient.connect(uri);
    db = client.db('panaderia');
    console.log('✅ Conectado a MongoDB Atlas');

    await insertarCategoriaYProducto();

    const existeAdmin = await db.collection('usuarios').findOne({ nombre_usuario: 'admin' });
    if (!existeAdmin) {
      const hash = await bcrypt.hash('admin123', 10);
      await db.collection('usuarios').insertOne({
        nombre_usuario: 'admin',
        clave: hash,
        rol: 'admin'
      });
      console.log('🟢 Usuario admin creado con clave segura');
    }

    app.use(express.urlencoded({ extended: true }));

    app.use(session({
      secret: 'mi_secreto_super_seguro',
      resave: false,
      saveUninitialized: false,
      cookie: {
        sameSite: 'lax',
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60,
      }
    }));

    app.use(express.static(path.join(__dirname, '../../frontend')));
    
 app.get('/', (req, res) => {
  res.redirect('/login');
});
    // RUTAS

    app.get('/login', (req, res) => {
      res.sendFile(path.join(__dirname, '../../frontend/login.html'));
    });

    app.post('/login', async (req, res) => {
      const { nombre_usuario, clave } = req.body;
      const usuario = await db.collection('usuarios').findOne({ nombre_usuario });

      if (usuario) {
        const match = await bcrypt.compare(clave, usuario.clave);
        if (match) {
          req.session.user = usuario;
          req.session.save(err => {
            if (err) {
              console.error('Error guardando sesión:', err);
              return res.send('Error en sesión');
            }
            return res.redirect('/dashboard');
          });
          return;
        }
      }
      res.send('❌ Usuario o clave incorrecta');
    });

    app.get('/dashboard', (req, res) => {
      if (!req.session.user) return res.redirect('/login');
      res.render('dashboard', { nombre_usuario: req.session.user.nombre_usuario });
    });

    app.get('/productos', async (req, res) => {
      if (!req.session.user) return res.redirect('/login');

      const productos = await db.collection('productos').aggregate([
        {
          $lookup: {
            from: 'categorias',
            localField: 'id_categoria',
            foreignField: '_id',
            as: 'categoria'
          }
        },
        {
          $unwind: {
            path: '$categoria',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            nombre_producto: 1,
            precio: 1,
            cantidad: 1,
            fecha_ingreso: 1,
            nombre_categoria: '$categoria.nombre_categoria'
          }
        }
      ]).toArray();

      res.render('productos', { productos });
    });

    app.get('/productos/nuevo', async (req, res) => {
      if (!req.session.user) return res.redirect('/login');
      const categorias = await db.collection('categorias').find().toArray();
      res.render('agregar_producto', { categorias });
    });

    app.post('/productos', async (req, res) => {
      const { nombre_producto, id_categoria, precio, cantidad } = req.body;
      await db.collection('productos').insertOne({
        nombre_producto,
        id_categoria: new ObjectId(id_categoria),
        precio: parseFloat(precio),
        cantidad: parseInt(cantidad),
        fecha_ingreso: new Date()
      });
      res.redirect('/productos');
    });

    // RUTAS NUEVAS PARA EDITAR Y ELIMINAR PRODUCTOS

    app.get('/productos/editar/:id', async (req, res) => {
      if (!req.session.user) return res.redirect('/login');
      const producto = await db.collection('productos').findOne({ _id: new ObjectId(req.params.id) });
      const categorias = await db.collection('categorias').find().toArray();
      res.render('editar_producto', { producto, categorias });
    });

    app.post('/productos/editar/:id', async (req, res) => {
      const { nombre_producto, id_categoria, precio, cantidad } = req.body;
      await db.collection('productos').updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            nombre_producto,
            id_categoria: new ObjectId(id_categoria),
            precio: parseFloat(precio),
            cantidad: parseInt(cantidad)
          }
        }
      );
      res.redirect('/productos');
    });

    app.post('/productos/eliminar/:id', async (req, res) => {
      await db.collection('productos').deleteOne({ _id: new ObjectId(req.params.id) });
      res.redirect('/productos');
    });

    // --- RUTAS NUEVAS PARA CATEGORIAS ---

    app.get('/categorias', async (req, res) => {
      if (!req.session.user) return res.redirect('/login');
      const categorias = await db.collection('categorias').find().toArray();
      res.render('categorias', { categorias });
    });

    app.get('/categorias/nuevo', (req, res) => {
      if (!req.session.user) return res.redirect('/login');
      res.render('agregar_categoria');
    });

    app.post('/categorias', async (req, res) => {
      const { nombre_categoria } = req.body;
      await db.collection('categorias').insertOne({ nombre_categoria });
      res.redirect('/categorias');
    });

    // RUTAS NUEVAS PARA EDITAR Y ELIMINAR CATEGORÍAS

    app.get('/categorias/editar/:id', async (req, res) => {
      if (!req.session.user) return res.redirect('/login');
      const categoria = await db.collection('categorias').findOne({ _id: new ObjectId(req.params.id) });
      res.render('editar_categoria', { categoria });
    });

    app.post('/categorias/editar/:id', async (req, res) => {
      const { nombre_categoria } = req.body;
      await db.collection('categorias').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { nombre_categoria } }
      );
      res.redirect('/categorias');
    });

    app.post('/categorias/eliminar/:id', async (req, res) => {
      await db.collection('categorias').deleteOne({ _id: new ObjectId(req.params.id) });
      res.redirect('/categorias');
    });
    // --------------------- RUTAS PARA PROVEEDORES ---------------------

app.get('/proveedores', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const proveedores = await db.collection('proveedores').find().toArray();
  res.render('proveedores', { proveedores });
});

app.get('/proveedores/nuevo', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('agregar_proveedor');
});

app.post('/proveedores', async (req, res) => {
  const { nombre_proveedor, telefono, direccion } = req.body;
  await db.collection('proveedores').insertOne({ nombre_proveedor, telefono, direccion });
  res.redirect('/proveedores');
});

app.get('/proveedores/editar/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const proveedor = await db.collection('proveedores').findOne({ _id: new ObjectId(req.params.id) });
  res.render('editar_proveedor', { proveedor });
});

app.post('/proveedores/editar/:id', async (req, res) => {
  const { nombre_proveedor, telefono, direccion } = req.body;
  await db.collection('proveedores').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { nombre_proveedor, telefono, direccion } }
  );
  res.redirect('/proveedores');
});

app.post('/proveedores/eliminar/:id', async (req, res) => {
  await db.collection('proveedores').deleteOne({ _id: new ObjectId(req.params.id) });
  res.redirect('/proveedores');
});


// Mostrar todas las ventas con detalle de productos
app.get('/ventas', async (req, res) => {
  if (!req.session?.user) return res.redirect('/login');

  try {
    const ventas = await db.collection('ventas').aggregate([
      {
        $lookup: {
          from: 'productos',
          localField: 'id_producto',
          foreignField: '_id',
          as: 'producto'
        }
      },
      { $unwind: '$producto' },
      {
        $project: {
          cantidad_vendida: 1,
          fecha_venta: 1,
          nombre_producto: '$producto.nombre_producto',
          precio_unitario: '$producto.precio',
          total: { $multiply: ['$cantidad_vendida', '$producto.precio'] }
        }
      }
    ]).toArray();

    const productos = await db.collection('productos').find().toArray();

    res.render('ventas', { ventas, productos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error cargando ventas y productos');
  }
});

// Formulario nueva venta
app.get('/ventas/nuevo', async (req, res) => {
  if (!req.session?.user) return res.redirect('/login');
  try {
    const productos = await db.collection('productos').find().toArray();
    res.render('agregar_venta', { productos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error cargando productos');
  }
});

// Crear venta
app.post('/ventas', async (req, res) => {
  try {
    const { id_producto, cantidad_vendida, fecha_venta } = req.body;

    const producto = await db.collection('productos').findOne({ _id: new ObjectId(id_producto) });
    if (!producto) return res.send('Producto no encontrado');

    const cantidadVendida = parseInt(cantidad_vendida);
    if (cantidadVendida > producto.cantidad) return res.send('No hay suficiente stock');

    await db.collection('ventas').insertOne({
      id_producto: new ObjectId(id_producto),
      cantidad_vendida: cantidadVendida,
      fecha_venta: new Date(fecha_venta)
    });

    await db.collection('productos').updateOne(
      { _id: new ObjectId(id_producto) },
      { $inc: { cantidad: -cantidadVendida } }
    );

    res.redirect('/ventas');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error procesando la venta');
  }
});

// Formulario editar venta
app.get('/ventas/editar/:id', async (req, res) => {
  if (!req.session?.user) return res.redirect('/login');

  try {
    const ventaId = req.params.id;
    if (!ObjectId.isValid(ventaId)) return res.send('ID inválido');

    const venta = await db.collection('ventas').findOne({ _id: new ObjectId(ventaId) });
    if (!venta) return res.send('Venta no encontrada');

    const productos = await db.collection('productos').find().toArray();

    res.render('editar_venta', { venta, productos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error cargando la venta');
  }
});

// Procesar edición de venta
app.post('/ventas/editar/:id', async (req, res) => {
  if (!req.session?.user) return res.redirect('/login');

  try {
    const ventaId = req.params.id;
    if (!ObjectId.isValid(ventaId)) return res.send('ID inválido');

    const { id_producto, cantidad_vendida, fecha_venta } = req.body;
    const cantidadVendidaNueva = parseInt(cantidad_vendida);

    const ventaAnterior = await db.collection('ventas').findOne({ _id: new ObjectId(ventaId) });
    if (!ventaAnterior) return res.send('Venta no encontrada');

    const productoNuevo = await db.collection('productos').findOne({ _id: new ObjectId(id_producto) });
    if (!productoNuevo) return res.send('Producto no encontrado');

    // Ajustar stock:
    // 1. Devolver stock vendido anteriormente al producto antiguo
    await db.collection('productos').updateOne(
      { _id: new ObjectId(ventaAnterior.id_producto) },
      { $inc: { cantidad: ventaAnterior.cantidad_vendida } }
    );

    // 2. Restar el nuevo stock vendido al producto nuevo
    if (cantidadVendidaNueva > productoNuevo.cantidad) {
      // revertimos devolución de stock porque no hay suficiente en nuevo producto
      await db.collection('productos').updateOne(
        { _id: new ObjectId(ventaAnterior.id_producto) },
        { $inc: { cantidad: -ventaAnterior.cantidad_vendida } }
      );
      return res.send('No hay suficiente stock para esta venta');
    }

    await db.collection('productos').updateOne(
      { _id: new ObjectId(id_producto) },
      { $inc: { cantidad: -cantidadVendidaNueva } }
    );

    // Actualizar venta
    await db.collection('ventas').updateOne(
      { _id: new ObjectId(ventaId) },
      {
        $set: {
          id_producto: new ObjectId(id_producto),
          cantidad_vendida: cantidadVendidaNueva,
          fecha_venta: new Date(fecha_venta)
        }
      }
    );

    res.redirect('/ventas');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error actualizando la venta');
  }
});

// Eliminar venta
app.post('/ventas/eliminar/:id', async (req, res) => {
  if (!req.session?.user) return res.redirect('/login');

  try {
    const ventaId = req.params.id;
    if (!ObjectId.isValid(ventaId)) return res.send('ID inválido');

    const venta = await db.collection('ventas').findOne({ _id: new ObjectId(ventaId) });
    if (!venta) return res.send('Venta no encontrada');

    // Devolver stock producto
    await db.collection('productos').updateOne(
      { _id: new ObjectId(venta.id_producto) },
      { $inc: { cantidad: venta.cantidad_vendida } }
    );

    // Eliminar venta
    await db.collection('ventas').deleteOne({ _id: new ObjectId(ventaId) });

    res.redirect('/ventas');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error eliminando la venta');
  }
});

    app.listen(port, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
    });

  } catch (err) {
    console.error('❌ Error conectando a MongoDB', err);
  }
}

main();
