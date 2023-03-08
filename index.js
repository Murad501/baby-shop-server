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


    //remove-product
    app.delete("/remove-product/:id", async(req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await productCollections.deleteOne(query)
      res.send(result)
    })

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
  } catch {}
};

run().catch((err) => console.log(err));

app.listen(port, () => {
  console.log("server is running on port", port);
});
