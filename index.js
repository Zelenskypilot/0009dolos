require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const API_TOKEN = process.env.API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const BASE_URL = 'https://socpanel.com/privateApi';

let userAction = {};

async function modifyBalance(chatId, login, amount, action) {
    const endpoint = action === 'add' ? 'incrementUserBalance' : 'decrementUserBalance';
    const url = `${BASE_URL}/${endpoint}?login=${login}&amount=${amount}&token=${API_TOKEN}`;

    try {
        const response = await axios.get(url);
        if (response.data.ok) {
            bot.sendMessage(chatId, `Balance successfully ${action === 'add' ? 'added to' : 'removed from'} user ${login}.`);
        } else {
            bot.sendMessage(chatId, `Failed to ${action} balance for user ${login}.`);
        }
    } catch (error) {
        bot.sendMessage(chatId, `Error: ${error.message}`);
    }
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Add Balance', callback_data: 'add_balance' }],
                [{ text: 'Remove Balance', callback_data: 'remove_balance' }],
            ],
        },
    };
    bot.sendMessage(chatId, 'Welcome to the SMM Panel Bot! Choose an option:', opts);
});

bot.on('callback_query', (callbackQuery) => {
    const action = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    if (action === 'add_balance' || action === 'remove_balance') {
        userAction[chatId] = { action: action === 'add_balance' ? 'add' : 'remove' };
        bot.sendMessage(chatId, `You chose to ${userAction[chatId].action} balance. Please enter the user's login:`);
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (userAction[chatId] && !userAction[chatId].login) {
        userAction[chatId].login = msg.text;
        bot.sendMessage(chatId, 'Please enter the amount:');
    } else if (userAction[chatId] && userAction[chatId].login && !userAction[chatId].amount) {
        const amount = parseInt(msg.text, 10);
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Please enter a valid number for the amount.');
        } else {
            userAction[chatId].amount = amount;
            const { login, amount, action } = userAction[chatId];
            modifyBalance(chatId, login, amount, action);
            userAction[chatId] = null;
        }
    }
});
