const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'shadow-todo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Encryption setup
// Use a fixed encryption key (32 bytes for AES-256)
// IMPORTANT: In production, use a secure key stored in an environment variable
// Example: const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const ENCRYPTION_KEY = Buffer.from('12345678901234567890123456789012', 'utf-8'); // 32 characters = 32 bytes
const IV_LENGTH = 16;

// Encryption function
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decryption function
function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - this may be due to a key mismatch');
  }
}

// File paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const TODOS_FILE = path.join(__dirname, 'data', 'todos.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access(path.join(__dirname, 'data'));
  } catch {
    await fs.mkdir(path.join(__dirname, 'data'));
  }
}

// Initialize data files
async function initializeDataFiles() {
  await ensureDataDirectory();
  
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify([]));
  }
  
  try {
    await fs.access(TODOS_FILE);
  } catch {
    await fs.writeFile(TODOS_FILE, JSON.stringify([]));
  }
}

// Helper functions for file operations
async function readUsers() {
  const data = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

async function readTodos() {
  const data = await fs.readFile(TODOS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeTodos(todos) {
  await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2));
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static files middleware (should come after specific routes)
app.use(express.static('public'));

// Auth routes
app.use('/auth', require('./routes/auth')(bcrypt, encrypt, decrypt, readUsers, writeUsers));
// Todo routes
app.use('/todos', require('./routes/todos')(requireAuth, readTodos, writeTodos, readUsers));

// User preferences route
app.get('/user/preferences', requireAuth, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.session.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user preferences (default to dark theme)
    const preferences = user.preferences || { theme: 'dark', sortBy: 'createdAt', sortOrder: 'desc' };
    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/user/preferences', requireAuth, async (req, res) => {
  try {
    const { theme, sortBy, sortOrder } = req.body;
    
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.id === req.session.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user preferences
    users[userIndex].preferences = {
      theme: theme || 'dark',
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    };
    
    await writeUsers(users);
    res.json({ message: 'Preferences updated successfully', preferences: users[userIndex].preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
async function startServer() {
  await initializeDataFiles();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});