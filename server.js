const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

////////////////////
// DATABASE
////////////////////
const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'password',
    database : 'bronaldinhos-db'
  }
});

// Testing the above to ensure DB is connected
// console.log(db.select('*').from('users'));
// db.select('*').from('users').then(data => {
//   console.log(data);
// });

////////////////////
// RUN EXPRESS
////////////////////
const app = express();

////////////////////
// MIDDLEWARE
////////////////////
app.use(bodyParser.json());
app.use(cors());

////////////////////
// ROUTING
////////////////////
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json('incorrect form submission')
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx =>  {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            name: name,
            email: loginEmail[0],
            joined: new Date()
          })
          .then(user => {
            res.json(user[0])
            // res.json('success')
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })

    .catch(err => res.status(400).json('INVALID REGISTER'))
})

app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json('incorrect form submission')
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
      // console.log(data[0]);
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', req.body.email)
          .then(user => {
            res.json(user[0])
            // res.json('success')
          })
          // user in login table but not in users table
          .catch(err => res.status(400).json('INVALID SIGNIN'))
      } else {
        // invalid password (isValid = false)
        res.status(400).json('INVALID SIGNIN')
      }
    })
    // invalid username (username not in db)
    .catch(err => res.status(400).json('INVALID SIGNIN'))
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({
    id: id
  })
  .then(user => {
    if (user.length) {
      res.json(user[0])
    } else {
      res.status(400).json('User Not Found')
    }
  })
  .catch(err => res.status(400).json('error getting user'))
})

////////////////////
// LISTEN (PORT 3000)
////////////////////
app.listen(3000, ()=> {
  console.log('app is running on port 3000')
});
