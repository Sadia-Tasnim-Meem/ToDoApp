const express = require("express")
//const mysql = require("mysql")
const Pool = require("pg").Pool;
const path = require("path")
const app = express()
const bcrypt = require('bcrypt');
const saltRounds = 10; 
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');

//const hbs = require("hbs");

const port = process.env.PORT || 4000
app.use(express.json())

app.use(express.urlencoded({ extended: false }))

const tempelatePath = path.join(__dirname, '../template')
const publicPath = path.join(__dirname, '../public')
console.log(tempelatePath);
console.log(publicPath);

app.set('view engine', 'hbs')
app.set('views', tempelatePath)
app.use(express.static(publicPath))
app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
  }));





const generateToken = (userId) => {
    const token = jwt.sign({ userId }, 'your-secret-key', { expiresIn: '1h' });
    return token;
  };
  

  const authenticateUser = (req, res, next) => {
    const token = req.cookies.token;
  
    if (!token) {
      // No token found, user is not authenticated
      return res.redirect('/login');
    }
  
    try {
      const decoded = jwt.verify(token, 'your-secret-key');
      
      req.session.userId = decoded.userId;
      next();
    } catch (err) {
      console.log(err);
      // Invalid token, user is not authenticated
      return res.redirect('/login');
    }
  };
  
/*
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "todolist"
});
*/

const db = new Pool({
  connectionString:`postgres://postgres.zvzroaezcikcmsgsalnj:peyQdrx3ACmOJEDc@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
})

// Connect to MySQL
db.connect(err => {
    if (err) {
        throw err;
    }
    //console.log("Connected to MySQL");
    console.log("Connected to Supabase.")
});


app.get("/", (req, res) => {
    //res.redirect("/home");
    res.send("Express on Vercel");
  });


app.get('/login', (req, res) => {
    const token = req.cookies.token;
  
    if (token) {
      // User already authenticated, redirect to home page
      return res.redirect('/home');
    }
  
    res.render('login');
  });
  
  app.get('/register', (req, res) => {
    const token = req.cookies.token;
  
    if (token) {
      // User already authenticated, redirect to home page
      return res.redirect('/home');
    }
  
    res.render('register');
  });

  app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error destroying session' });
      }
  
      // Clear the token cookie
      res.clearCookie('token');
  
      // Redirect to the login page
      res.redirect('/login');
    });
  });
  

  
  
  app.get('/home', authenticateUser, (req, res) => {

    const userId = req.session.userId;
    
    const sql = `SELECT * FROM todos WHERE users_id = $1 ORDER BY id DESC;`;
    db.query(sql, [userId], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "Error executing MySQL query" });
      }
      res.render('home', { todos: result });
    });
  });

app.post('/user/register', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
  
    // Generate a salt and hash the password
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
      if (err) { 
        console.log(err);
        return res.status(500).json({ error: 'Error hashing password' });
      }
  
      const sql = `INSERT INTO users (name, email, password) VALUES ($1, $2, $3);`;
      const values = [name, email, hashedPassword];
      //const sql = `INSERT INTO users (name, email, password) VALUES (${name}, ${email}, ${hashedPassword});`;
      
      
      db.query(sql, values, (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Error inserting data into MySQL' });
        }
        

        req.session.userId = result.insertId;
  
        // Generate JWT token
        const token = generateToken(result.insertId);
  
        // Set the token as a cookie
        res.cookie('token', token, { maxAge: 3600000, httpOnly: true });
  
        // Redirect to home page
        res.redirect('/home');
      });
    });
  });
  


app.post('/user/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    console.log(password);
    const sql = `SELECT * FROM users WHERE email = $1;`;
  
    db.query(sql, [email], (err, result) => {
      if (err) {
        console.log("eikhane jhamela");
        console.log(err);
        return res.status(500).json({ error: 'Error executing MySQL query' });
      }
  
      if (result.length === 0) {
        // User not found
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      console.log("result is : ");
      console.log(result);
      const hashedPassword = result.rows[0].password;
  
      // Compare the inputted password with the hashed password
      bcrypt.compare(password, hashedPassword, (err, passwordMatch) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Error comparing passwords' });
        }
  
        if (!passwordMatch) {
          // Invalid password
          return res.status(401).json({ error: 'Invalid email or password' });
        }
  

        req.session.userId = result.rows[0].id;

        // Authentication successful, generate JWT token
        const token = generateToken(result.rows[0].id);
  
        // Set the token as a cookie
        res.cookie('token', token, { maxAge: 3600000, httpOnly: true });
  
        // Redirect to home page
        res.redirect('/home');
      });
    });
  });
  

   
  
  app.post("/todo/create", authenticateUser, (req, res) => {
    const title = req.body.title;
    const content = req.body.content;
    const userId = req.session.userId; // Access the userId from the authenticated user's session
  

    const sql = `INSERT INTO todos (title, content, users_id) VALUES ($1,$2,$3);`;
    const values = [title,content, userId];
  
    db.query(sql, values, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "Error inserting data into MySQL" });
      }
      res.redirect("/home");
    });
  });
  
  

app.post("/todo/update/:id", (req, res) => {
    const id = req.params.id;
    const title = req.body.title;
    const content = req.body.content;
    const sql = `UPDATE todos SET title = $1 , content = $2 WHERE id = $3;`;
    db.query(sql, [title,content, id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error updating data into MySQL" });
        }
        res.redirect("/home");
    });
});


app.get("/todo/edit/:id", (req, res) => {
    const id = req.params.id;
    const sql = `SELECT * FROM todos WHERE id = $1;`;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error executing MySQL query" });
        }
        if (result.rows[0].length === 0) {
            return res.status(404).json({ error: "Todo not found" });
        }
        res.render("todo-edit", { todo: result[0] });
    });
}); 

app.get("/todo/delete/:id", (req, res) => {
    const id = req.params.id;
    const sql = `DELETE FROM todos WHERE id = $1;`;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error deleting data from MySQL" });
        }
        res.redirect("/home");
    });
});


//app.listen(5000,'localhost');

//app.get("/", (req, res) => res.send("Express on Vercel"));


app.listen(port, () => {
    console.log('port connected');
})

module.exports = app;

/*
{
    "version": 2,
//    "builds": [{"src":"api/**/ //*.js", "use":"@vercel/node"}],
//    "routes":[{"src":"/api/(.*)","dest":"/api/$1"}]
//}
//*/
//*/