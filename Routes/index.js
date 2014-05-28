"use strict";

exports.index = function (req, res) {
    res.render("layout", { title: "Dashboard" });
};

exports.signOut = function (req, res) {
    req.logout();
    res.redirect("/");
};