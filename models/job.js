// models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true, // Make the ID field required
        unique: true, // Ensure that the ID is unique across jobs
    },
    farmerName: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    vacancies: {
        type: Number,
        required: true
    },
    wage: {
        type: Number,
        required: true
    },
    ageRestriction: {
        type: String,
        default: '' // Optional field
    },
    postedTime: {
        type: String,
        required: true
    },
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
