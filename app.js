//MODULARIZAMOS
const { ProductManager } = require('./public/js/productmanager.js');
const { CartManager } = require('./public/js/cartmanager.js');
const cartManager = new CartManager();
const manager = new ProductManager();
const fs = require('fs')
const path = require('path')
const productsFilePath = path.join(__dirname, 'data', 'products.json');
const express = require('express')
const app = express()
const PORT = 8080;
app.use(express.json());


//GET
app.get('/', (req,res)=>{
    res.send("<h1>Puerto levantado</h1>")
})
app.get('/products', (req, res)=>{
    fs.readFile(productsFilePath, 'utf-8', (error,data)=>{
        if(error){
            return res.status(500).json({
                error: 'error en la conexión'
            })
        }
        try {
            const productos = JSON.parse(data);
            res.json(productos);
        } catch (parseError) {
            res.status(500).json({
                error: 'Error al parsear el archivo JSON'
            });
        }
    })
})
app.get('/products/:id', (req, res) => {
    const prodID = parseInt(req.params.id);
    const producto = manager.getProductById(prodID);
    if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
});
app.get('/carts/:cid', (req, res) => {
    const cid = parseInt(req.params.cid);
    const cart = cartManager.getCartById(cid);

    if (!cart) {
        return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    res.json(cart.products);
});

//POST
app.post('/products', (req, res) => {
    const {
        title,
        description,
        code,
        price,
        status = true,
        stock,
        category,
        thumbnails = []
    } = req.body;

    if (!title || !description || !code || price == null || stock == null || !category) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const codeExists = manager.getProducts().some(prod => prod.code === code);
    if (codeExists) {
        return res.status(400).json({ error: 'Ya existe un producto con ese código.' });
    }

    const newProduct = manager.addProduct(
        title,
        description,
        price,
        category,
        status,
        thumbnails,
        code,
        stock
    )

    res.status(201).json({
        mensaje: 'Producto agregado exitosamente',
        producto: newProduct
    });
});
app.post('/carts', (req, res) => {
    const newCart = cartManager.createCart();
    res.status(201).json({
        mensaje: 'Carrito creado con éxito',
        carrito: newCart
    });
});
app.post('/carts/:cid/product/:pid', (req, res) => {
    const cid = parseInt(req.params.cid);
    const pid = parseInt(req.params.pid);

    const updatedCart = cartManager.addProductToCart(cid, pid);

    if (!updatedCart) {
        return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    res.json({
        mensaje: 'Producto agregado al carrito',
        carrito: updatedCart
    });
});
//PUT
app.put('/products/:pid', (req, res) => {
    const pid = parseInt(req.params.pid);
    const updates = req.body;

    const product = manager.getProductById(pid);
    if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if ('id' in updates) {
        delete updates.id;
    }

    Object.assign(product, updates);
    manager.saveProductsToFile();

    res.json({ mensaje: 'Producto actualizado', producto: product });
});
//DELETE
app.delete('/products/:pid', (req, res) => {
    const pid = parseInt(req.params.pid);
    const productos = manager.getProducts();
    const index = productos.findIndex(prod => prod.id === pid);

    if (index === -1) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    productos.splice(index, 1);
    manager.saveProductsToFile();

    res.json({ mensaje: 'Producto eliminado exitosamente' });
});
//PARA INICIAR EL SERVIDOR
app.listen(PORT, ()=>{
    console.log(`Servidor levantado en el puerto http://localhost:${PORT}`)
})
