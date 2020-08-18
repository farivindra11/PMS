var express = require('express');
var router = express.Router();


/* GET home page. */

module.exports = (db) => {

  router.get('/', isLoggedIn, function (req, res, next) {
    res.render('projects/list')
  });


  return router;
}

const isLoggedIn = (req, res, next) => {
    if(req.session.user) {
        next()
    } else {
        res.redirect('/')
    }
}