require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// Telegram Bot setup
const API_TOKEN = process.env.API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const BASE_URL = 'https://socpanel.com/privateApi';

let userAction = {};

async function getOrderInfo(chatId, serviceId) {
    const url = `${BASE_URL}/getOrders?service_id=${serviceId}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔄 Checking order information for service ID: ${serviceId}...`);

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.count > 0) {
            const order = data.items[0];
            bot.sendMessage(chatId, `✅ Order Found:\n\nID: ${order.id}\nCharge: ${order.charge}\nStart Count: ${order.start_count}\nStatus: ${order.status}\nRemains: ${order.remains}\nCurrency: ${order.currency}\nService ID: ${order.service_id}\nUser: ${order.user.login}`);
        } else {
            bot.sendMessage(chatId, `❌ No order found for Service ID: ${serviceId}`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        bot.sendMessage(chatId, `⚠️ Error while checking order: ${error.message}`);
    }
}

async function checkOrderStatus(chatId, serviceId) {
    const url = `${BASE_URL}/getOrders?service_id=${serviceId}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔄 Checking order status for service ID: ${serviceId}...`);

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.count > 0) {
            const order = data.items[0];
            bot.sendMessage(chatId, `✅ Order Status:\n\nID: ${order.id}\nStatus: ${order.status}`);
        } else {
            bot.sendMessage(chatId, `❌ No order found for Service ID: ${serviceId}`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        bot.sendMessage(chatId, `⚠️ Error while checking order status: ${error.message}`);
    }
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        const options = {
            reply_markup: {
                keyboard: [
                    [{ text: 'Get Order Info' }],
                    [{ text: 'Check Order Status' }],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        };
        bot.sendMessage(chatId, '🎉 Welcome to the Trendifysmm Marketing Agency Admin Bot! I can help manage www.trendifysmm.com website.', options);
    } else {
        bot.sendMessage(chatId, '🚫 You are not authorized to use this bot.');
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        if (text === 'Get Order Info') {
            userAction[chatId] = 'get_order_info';
            bot.sendMessage(chatId, '✏️ Please enter the Service ID:');
        } else if (text === 'Check Order Status') {
            userAction[chatId] = 'check_order_status';
            bot.sendMessage(chatId, '✏️ Please enter the Service ID:');
        } else if (userAction[chatId] === 'get_order_info' && text) {
            const serviceId = text;
            getOrderInfo(chatId, serviceId);
            userAction[chatId] = null;  // Clear the action after processing
        } else if (userAction[chatId] === 'check_order_status' && text) {
            const serviceId = text;
            checkOrderStatus(chatId, serviceId);
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
