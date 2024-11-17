const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins in development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS']
}));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

app.use(express.json());
app.use(express.static('.'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Initialize SQLite database
const db = new sqlite3.Database('scores.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Drop existing table and recreate with proper constraints
        db.run(`DROP TABLE IF EXISTS scores`, (err) => {
            if (err) {
                console.error('Error dropping table:', err);
            } else {
                // Create scores table with proper unique constraint and password
                db.run(`CREATE TABLE scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    password TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    UNIQUE(name)
                )`);
            }
        });
    }
});

// Check if name is available or verify password
app.post('/api/check-name', (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ error: 'Name and password are required' });
    }

    db.get('SELECT password FROM scores WHERE name = ?', [name], (err, row) => {
        if (err) {
            console.error('Error checking name:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else if (!row) {
            res.json({ available: true });
        } else if (row.password === password) {
            res.json({ available: false, authenticated: true });
        } else {
            res.json({ available: false, authenticated: false });
        }
    });
});

// Get top 10 scores
app.get('/api/scores', (req, res) => {
    db.all(
        'SELECT name, score, date FROM scores ORDER BY score DESC LIMIT 10',
        [],
        (err, rows) => {
            if (err) {
                console.error('Error fetching scores:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.json(rows);
            }
        }
    );
});

// Add new score
app.post('/api/scores', (req, res) => {
    const { name, password, score } = req.body;
    if (!name || !password || !score) {
        return res.status(400).json({ error: 'Name, password and score are required' });
    }
    
    const date = new Date().toISOString();
    
    // First verify password if name exists
    db.get('SELECT password, score as existing_score FROM scores WHERE name = ?', [name], (err, row) => {
        if (err) {
            console.error('Error checking existing score:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (row && row.password !== password) {
            return res.status(403).json({ error: 'Invalid password' });
        }

        if (!row || score > row.existing_score) {
            // Insert or update score
            db.run(
                `INSERT OR REPLACE INTO scores (name, password, score, date) VALUES (?, ?, ?, ?)`,
                [name, password, score, date],
                function(err) {
                    if (err) {
                        console.error('Error updating/inserting score:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    } else {
                        res.json({
                            id: this.lastID,
                            name,
                            score,
                            date
                        });
                    }
                }
            );
        } else {
            // Keep existing score
            res.json({
                name,
                score: row.existing_score,
                date: row.date
            });
        }
    });
});

// Cleanup database connection on server shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
