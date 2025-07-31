//MODULARIZAMOS
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const express = require('express')
const handlebars = require('express-handlebars')
const app = express()
const PORT = 8080;

const server = http.createServer(app);
const io = new Server(server);

mongoose.connect("mongodb+srv://JuanLopez:aprendiendomongo@cluster0.5hk5pzr.mongodb.net/productos")
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err)); 

const Product = require('./models/productos.model.js');
const Cart = require('./models/cart.model.js');

app.use(express.json());

const hbs = handlebars.create({
  helpers: {
    eq: (a, b) => a == b,
    multiply: (a, b) => a * b,
    totalPrice: (products) => {
      let total = 0;
      products.forEach(p => {
        total += p.quantity * p.product.price;
      });
      return total.toFixed(2);
    }
  }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');


//NO SE USA (ES PARA FORMS)
app.use(express.static('public'))
app.use(express.urlencoded({extended:true}))

//GET
app.get('/', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const category = req.query.category;
      const status = req.query.status;
      const sort = req.query.sort;

      const filter = {};
      if (category) filter.category = category;
      if (status !== undefined) {
        if (status === 'true') filter.status = true;
        else if (status === 'false') filter.status = false;
      }

      let sortOption = {};
      if (sort === 'asc') sortOption.price = 1;
      else if (sort === 'desc') sortOption.price = -1;

      const totalDocs = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalDocs / limit);
      const currentPage = page > totalPages ? totalPages : page;


      const productos = await Product.find(filter)
        .sort(sortOption)
        .skip((currentPage - 1) * limit)
        .limit(limit)
        .lean();

      res.render('home', {
        layout: 'main',
        title: 'Lista de Productos',
        productos,
        pagination: {
          totalPages,
          currentPage,
          hasPrevPage: currentPage > 1,
          hasNextPage: currentPage < totalPages,
          prevPage: currentPage > 1 ? currentPage - 1 : null,
          nextPage: currentPage < totalPages ? currentPage + 1 : null,
          category,
          status,
          sort,
          limit
        }
      });

    } catch (err) {
      res.status(500).send('Error al obtener productos: ' + err.message);
    }
});




app.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = req.query.query;
    const sort = req.query.sort;

    const filter = {};
    if (query) {
      filter.$or = [
        { category: query },
        { status: query === 'true' ? true : query === 'false' ? false : undefined }
      ];
    }

    const sortOption = {};
    if (sort === 'asc') sortOption.price = 1;
    if (sort === 'desc') sortOption.price = -1;

    const totalDocs = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalDocs / limit);
    const currentPage = page > totalPages ? totalPages : page;

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip((currentPage - 1) * limit)
      .limit(limit);

    res.json({
      status: 'success',
      payload: products,
      totalPages,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      page: currentPage,
      hasPrevPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
      prevLink: currentPage > 1 ? `/products?page=${currentPage - 1}` : null,
      nextLink: currentPage < totalPages ? `/products?page=${currentPage + 1}` : null
    });

  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});


app.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar producto', details: err.message });
    }
});
app.get('/api/carts/:cid', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid).populate('products.product');
    if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' });

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener carrito', details: err.message });
  }
});

app.get('/realtimeproducts', async (req, res) => {
  try {
    const productos = await Product.find().lean();
    res.render('realTimeProducts', {
      layout: 'main',
      title: 'Lista Tiempo Real',
      productos
    });
  } catch (err) {
    res.status(500).send('Error al obtener productos: ' + err.message);
  }
});



//POST
app.post('/products', async (req, res) => {
  const {
    title, description, code, price, status = true, stock, category, thumbnails = []
  } = req.body;

  if (!title || !description || !code || price == null || stock == null || !category) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  try {
    const existing = await Product.findOne({ code });
    if (existing) return res.status(400).json({ error: 'Ya existe un producto con ese código.' });

    const newProduct = new Product({
      title,
      description,
      code,
      price,
      status,
      stock,
      category,
      thumbnails
    });

    const savedProduct = await newProduct.save();

    io.emit('productos', await Product.find()); // Actualiza todos los clientes
    res.status(201).json({ mensaje: 'Producto agregado exitosamente', producto: savedProduct });

  } catch (err) {
    res.status(500).json({ error: 'Error al guardar producto', details: err.message });
  }
});


app.post('/api/carts', async (req, res) => {
  try {
    const newCart = new Cart({ products: [] }); // carrito vacío
    const savedCart = await newCart.save();
    res.status(201).json({ mensaje: 'Carrito creado', carrito: savedCart });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear carrito', details: err.message });
  }
});

app.post('/api/carts/:cid/products/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' });

    const productInCart = cart.products.find(p => p.product.toString() === pid);

    if (productInCart) {
      productInCart.quantity += 1;
    } else {
      cart.products.push({ product: pid, quantity: 1 });
    }

    await cart.save();

    res.json({ mensaje: 'Producto agregado al carrito', carrito: cart });
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar producto', details: err.message });
  }
});


//PUT
app.put('/products/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) return res.status(404).json({ error: 'Producto no encontrado' });

    io.emit('productos', await Product.find());
    res.json({ mensaje: 'Producto actualizado', producto: updatedProduct });

  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto', details: err.message });
  }
});

app.put('/api/carts/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const { products } = req.body; // [{ product: <id>, quantity: <num> }, ...]

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'El body debe incluir un arreglo de productos.' });
    }

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' });

    cart.products = products;
    await cart.save();

    res.json({ mensaje: 'Carrito actualizado', carrito: cart });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar carrito', details: err.message });
  }
});

app.put('/api/carts/:cid/products/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ error: 'Cantidad inválida.' });
    }

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' });

    const productInCart = cart.products.find(p => p.product.toString() === pid);
    if (!productInCart) {
      return res.status(404).json({ error: 'Producto no encontrado en el carrito.' });
    }

    productInCart.quantity = quantity;
    await cart.save();

    res.json({ mensaje: 'Cantidad actualizada', carrito: cart });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cantidad', details: err.message });
  }
});


//DELETE
app.delete('/products/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ error: 'Producto no encontrado' });

    io.emit('productos', await Product.find());
    res.json({ mensaje: 'Producto eliminado exitosamente' });

  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto', details: err.message });
  }
});
app.delete('/api/carts/:cid/products/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' });

    cart.products = cart.products.filter(p => p.product.toString() !== pid);
    await cart.save();

    res.json({ mensaje: 'Producto eliminado del carrito', carrito: cart });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto', details: err.message });
  }
});

app.delete('/api/carts/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' });

    cart.products = [];
    await cart.save();

    res.json({ mensaje: 'Carrito vaciado', carrito: cart });
  } catch (err) {
    res.status(500).json({ error: 'Error al vaciar carrito', details: err.message });
  }
});


//PARA INICIAR EL SERVIDOR
server.listen(PORT, () => {
    console.log(`Servidor levantado en http://localhost:${PORT}`);
});

io.on('connection', async (socket) => {
  console.log('Nuevo cliente conectado');

  const productos = await Product.find().lean();
  socket.emit('productos', productos);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});