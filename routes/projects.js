var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')
var path = require('path');
const { readSync } = require('fs');


let projectOptions = {
  id: true,
  name: true,
  member: true
}

/* GET home page. */

module.exports = (db) => {

  // Start main project
  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const user = req.session.user

    let getData = `SELECT count(id) AS total from (SELECT DISTINCT projects.projectid as id FROM projects
      LEFT JOIN members ON members.projectid = projects.projectid
      LEFT JOIN users ON users.userid = members.userid `

    const { checkId, checkName, checkMember, projectId, projectName, member } = req.query;

    let query = []

    if (checkId && projectId) {
      query.push(`projects.projectid=${projectId}`)
    }
    if (checkName && projectName) {
      query.push(`projects.name ILIKE '%${projectName}%'`)
    }
    if (checkMember && member) {
      query.push(`members.userid =${member}`)
    }

    if (query.length > 0) {
      getData += ` WHERE ${query.join(" AND ")}`
    }

    getData += `) AS projectname`;

    // console.log(getData);

    db.query(getData, (err, totalData) => {
      // console.log(totalData);
      if (err) return res.status(500).json({
        error: true,
        massage: err
      })
      //pgnation
      const url = req.url == '/' ? '/?page=1' : req.url
      const page = req.query.page || 1
      const limit = 3
      const offset = (page - 1) * limit
      const total = totalData.rows[0].total
      const pages = Math.ceil(total / limit)

      let getData = `SELECT DISTINCT projects.projectid, projects.name,
      string_agg(users.firstname || ' ' || users.lastname, ', ') as member FROM projects
      LEFT JOIN members ON members.projectid = projects.projectid
      LEFT JOIN users ON users.userid = members.userid `

      if (query.length > 0) {
        getData += `WHERE ${query.join('AND')}`
      }

      getData += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset} `;
      // console.log(getData);

      db.query(getData, (err, dataProject) => {
        // console.log(dataProject);
        if (err) return res.status(500).json({
          error: true,
          massage: err
        })

        let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users;`

        db.query(getUser, (err, dataUsers) => {
          // console.log(dataUsers);
          if (err) return res.status(500).json({
            error: true,
            massage: err

          })

          res.render('projects/list', {
            url,
            user,
            link,
            page,
            pages,
            query: dataProject.rows,
            users: dataUsers.rows,
            option: projectOptions,
          })
        })
      })
    })
    router.post('/option', helpers.isLoggedIn, (req, res) => {
      projectOptions.id = req.body.checkid;
      projectOptions.name = req.body.checkname;
      projectOptions.member = req.body.checkmember;
      res.redirect('/projects')
    })
  });

  // add project list
  router.get('/add', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const user = req.session.user
    let sql = `SELECT DISTINCT (userid), concat(firstname,' ',lastname) AS fullname FROM users ORDER BY fullname`
    db.query(sql, (err, data) => {
      // console.log(data);
      if (err) return res.status(500).json({
        error: true,
        massage: err
      })

      res.render('projects/add', {
        link,
        data: data.rows,
        user
      })
    })
  });

  router.post('/add', helpers.isLoggedIn, function (req, res, next) {
    const { members, projectName } = req.body

    let sql = `INSERT INTO projects (name) values('${projectName}')`
    db.query(sql, (err) => {
      if (err) return res.send(err)

      db.query('SELECT projectid FROM projects ORDER BY projectid desc limit 1', (err, projectid) => {
        if (err) return res.send(err)

        let id = projectid.rows[0].projectid;
        let query = [];

        for (let i = 0; i < members.length; i++) {
          query.push(`(${members[i]}, ${id})`)
        }
        db.query(`INSERT INTO members (userid, projectid) values ${query.join(',')}`, (err, data) => {
          res.redirect('/projects')
        })
      })
    })
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
