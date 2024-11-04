const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const PORT = 5010;
const SECRET_KEY = 'your_jwt_secret'; // Change this for production
const DATA_FILE = './data.json';

const app = express();
app.use(express.json());
app.use(cors());

// Helper functions for data handling
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], posts: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
};

const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Middleware to verify user
const verifyUser = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to authenticate token' });
        }
        req.user = decoded; // Store user information from token
        next();
    });
};

// User registration
app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const data = readData();
    const users = data.users;

    if (users.find(user => user.username === username)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashedPassword });
    writeData({ users, posts: data.posts });

    res.status(201).json({ message: 'User registered successfully' });
});

// User login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const users = readData().users;

    const user = users.find(user => user.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

// Fetch all accounts (users)
app.post("/accounts", verifyUser, (req, res) => {
    const users = readData().users.map(user => ({ username: user.username }));
    res.json(users);
});

// Handle requests (placeholder)
app.post("/request", verifyUser, (req, res) => {
    // Logic for handling requests could be added here
    const { requestType, targetUser } = req.body;
    res.json({ message: `Handled request type: ${requestType} for user: ${targetUser}` });
});

// Fetch pending requests (placeholder)
app.post("/pendingRequests", verifyUser, (req, res) => {
    // Simulate fetching pending requests for the user
    res.json({ message: 'Fetched pending requests successfully', requests: [] });
});

// Accept request (placeholder)
app.post("/acceptRequest", verifyUser, (req, res) => {
    const { requestId } = req.body;
    // Logic for accepting a request based on requestId
    res.json({ message: `Request ${requestId} accepted successfully` });
});

// Create a post
app.post("/createPost", verifyUser, (req, res) => {
    const { title, content } = req.body;
    const data = readData();
    const posts = data.posts;

    const newPost = { id: posts.length + 1, title, content, author: req.user.username, likes: 0, comments: [] };
    posts.push(newPost);
    writeData({ users: data.users, posts });

    res.status(201).json({ message: 'Post created successfully', post: newPost });
});

// Fetch all posts
app.post("/posts", (req, res) => {
    const posts = readData().posts;
    res.json(posts);
});

// Fetch user posts
app.post("/userPosts", verifyUser, (req, res) => {
    const posts = readData().posts.filter(post => post.author === req.user.username);
    res.json(posts);
});

// Update privacy settings (placeholder)
app.post("/updatePrivacySettings", verifyUser, (req, res) => {
    // Logic for updating user privacy settings
    res.json({ message: 'Privacy settings updated successfully' });
});

// Remove a post
app.post("/removePost", verifyUser, (req, res) => {
    const { postId } = req.body;
    const data = readData();
    const posts = data.posts.filter(post => post.id !== postId);
    
    if (posts.length === data.posts.length) {
        return res.status(404).json({ message: 'Post not found' });
    }

    writeData({ users: data.users, posts });
    res.json({ message: 'Post removed successfully' });
});

// Like a post
app.post("/likePost", verifyUser, (req, res) => {
    const { postId } = req.body;
    const data = readData();
    const post = data.posts.find(p => p.id === postId);

    if (!post) {
        return res.status(404).json({ message: 'Post not found' });
    }

    post.likes += 1;
    writeData({ users: data.users, posts: data.posts });

    res.json({ message: 'Post liked successfully', likes: post.likes });
});

// Add a comment
app.post("/addComment", verifyUser, (req, res) => {
    const { postId, comment } = req.body;
    const data = readData();
    const post = data.posts.find(p => p.id === postId);

    if (!post) {
        return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({ comment, author: req.user.username });
    writeData({ users: data.users, posts: data.posts });

    res.json({ message: 'Comment added successfully', comments: post.comments });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
