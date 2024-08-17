require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// Telegram Bot setup
const API_TOKEN = process.env.API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const BASE_URL = 'https://socpanel.com/privateApi';

let userAction = {};

async function modifyBalance(chatId, userId, amount, action) {
    const endpoint = action === 'add' ? 'incrementUserBalance' : 'decrementUserBalance';
    const url = `${BASE_URL}/${endpoint}?user_id=${userId}&amount=${amount}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `Calling server to ${action} balance for user ID: ${userId} with amount: ${amount}...`);

    try {
        const response = await axios.get(url);
        console.log(response.data);  // Log the response for debugging

        if (response.data.ok) {
            bot.sendMessage(chatId, `Success! ${action === 'add' ? 'Added' : 'Removed'} ${amount} balance for user ID: ${userId}.`);
        } else {
            bot.sendMessage(chatId, `Failed to ${action} balance. Server response was not OK.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);  // Log the error for debugging
        bot.sendMessage(chatId, `Error while trying to ${action} balance: ${error.message}`);
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
        bot.sendMessage(chatId, `You chose to ${userAction[chatId].action} balance. Please enter the user's ID:`);
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (userAction[chatId] && !userAction[chatId].userId) {
        const userId = parseInt(msg.text, 10);
        if (isNaN(userId)) {
            bot.sendMessage(chatId, 'Please enter a valid user ID (a number).');
        } else {
            userAction[chatId].userId = userId;
            bot.sendMessage(chatId, 'Please enter the amount:');
        }
    } else if (userAction[chatId] && userAction[chatId].userId && !userAction[chatId].amount) {
        const amount = parseInt(msg.text, 10);
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Please enter a valid number for the amount.');
        } else {
            const { userId, action } = userAction[chatId];
            modifyBalance(chatId, userId, amount, action);
            userAction[chatId] = null;  // Clear the action after processing
        }
    }
});

// HTTP server setup to keep the bot running on Render
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running...\n');
}).listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
