const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const User = require("../models/user");

/**
 * Get a user detail
 */
router.get("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    let user = await User.findOne({ userId });

    if (!user) {
      console.error(`Error fetching user with id: ${userId}`);
      return res.status(404).json("User not found");
    }

    return res.json({ user });
  } catch (error) {
    console.error("Error getting user:", error);
    return res.status(500).json("Error getting user");
  }
});

/**
 * Create a user
 */
router.post("/", async (req, res) => {
  try {
    const newUserId = uuidv4();
    const randomName = `User-${Math.floor(1000 + Math.random() * 9000)}`;
    user = await User.create({ userId: newUserId, name: randomName });

    return res.json({ user });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json("Error creating user");
  }
});

module.exports = router;
