const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/users");
const Transcation = require("./models/transactions");
const Product = require("./models/products");
const Category = require("./models/categories");
const { app, server } = require("./server");

let mongoServer;

beforeAll(async () => {
  if (mongoose.connection.readyState) {
    await mongoose.connection.close();
  }
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "testdb" });
  await User.create({
    name: "guest",
    email: "guest@example.com",
    password: await bcrypt.hash("guest", 10),
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  await server.close();
});

describe("Login Test", () => {
  it("should login successfully", async () => {
    const res = await request(app)
      .post("/login")
      .send({ name: "guest", password: "guest" });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).not.toBeNull();
    const decodedToken = jwt.decode(res.body.token, { complete: true });
    expect(decodedToken).not.toBeNull();
    expect(decodedToken.payload).toHaveProperty("id");
    expect(decodedToken.payload).toHaveProperty("name");
    expect(decodedToken.payload).toHaveProperty("role");
    expect(decodedToken.payload).toHaveProperty("exp");
  });

  it("should give an error when empty name / password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ name: "", password: "guest" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Username / Password cannot be empty!");
    const res2 = await request(app)
      .post("/login")
      .send({ name: "guest", password: "" });
    expect(res2.statusCode).toBe(400);
    expect(res.body.error).toBe("Username / Password cannot be empty!");
  });

  it("should give an error when empty name / password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ name: "", password: "guest" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Username / Password cannot be empty!");
    const res2 = await request(app)
      .post("/login")
      .send({ name: "guest", password: "" });
    expect(res2.statusCode).toBe(400);
    expect(res.body.error).toBe("Username / Password cannot be empty!");
  });

  it("should give an error when user does not exist", async () => {
    const res = await request(app)
      .post("/login")
      .send({ name: "admin", password: "guest" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("User not found");
  });

  it("should give an error when user's password is invalid", async () => {
    const res = await request(app)
      .post("/login")
      .send({ name: "guest", password: "admin" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid credentials");
  });
});
