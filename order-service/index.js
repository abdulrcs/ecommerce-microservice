const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 9090;
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const Order = require("./Order");
const isAuthenticated = require("../isAuthenticated");

app.use(express.json());

var channel, connection;

mongoose.connect(
  "mongodb://localhost/order-service",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log(`Order-service DB connected`);
  }
);

async function connect() {
  const amqpServer = "amqp://localhost:5672";
  connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  // queue named order, check if order queue exist
  // if doesn't exist it creates a new one
  await channel.assertQueue("ORDER");
}

function createOrder(products, userEmail) {
  let total = 0;
  for (let i = 0; i < products.length; i++) {
    total += products[i].price;
  }
  const newOrder = new Order({
    products,
    user: userEmail,
    total_price: total,
  });
  newOrder.save();
  return newOrder;
}

// from product service buffer (sendtoqueue)
connect().then(() => {
  channel.consume("ORDER", (data) => {
    console.log("Consuming ORDER queue")
    const { products, userEmail } = JSON.parse(data.content);
    const newOrder = createOrder(products, userEmail);
    
    //cant return new order here, return from product service
    channel.sendToQueue("PRODUCT", Buffer.from(JSON.stringify({
    newOrder
    })))

    // acknowledges the data to remove from the queue
    channel.ack(data);
  });
});

app.listen(PORT, () => {
  console.log(`Order Service at ${PORT}`);
});
