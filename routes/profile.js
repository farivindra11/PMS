var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')

/* GET home page. */

module.exports = (db) => {

  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    const link = 'profile';
    const user = req.session.user
    res.render('profile/view', {
      user,
      link
    })
  });

  router.post('/', helpers.isLoggedIn, function (req, res, next) {
    res.redirect('/profile')
  });

  return router;
}