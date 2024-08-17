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

async function getOrderStatus(chatId, orderId) {
    const url = `${BASE_URL}/getOrders?order_ids=${orderId}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔍 Checking the status of order ID: ${orderId}...`);

    try {
        const response = await axios.get(url);
        console.log(response.data);  // Log the response for debugging

        if (response.data.items && response.data.items.length > 0) {
            const order = response.data.items[0];
            const statusMessage = `🛒 Order ID: ${order.id}\n🔗 Link: ${order.link}\n🚦 Status: ${order.status}\n💰 Charge: ${order.charge}\n📊 Start Count: ${order.start_count}\n🔢 Remaining: ${order.remains}`;
            bot.sendMessage(chatId, statusMessage);
        } else {
            bot.sendMessage(chatId, `❌ No order found with ID: ${orderId}.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);  // Log the error for debugging
        bot.sendMessage(chatId, `⚠️ Error while checking the order status: ${error.message}`);
    }
}

async function getOrderDetails(chatId, orderId) {
    const url = `${BASE_URL}/getOrders?order_ids=${orderId}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔍 Fetching details for order ID: ${orderId}...`);

    try {
        const response = await axios.get(url);
        console.log(response.data);  // Log the response for debugging

        if (response.data.items && response.data.items.length > 0) {
            const order = response.data.items[0];
            const detailsMessage = `🛒 Order ID: ${order.id}\n🔗 Link: ${order.link}\n🚦 Status: ${order.status}\n💰 Charge: ${order.charge}\n📊 Start Count: ${order.start_count}\n🔢 Remaining: ${order.remains}\n👤 User: ${order.user.login}`;
            bot.sendMessage(chatId, detailsMessage);
        } else {
            bot.sendMessage(chatId, `❌ No order found with ID: ${orderId}.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);  // Log the error for debugging
        bot.sendMessage(chatId, `⚠️ Error while fetching order details: ${error.message}`);
    }
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Check if the user is the admin
    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        const opts = {
            reply_markup: {
                keyboard: [
                    [{ text: '🔍 Check Order Status' }],
                    [{ text: '📋 Get Order Details' }],
                    [{ text: '➕ Add Balance' }, { text: '➖ Remove Balance' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            },
        };
        bot.sendMessage(chatId, '🎉 Welcome to the Trendifysmm Bot! Choose an option:', opts);
    } else {
        bot.sendMessage(chatId, '🚫 You are not authorized to use this bot.');
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Check if the user is the admin
    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        if (text === '🔍 Check Order Status') {
            bot.sendMessage(chatId, '🛒 Please enter the Order ID to check the status:');
            userAction[chatId] = { action: 'check_status' };
        } else if (text === '📋 Get Order Details') {
            bot.sendMessage(chatId, '🛒 Please enter the Order ID to get the details:');
            userAction[chatId] = { action: 'get_details' };
        } else if (userAction[chatId]) {
            const action = userAction[chatId].action;

            if (action === 'check_status') {
                getOrderStatus(chatId, text);
            } else if (action === 'get_details') {
                getOrderDetails(chatId, text);
            }

            userAction[chatId] = null;  // Clear the action after processing
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
