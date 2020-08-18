var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
/* GET home page. */

module.exports = (db) => {

  router.get('/', function (req, res, next) {
    res.render('login')
  });

// login routes
  router.post('/login', function (req, res, next) {
    const {email, password} = req.body
    db.query('SELECT * FROM users WHERE email = $1', [email], (err, data) => {
      if (err) return res.send('gagal')

      if (data.rows.length == 0) return res.send('email ga ketemu')

      bcrypt.compare(password, data.rows[0].password, function(err, isValid) {
        // result == true
        if (err) return res.send('gagal')

        if (isValid){ 
          req.session.user = data.rows[0]
          res.redirect('/projects')
        } else {
          res.send('pass salah')
        }
    });
       

      
    })
  });

  return router;
}
