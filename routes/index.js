var express = require('express');
var router = express.Router();

/* GET home page. */

module.exports = (db) => {

  router.get('/', function (req, res, next) {
    res.render('login')
  });


  router.post('/login', function (req, res, next) {
    db.query('SELECT * FROM users', (err, data) => {
      console.log(err, data)
    })
  });

  return router;
}