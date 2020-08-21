var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')


let projectOptions = {
  id : true,
  name : true,
  members : true
}

/* GET home page. */

module.exports = (db) => {

// Start main project
  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const user = req.session.user

    let getData = `SELECT count(id) AS total FROM (SELECT DISTINCT projects.projectid AS id FROM projects
      LEFT JOIN members ON members.projectid = projects.projectid
      LEFT JOIN users ON users.userid = members.userid`

    const {checkId, checkName, checkMember, projectId, projectName, member} = req.query;

      let result = []

    if(checkId && projectId) {
      result.push(`projects.projectid=${projectId}`)
    }

      
    res.render('projects/list', {
      user,
      link
    })
  });

    // add
  router.get('/add', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const user = req.session.user
    res.render('projects/add', {
      link,
      user
      })
  });

  router.post('/add', helpers.isLoggedIn, function (req, res, next) {
    res.redirect('/projects')
  });

    // edit
  router.get('/edit/:id', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const user = req.session.user
    res.render('projects/edit', {
      link,
      user
    })
  });

  router.post('/edit/:id', helpers.isLoggedIn, function (req, res, next) {
    res.redirect('/projects')
  });

    // delete
  router.get('/delete/:id', helpers.isLoggedIn, function (req, res, next) {
    res.redirect('/projects')
  });
// end main project

// Overview
  router.get('/overview/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/overview/view', { user: req.session.user })
  });

// Activity
  router.get('/activity/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/activity/view', { user: req.session.user })
  });

// Members start
  router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/list', { user: req.session.user })
  });

    //add
  router.get('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/add', { user: req.session.user })
  });

  router.post('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });

    // edit
  router.get('/members/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/edit', { user: req.session.user })
  });

  router.post('/members/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });

    // delete
  router.get('/members/:projectid/delete/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });
// End members

// Issues start
router.get('/issues/:projectid', helpers.isLoggedIn, function (req, res, next) {
  res.render('projects/issues/list', { user: req.session.user })
});

  //add
router.get('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
  res.render('projects/issues/add', { user: req.session.user })
});

router.post('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
  res.redirect(`/projects/issues/${req.params.projectid}`)
});

  // edit
router.get('/issues/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
  res.render('projects/issues/edit', { user: req.session.user })
});

router.post('/issues/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
  res.redirect(`/projects/issues/${req.params.projectid}`)
});

  // delete
router.get('/issues/:projectid/delete/:memberid', helpers.isLoggedIn, function (req, res, next) {
  res.redirect(`/projects/issues/${req.params.projectid}`)
});
// End issues

  return router;
}
