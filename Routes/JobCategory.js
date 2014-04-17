module.exports = JobCategory;

function JobCategory() { }

JobCategory.prototype.index = function (req, res) {
    res.render('jobcategory');
};