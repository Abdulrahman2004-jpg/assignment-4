const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, "users.json");

app.use(express.json());

// Create users.json automatically if it does not exist.
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(USERS_FILE, "[]", "utf8");
      return [];
    }
    throw error;
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

// 1. Add a new user
app.post("/user", async (req, res) => {
  try {
    const { name, age, email } = req.body;

    if (!name || age === undefined || !email) {
      return res.status(400).json({
        message: "Name, age and email are required."
      });
    }

    const users = await readUsers();

    if (users.some((user) => user.email.toLowerCase() === String(email).toLowerCase())) {
      return res.json({ message: "Email already exists." });
    }

    const id = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;
    users.push({ id, name, age: Number(age), email });

    await writeUsers(users);
    res.status(201).json({ message: "User added successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// 2. Update a user
app.patch("/user/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    const allowedFields = ["name", "age", "email"];
    const fields = Object.keys(updates);

    if (!fields.length || fields.some((field) => !allowedFields.includes(field))) {
      return res.status(400).json({ message: "Invalid update fields." });
    }

    const users = await readUsers();
    const user = users.find((user) => user.id === id);

    if (!user) {
      return res.json({ message: "User ID not found." });
    }

    if (updates.email && users.some(
      (item) => item.id !== id &&
      item.email.toLowerCase() === String(updates.email).toLowerCase()
    )) {
      return res.json({ message: "Email already exists." });
    }

    if (updates.age !== undefined) updates.age = Number(updates.age);
    Object.assign(user, updates);

    await writeUsers(users);
    res.json({ message: `User ${fields.join(", ")} updated successfully.` });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// 3. Delete a user by URL ID or request body ID
async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id ?? req.body.id);
    const users = await readUsers();
    const index = users.findIndex((user) => user.id === id);

    if (!Number.isInteger(id) || index === -1) {
      return res.json({ message: "User ID not found." });
    }

    users.splice(index, 1);
    await writeUsers(users);
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
}

app.delete("/user/:id", deleteUser);
app.delete("/user", deleteUser);

// 4. Get user by name
app.get("/user/getByName", async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(
      (user) => user.name.toLowerCase() === String(req.query.name || "").toLowerCase()
    );

    if (!user) {
      return res.json({ message: "User name not found." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// 5. Get all users
app.get("/user", async (req, res) => {
  try {
    res.json(await readUsers());
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// 6. Filter users by minimum age
app.get("/user/filter", async (req, res) => {
  try {
    const minAge = Number(req.query.minAge);
    const users = await readUsers();
    const filteredUsers = users.filter((user) => Number(user.age) >= minAge);

    if (filteredUsers.length === 0) {
      return res.json({ message: "no user found" });
    }

    res.json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// 7. Get user by ID (keep after static routes)
app.get("/user/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const users = await readUsers();
    const user = users.find((user) => user.id === id);

    if (!user) {
      return res.json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
