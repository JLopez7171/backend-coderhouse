const fs = require('fs');
const path = require('path');

const cartsFilePath = path.join(__dirname, '..', '..', 'data', 'carts.json');

class CartManager {
    constructor() {
        this.carts = [];
        this.currentId = 1;
        this.loadCartsFromFile();
    }

    createCart() {
        const newCart = {
            id: this.currentId++,
            products: []
        };
        this.carts.push(newCart);
        this.saveCartsToFile();
        return newCart;
    }

    getCartById(cid) {
        return this.carts.find(cart => cart.id === cid);
    }

    addProductToCart(cid, pid) {
        const cart = this.getCartById(cid);
        if (!cart) return null;

        const existingProduct = cart.products.find(p => p.product === pid);
        if (existingProduct) {
            existingProduct.quantity += 1;
        } else {
            cart.products.push({ product: pid, quantity: 1 });
        }

        this.saveCartsToFile();
        return cart;
    }

    saveCartsToFile() {
        fs.writeFileSync(cartsFilePath, JSON.stringify(this.carts, null, 2));
    }

    loadCartsFromFile() {
        if (fs.existsSync(cartsFilePath)) {
            const data = fs.readFileSync(cartsFilePath, 'utf-8');
            try {
                this.carts = JSON.parse(data);
                const lastCart = this.carts[this.carts.length - 1];
                this.currentId = lastCart ? lastCart.id + 1 : 1;
            } catch (error) {
                console.error('Error al leer el archivo de carritos:', error);
                this.carts = [];
            }
        }
    }
}

module.exports = { CartManager };
