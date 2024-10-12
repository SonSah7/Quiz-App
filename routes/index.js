const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Render the index page
router.get('/', (req, res) => {
    return res.render('index.ejs');
});

// Handle user registration
router.post('/', async (req, res) => {
    const { email, username, password, passwordConf } = req.body;

    // Check for missing fields
    if (!email || !username || !password || !passwordConf) {
        return res.status(400).send({"Error": "All fields are required."});
    }

    // Check if passwords match
    if (password !== passwordConf) {
        return res.status(400).send({"Error": "Passwords do not match."});
    }

    try {
        // Check if email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send({"Error": "Email is already used."});
        }

        // Generate unique_id for new user
        const lastUser = await User.findOne({}).sort({_id: -1}).limit(1);
        const uniqueId = lastUser ? lastUser.unique_id + 1 : 1;

        // Create new user
        const newUser = new User({
            unique_id: uniqueId,
            email,
            username,
            password,
            passwordConf
        });

        // Save user to the database
        await newUser.save();
        res.send({"Success": "You are registered. You can login now."});
    } catch (err) {
        console.error(err);
        res.status(500).send({"Error": "Registration failed."});
    }
});

// Render the login page
router.get('/login', (req, res) => {
    return res.render('login.ejs');
});

// Handle user login
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).send({"Error": "This Email is not registered!"});
        }

        // Check if passwords match
        if (user.password !== req.body.password) {
            return res.status(400).send({"Error": "Wrong password!"});
        }

        // Set user ID in session
        req.session.userId = user.unique_id;
        console.log('User logged in:', user); // Debugging log
        res.send({"Success": "Login successful!"});
    } catch (err) {
        console.error(err);
        res.status(500).send({"Error": "Login failed."});
    }
});

// Render user profile
router.get('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/'); // Redirect to home if not logged in
    }

    try {
        const user = await User.findOne({ unique_id: req.session.userId });
        if (!user) {
            return res.redirect('/');
        }

        console.log('Rendering profile for:', user); // Debugging log
        return res.render('data.ejs', { "name": user.username, "email": user.email });
    } catch (err) {
        console.error(err);
        res.status(500).send({"Error": "Error fetching profile."});
    }
});

// Handle user logout
router.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                return next(err);
            }
            return res.redirect('/');
        });
    }
});

// Render password recovery page
router.get('/forgetpass', (req, res) => {
    return res.render("forget.ejs");
});

// Handle password recovery
router.post('/forgetpass', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).send({"Error": "This Email is not registered!"});
        }

        // Check if new passwords match
        if (req.body.password !== req.body.passwordConf) {
            return res.status(400).send({"Error": "Both passwords must match."});
        }

        // Update password
        user.password = req.body.password;
        await user.save();
        res.send({"Success": "Password changed!"});
    } catch (err) {
        console.error(err);
        res.status(500).send({"Error": "Password change failed."});
    }
});

module.exports = router;
