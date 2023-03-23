const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const jwt = require("jsonwebtoken");

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("data is coming soon");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@user1.istzhai.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const productCollections = client.db("baby-shop").collection("products");
    const soldProductCollections = client
      .db("baby-shop")
      .collection("sold-products");
    const categoryCollections = client.db("baby-shop").collection("categories");
    const userCollections = client.db("baby-shop").collection("users");

    // user
    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const addedUser = await userCollections.findOne(query);
      if (addedUser) {
        return res.send({ acknowledged: true });
      }
      const result = await userCollections.insertOne(user);
      res.send(result);
    });

    //sellers
    app.get("/sellers", async (req, res) => {
      const query = { role: "seller" };
      const result = await userCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollections.findOne(query);
      res.send(result);
    });

    app.get("/is-seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollections.findOne(query);
      res.send({ isAdmin: user.role === 'admin' });
    });

    app.put("/seller/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          isVerified: true,
        },
      };
      const result = await userCollections.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/buyers", async (req, res) => {
      const query = { role: "buyer" };
      const result = await userCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/admins", async (req, res) => {
      const query = { role: "admin" };
      const result = await userCollections.find(query).toArray();
      res.send(result);
    });

    app.put("/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollections.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollections.findOne(query);
      res.send({ isAdmin: user.role === 'admin' });
    });

    //remove-user
    app.delete("/remove-user/:email", async (req, res) => {
      const email = req.params.email;
      const queryOne = { postedBy: email };
      const queryTwo = { email: email };
      await productCollections.deleteMany(queryOne);
      const result = await userCollections.deleteOne(queryTwo);
      res.send(result);
    });

    // product
    app.get("/products", async (req, res) => {
      const query = {};
      const result = await productCollections.find(query).toArray();
      res.send(result);
    });

    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productCollections.insertOne(product);
      res.send(result);
    });

    app.put("/advertise-product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { advertised: true },
      };
      const result = await productCollections.updateOne(query, updateDoc);
      res.send(result);
    });

    app.post("/sold-product/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const updateQuery = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          available: false,
        },
      };
      await productCollections.updateOne(updateQuery, updateDoc);
      const result = await soldProductCollections.insertOne(product);
      res.send(result);
    });

    app.patch("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const product = req.body;
      const result = await productCollections.replaceOne(query, product);
      res.send(result);
    });

    //remove-product
    app.delete("/remove-product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollections.deleteOne(query);
      res.send(result);
    });

    //my-orders
    app.get("/my-orders/:email", async (req, res) => {
      const email = req.params.email;
      const query = { buyerEmail: email };
      const result = await soldProductCollections.find(query).toArray();
      res.send(result);
    });

    // category
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoryCollections.find(query).toArray();
      res.send(result);
    });

    app.post("/category", async (req, res) => {
      const category = req.body;
      const result = await categoryCollections.insertOne(category);
      res.send(result);
    });

    app.get("/add-items", async (req, res) => {
      const query = {};
      const updateDoc = {
        $set: {
          category: {
            _id: "640599e3c79cdd8a955871f8",
            name: "Baby Gear",
            picture: "https://i.ibb.co/n8phWgJ/gear.png",
          },
        },
      };
      const result = await productCollections.updateMany(query, updateDoc);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const intPrice = parseFloat(price);
      const amount = intPrice * 100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } catch {}
};

run().catch((err) => console.log(err));

app.listen(port, () => {
  console.log("server is running on port", port);
});
