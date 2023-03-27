const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PDFDocument = require("pdfkit");

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

//verifyJWT

const verifyJWT = (req, res, next) => {
  const headers = req.headers.authorization;
  if (!headers) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = headers.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

function generatePDFStream(invoice) {
  const doc = new PDFDocument();

  doc.info["Title"] = "Order Invoice";

  doc.font("Helvetica");

  doc.fontSize(14);

  doc.fillColor("black");

  doc.text("Order Invoice", {
    align: "center",
  });

  doc.moveDown();

  doc.fontSize(12);

  doc.text(`Order Date: ${invoice?.orderDate}`, {
    align: "left",
  });
  doc.text(`Product Name: ${invoice.productName}`, {
    align: "left",
  });
  doc.text(`Amount: $${invoice.totalPrice}`, {
    align: "left",
  });

  // Move to a new line
  doc.moveDown();

  // Add customer details to the document
  doc.text(
    `Customer Name:${
      invoice?.paymentInfo?.firstName + " " + invoice?.paymentInfo?.lastName
    }`,
    {
      align: "left",
    }
  );
  doc.text(`Email: ${invoice.paymentInfo?.email}`, {
    align: "left",
  });
  doc.text(`Phone Number: ${invoice?.paymentInfo?.number}`, {
    align: "left",
  });
  doc.text(`Country: ${invoice.paymentInfo?.country}`, {
    align: "left",
  });
  doc.text(`State: ${invoice.paymentInfo?.state}`, {
    align: "left",
  });
  doc.text(`Zip: ${invoice.paymentInfo?.zip}`, {
    align: "left",
  });
  doc.text(`Landmark: ${invoice.paymentInfo?.landmark}`, {
    align: "left",
  });

  // Add more details as needed

  doc.end();

  return doc;
}

const run = async () => {
  try {
    const productCollections = client.db("baby-shop").collection("products");
    const soldProductCollections = client
      .db("baby-shop")
      .collection("sold-products");
    const categoryCollections = client.db("baby-shop").collection("categories");
    const userCollections = client.db("baby-shop").collection("users");

    // user
    app.post("/user", verifyJWT, async (req, res) => {
      const user = req.body;
      const decodedEmail = req.decoded.email;

      if (decodedEmail !== user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = { email: user.email };
      const addedUser = await userCollections.findOne(query);
      if (addedUser) {
        return res.send({ acknowledged: true });
      }
      const result = await userCollections.insertOne(user);
      res.send(result);
    });

    //sellers
    app.get("/sellers/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
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

    app.get("/is-seller/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = { email: email };
      const user = await userCollections.findOne(query);
      res.send({ isSeller: user.role === "seller" });
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

    app.get("/buyers/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = { role: "buyer" };
      const result = await userCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/admins/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = { role: "admin" };
      const result = await userCollections.find(query).toArray();
      res.send(result);
    });

    app.put("/admin/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded?.email;
      const email = req.body.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
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
      res.send({ isAdmin: user.role === "admin" });
    });

    //remove-user
    app.delete("/remove-user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded?.email;
      const adminEmail = req.body.email;
      if (decodedEmail !== adminEmail) {
        return res.status(403).send({ message: "forbidden" });
      }
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

    app.post("/product/:email",verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
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

    app.get("/sold-product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const result = await soldProductCollections.findOne(query);
      res.send({ isSold: result ? true : false });
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
    app.get("/my-orders/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "forbidden" });
      }
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


    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const intPrice = parseFloat(price * 100);

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: intPrice,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.put("/save-payment-details/:email", async (req, res) => {
      const email = req.params.email;
      const paymentDetails = req.body.paymentDetails;
      const query = { email: email };
      const updateDoc = {
        $set: { paymentDetails },
      };
      const result = await userCollections.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/payment-details/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const userDetails = await userCollections.findOne(query);

      res.send({ paymentDetails: userDetails?.paymentDetails });
    });

    //jwt
    app.post("/jwt", async (req, res) => {
      const email = req.body.email;
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
        expiresIn: "7d",
      });
      res.send({ token });
    });

    //invoice download

    app.get("/invoices/:id/download", async (req, res) => {
      const invoiceId = req.params.id;
      const query = { productId: invoiceId };
      const invoice = await soldProductCollections.findOne(query);
      if (!invoice) {
        return res.sendStatus(404);
      }

      const pdfStream = generatePDFStream(invoice);

      res.set("Content-Type", "application/pdf");
      res.set(
        "Content-Disposition",
        `attachment; filename="order invoice.pdf"`
      );
      pdfStream.pipe(res);
    });
  } catch {}
};

run().catch((err) => console.log(err));

app.listen(port, () => {
  console.log("server is running on port", port);
});
