const fs = require('fs')
const path = require('path')
const productsFilePath = path.join(__dirname, '..', '..', 'data', 'products.json');

class ProductManager{
    constructor(){
        this.products = [];
        this.currentID = 1;
        this.loadProductsFromFile();
    }
    addProduct(title, description, price, category, status, thumbnail, code, stock){
        if(!title||!description ||!price||!thumbnail||!code||!stock){
            console.log("Todos los campos son obligatorios.")
        }
        const codeExists = this.products.some(prod =>prod.code == code)
        if (codeExists){
            console.log("Ya existe un producto con este código.")
            return;
        }

        const newProduct ={
            id: this.currentID++,
            title,
            description,
            price,
            category,
            status,
            thumbnail,
            code,
            stock
        }
        this.products.push(newProduct)
        this.saveProductsToFile()
        console.log("Producto agregado exitosamente", newProduct)
        return newProduct;
    }
    getProducts(){
        return this.products;
    }
    getProductById(id){
        const product = this.products.find(prod => prod.id === id)
        if(product){
            return product
        }else{
            console.log("Producto no encontrado")
        }
    }
    saveProductsToFile() {
        fs.writeFileSync(productsFilePath, JSON.stringify(this.products, null, 2));
    }
    loadProductsFromFile() {
        if (fs.existsSync(productsFilePath)) {
            const data = fs.readFileSync(productsFilePath, 'utf-8');
            try {
                this.products = JSON.parse(data);
                const lastProduct = this.products[this.products.length - 1];
                this.currentID = lastProduct ? lastProduct.id + 1 : 1;
            } catch (error) {
                console.error('Error al parsear el archivo:', error);
                this.products = [];
            }
        } else {
            this.products = [];
        }
    }
}

module.exports ={
    ProductManager
} 