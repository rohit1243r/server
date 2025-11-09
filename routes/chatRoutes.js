const express = require('express');
const { sendMessage, getChatHistory, getChat, deleteChat } = require('../controllers/chatController');
const auth = require('../middlewares/auth');
const tokenCheck = require('../middlewares/tokenCheck');

const router = express.Router();

router.post('/:model', auth, tokenCheck, sendMessage);
router.get('/history', auth, getChatHistory);
router.get('/:chatId', auth, getChat);
router.delete('/:chatId', auth, deleteChat);

module.exports = router;
