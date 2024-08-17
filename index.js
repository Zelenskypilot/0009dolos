require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// Telegram Bot setup
const API_TOKEN = process.env.API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID; // Read admin user ID from .env
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const BASE_URL = 'https://socpanel.com/privateApi';

let userAction = {};

async function modifyBalance(chatId, username, amount, action) {
    const endpoint = action === 'add' ? 'incrementUserBalance' : 'decrementUserBalance';
    const url = `${BASE_URL}/${endpoint}?login=${username}&amount=${amount}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔄 Calling server to ${action} balance for username: ${username} with amount: ${amount}...`);

    try {
        const response = await axios.get(url);
        console.log(response.data);  // Log the response for debugging

        if (response.data.ok) {
            bot.sendMessage(chatId, `✅ Success! ${action === 'add' ? 'Added' : 'Removed'} ${amount} balance for username: ${username}.`);
        } else {
            bot.sendMessage(chatId, `❌ Failed to ${action} balance. Server response was not OK.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);  // Log the error for debugging
        bot.sendMessage(chatId, `⚠️ Error while trying to ${action} balance: ${error.message}`);
    }
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Check if the user is the admin
    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Add Balance', callback_data: 'add_balance' }],
                    [{ text: '➖ Remove Balance', callback_data: 'remove_balance' }],
                ],
            },
        };
        bot.sendMessage(chatId, '🎉 Welcome to the SMM Panel Bot! Choose an option:', opts);
    } else {
        bot.sendMessage(chatId, '🚫 You are not authorized to use this bot.');
    }
});

bot.on('callback_query', (callbackQuery) => {
    const action = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    // Check if the user is the admin
    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        if (action === 'add_balance' || action === 'remove_balance') {
            userAction[chatId] = { action: action === 'add_balance' ? 'add' : 'remove' };
            bot.sendMessage(chatId, `✏️ You chose to ${userAction[chatId].action} balance. Please enter the username:`);
        }
    } else {
        bot.sendMessage(chatId, '🚫 You are not authorized to use this bot.');
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Check if the user is the admin
    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        if (userAction[chatId] && !userAction[chatId].username) {
            const username = msg.text.trim();
            if (!username) {
                bot.sendMessage(chatId, '❗ Please enter a valid username.');
            } else {
                userAction[chatId].username = username;
                bot.sendMessage(chatId, '💰 Please enter the amount:');
            }
        } else if (userAction[chatId] && userAction[chatId].username && !userAction[chatId].amount) {
            const amount = parseInt(msg.text, 10);
            if (isNaN(amount)) {
                bot.sendMessage(chatId, '❗ Please enter a valid number for the amount.');
            } else {
                const { username, action } = userAction[chatId];
                modifyBalance(chatId, username, amount, action);
                userAction[chatId] = null;  // Clear the action after processing
            }
        }
    } else {
        bot.sendMessage(chatId, '🚫 You are not authorized to use this bot.');
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
