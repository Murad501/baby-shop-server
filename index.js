const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const categoryCollections = client.db("baby-shop").collection("categories");

    // product
    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productCollections.insertOne(product);
      res.send(result);
    });

    // category
    app.post("/category", async (req, res) => {
      const category = req.body;
      const result = await categoryCollections.insertOne(category);
      res.send(result);
    });
  } catch {}
};

run().catch((err) => console.log(err));

app.listen(port, () => {
  console.log("server is running on port", port);
});
