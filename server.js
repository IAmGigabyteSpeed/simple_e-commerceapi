require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/users");
const Transcation = require("./models/transactions");
const Product = require("./models/products");
const Category = require("./models/categories");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const SECRET_KEY = process.env.SECRET_KEY;

app.use(express.json());
app.use(cors({ origin: "*" }));

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.post("/login", async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password)
      return res
        .status(400)
        .json({ error: "Username / Password cannot be empty!" });
    const user = await User.findOne({ name });
    if (!user) return res.status(400).json({ error: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );
    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const PrevUser = await User.findOne({ name });
    if (PrevUser !== null) {
      return res.status(401).json({ error: "User already exist!" });
    } else {
      const newPassword = await bcrypt.hash(password, 10);
      const user = new User({ name, email, password: newPassword });
      await user.save();
      return res.status(200).json({ message: "User has been added!" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

//Middleware for Authentication (JWT)
const JWTAuthenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access Denied" });

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid Token" });
  }
};

app.get("/categories", async (req, res) => {
  try {
    const Categories = await Category.find();
    return res.status(200).json(Categories);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/categories/:id", async (req, res) => {
  try {
    const Categories = await Category.findById(req.params.id);
    return res.status(200).json(Categories);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    const PrevCat = await Category.findOne({ name });
    if (PrevCat !== null)
      return res.status(401).json({ error: "Category already exist!" });
    const Cat = new Category({ name, description });
    await Cat.save();
    return res.status(200).json({ message: "Category has been added!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/categories", async (req, res) => {
  try {
    const { id, name, description } = req.body;
    const Cat = await Category.findById(id);
    if (!Cat) return res.status(404).json({ error: "Category not found!" });
    Cat.name = name;
    Cat.description = description;
    await Cat.save();
    return res.status(200).json({ message: "Category has been updated!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/categories/:id", async (req, res) => {
  try {
    const Cat = await Category.findById(req.params.id);
    if (!Cat) return res.status(404).json({ error: "Category not found!" });
    // await Product.deleteMany({ category: req.params.id });
    await Product.updateMany(
      { category: req.params.id },
      { $set: { category: null } }
    );
    await Cat.deleteOne();
    return res.status(200).json({ message: "Category has been deleted!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/products", async (req, res) => {
  try {
    const Products = await Product.find().populate("category");
    return res.status(200).json(Products);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/products", async (req, res) => {
  try {
    const { name, description, price, stock, category, image } = req.body;
    const prevProduct = await Product.findOne({ name });
    if (prevProduct !== null)
      return res.status(401).json({ error: "Product already exist!" });
    const categoryId = new mongoose.Types.ObjectId(category);
    const Prod = new Product({
      name,
      description,
      price,
      stock,
      category: categoryId,
      image,
    });
    await Prod.save();
    return res.status(200).json({ message: "Product has been added!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/products", async (req, res) => {
  try {
    const { id, name, description, price, stock, category, image } = req.body;
    const Item = await Product.findById(id);
    if (Item == null)
      return res.status(401).json({ error: "Product doesn't exist!" });
    const categoryId = new mongoose.Types.ObjectId(category);
    Item.name = name;
    Item.description = description;
    Item.price = price;
    Item.stock = stock;
    Item.category = categoryId;
    Item.image = image;
    await Item.save();
    return res.status(200).json({ message: "Product has been updated!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const Products = await Product.findById(req.params.id).populate("category");
    return res.status(200).json(Products);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const Products = await Product.findById(req.params.id);
    if (!Products) return res.status(404).json({ error: "Product not found!" });
    await Products.deleteOne();
    return res.status(200).json({ message: "Category has been deleted!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/products/category/:id", async (req, res) => {
  try {
    const Products = await Product.find({ category: req.params.id }).populate(
      "category"
    );
    return res.status(200).json(Products);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/transactions", async (req, res) => {
  try {
    const Transcations = await Transcation.find()
      .populate("user")
      .populate("products.product");
    return res.status(200).json(Transcations);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/transactions", JWTAuthenticate, async (req, res) => {
  try {
    const { cart, totalAmount } = req.body;
    const UserId = new mongoose.Types.ObjectId(req.user.id);
    const CartItems = cart.map((item) => ({
      product: new mongoose.Types.ObjectId(item.productId),
      quantity: item.quantity,
    }));
    const Trans = new Transcation({
      user: UserId,
      products: CartItems,
      totalAmount: totalAmount,
    });
    await Trans.save();

    return res.status(200).json({ message: "Transaction has been added!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/transactions", JWTAuthenticate, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(400).json({ error: "You are not allowed to do this!" });
    }
    const { TransId, status } = req.body;
    const Trans = await Transcation.findById(TransId);
    if (!Trans)
      return res.status(400).json({ error: "Transaction doesn't exist!" });
    Trans.status = status;
    await Trans.save();

    return res.status(200).json({ message: "Transaction has been updated!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/transactions/:userId", JWTAuthenticate, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res
        .status(400)
        .json({ error: "You are not allowed to check this!" });
    }
    const Transcations = await Transcation.find({
      user: req.params.userId,
    }).populate("products.product");

    return res.status(200).json(Transcations);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/transactions/:userId/:id", JWTAuthenticate, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res
        .status(400)
        .json({ error: "You are not allowed to check this!" });
    }
    const Transcations = await Transcation.findOne({
      _id: req.params.id,
      user: req.params.userId,
    })
      .populate("user")
      .populate("products.product");
    return res.status(200).json(Transcations);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const Users = await User.find();
    return res.status(200).json(Users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/user", JWTAuthenticate, async (req, res) => {
  try {
    const Users = await User.findById(req.user.id);
    return res.status(200).json(Users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const server = app.listen(PORT | 5000, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };
