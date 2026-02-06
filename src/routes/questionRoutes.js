const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, questionController.createQuestion);
router.get('/semester/:semester_id', verifyToken, questionController.getQuestionsBySemester);
router.delete('/:id', verifyToken, questionController.deleteQuestion);

module.exports = router;