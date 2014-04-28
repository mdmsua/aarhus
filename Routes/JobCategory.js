module.exports = JobCategory;

function JobCategory() { }

JobCategory.index = function (req, res) {
    res.render('jobcategory');
};