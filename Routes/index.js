"use strict";

exports.index = function (req, res) {
    res.render("layout", { title: "Dashboard" });
};

exports.signIn = function (req, res) {
    res.render('signIn', { title: "Log på", path: req.query._ });
};

exports.signOut = function (req, res) {
    req.logout();
    res.redirect("/");
};