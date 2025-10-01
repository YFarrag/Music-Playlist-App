const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./db/database.db');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secretKeyChangeThis',
  resave: false,
  saveUninitialized: true
}));

// Set Pug as template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Simple auth middleware
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }
  next();
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (user) {
      req.session.user = user;
      res.redirect('/playlist');
    } else {
      res.render('login', { error: 'Invalid credentials' });
    }
  });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, 'guest'], err => {
    if (err) return res.render('register', { error: 'Username might already exist.' });
    res.redirect('/login');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/playlist', requireLogin, (req, res) => {
    db.all('SELECT * FROM playlists WHERE user_id = ?', [req.session.user.id], (err, songs) => {
      if (err) {
        console.error(err);
        return res.render('playlist', { user: req.session.user, songs: [] });
      }
      res.render('playlist', { user: req.session.user, songs: songs || [] });
    });
  });
  

app.get('/admin', requireAdmin, (req, res) => {
  db.all('SELECT username, role FROM users', (err, users) => {
    res.render('admin', { users });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const https = require('https');

app.get('/search', requireLogin, (req, res) => {
  const query = req.query.term;
  if (!query) return res.status(400).json({ error: "Missing search term" });

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicTrack&limit=10`;

  https.get(url, apiRes => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.json(parsed.results.map(song => ({
          title: song.trackName,
          artist: song.artistName,
          artwork: song.artworkUrl100
        })));
      } catch {
        res.status(500).json({ error: "Failed to parse iTunes response" });
      }
    });
  }).on('error', () => res.status(500).json({ error: "iTunes API error" }));
});
app.post('/playlist/add', requireLogin, (req, res) => {
    const { title, artist, artwork } = req.body;
    if (!title || !artist) return res.status(400).send("Missing song data");
  
    db.run(
      `INSERT INTO playlists (user_id, title, artist, artwork) VALUES (?, ?, ?, ?)`,
      [req.session.user.id, title, artist, artwork],
      (err) => {
        if (err) {
          console.error("Playlist insert error:", err);
          return res.status(500).send("Failed to add song.");
        }
        res.sendStatus(200);
      }
    );
  });
  app.post('/playlist/delete/:id', requireLogin, (req, res) => {
    const songId = req.params.id;
    db.run(
      'DELETE FROM playlists WHERE id = ? AND user_id = ?',
      [songId, req.session.user.id],
      (err) => {
        if (err) {
          console.error("Delete error:", err);
          return res.status(500).send("Failed to delete song.");
        }
        res.sendStatus(200);
      }
    );
  });
  