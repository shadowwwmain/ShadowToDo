const express = require('express');
const router = express.Router();

module.exports = (bcrypt, encrypt, decrypt, readUsers, writeUsers) => {
  // Signup
  router.post('/signup', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      // Read existing users
      const users = await readUsers();
      
      // Check if user already exists
      let existingUser = users.find(user => user.username === username);
      if (!existingUser) {
        // Check email (with error handling for decryption)
        try {
          existingUser = users.find(user => decrypt(user.email) === email);
        } catch (decryptError) {
          console.error('Error decrypting email during signup:', decryptError);
          // If we can't decrypt an email, we'll skip that check for this user
          // This might happen if the data was encrypted with a different key
        }
      }
      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Encrypt email
      const encryptedEmail = encrypt(email);
      
      // Create new user with default preferences
      const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        username,
        email: encryptedEmail,
        password: hashedPassword,
        preferences: {
          theme: 'dark',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      };
      
      // Save user
      users.push(newUser);
      await writeUsers(users);
      
      // Set session
      req.session.userId = newUser.id;
      
      res.status(201).json({ 
        message: 'User created successfully',
        user: { id: newUser.id, username, email }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Login
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      // Read users
      const users = await readUsers();
      
      // Find user
      const user = users.find(user => user.username === username);
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Decrypt email for response
      let decryptedEmail;
      try {
        decryptedEmail = decrypt(user.email);
      } catch (decryptError) {
        console.error('Error decrypting email during login:', decryptError);
        // If we can't decrypt the email, return a placeholder
        decryptedEmail = 'decryption-error@example.com';
      }
      
      res.json({ 
        message: 'Login successful',
        user: { id: user.id, username: user.username, email: decryptedEmail }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Logout
  router.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ error: 'Could not log out' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  // Get current user
  router.get('/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const users = await readUsers();
      const user = users.find(user => user.id === req.session.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Decrypt email for response
      let decryptedEmail;
      try {
        decryptedEmail = decrypt(user.email);
      } catch (decryptError) {
        console.error('Error decrypting email when getting user:', decryptError);
        // If we can't decrypt the email, return a placeholder
        decryptedEmail = 'decryption-error@example.com';
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: decryptedEmail
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  return router;
};