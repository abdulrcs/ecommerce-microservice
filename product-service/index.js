const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 8080;
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const Product = require("./Product");
const isAuthenticated = require("../isAuthenticated");

app.use(express.json());

var order
var channel, connection;

mongoose.connect(
  "mongodb://localhost/product-service",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log(`Product-service DB connected`);
  }
);

async function connect() {
  const amqpServer = "amqp://localhost:5672";
  connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();

  // queue named product, check if product queue exist
  // if doesn't exist it creates a new one
  await channel.assertQueue("PRODUCT");
}
connect();

// Create a new product
app.post('/product/create', isAuthenticated, async (req,res) => {
  // req.user.email etc 
  const { name, description, price } = req.body
  const newProduct = new Product({
    name,
    description,
    price,
  })
  newProduct.save()
  return res.json(newProduct)
 })

// Buy a Product
// Product service interact with order service
// and will make an order.
//
// Flow:
// User sends a list of product IDs arrays to buy
// Create an order with those products and total sum of prices

app.post('/product/buy', isAuthenticated, async (req, res) => {
  const { ids } = req.body 

  // _id: {$in: ids} -> for each id (IN)side ids array 
  const products = await Product.find({ _id: {$in: ids} })
  
  channel.sendToQueue("ORDER", Buffer.from(JSON.stringify({
    products,
    userEmail: req.user.email,
  })))

  // consume the "sendToQueue" from order-service
  channel.consume("PRODUCT", (data) => {
    console.log("Consuming PRODUCT queue")
    order = JSON.parse(data.content)
    channel.ack(data)
  })
  return res.json(order)
})

app.listen(PORT, () => {
  console.log(`Product Service at ${PORT}`);
});
