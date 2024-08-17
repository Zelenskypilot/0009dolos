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

// Get Order Details with detailed logging
async function getOrderDetails(chatId, username, serviceId) {
    const url = `${BASE_URL}/getOrders?token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔍 Checking order details for Service ID: ${serviceId} and Username: ${username}...`);

    try {
        const response = await axios.get(url);
        if (response.data.count > 0) {
            const order = response.data.items.find(order => order.user.login === username && order.service_id == serviceId);
            if (order) {
                bot.sendMessage(chatId, `✅ Order found: 
- Order ID: ${order.id}
- Charge: ${order.charge}
- Start Count: ${order.start_count}
- Status: ${order.status}
- Remains: ${order.remains}
- Service ID: ${order.service_id}
- User: ${order.user.login}`);
            } else {
                bot.sendMessage(chatId, `❌ No order found for Service ID: ${serviceId} and Username: ${username}. Please make sure the Service ID is correct.`);
            }
        } else {
            bot.sendMessage(chatId, `❌ No orders found for Username: ${username}.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        bot.sendMessage(chatId, `⚠️ Error while trying to get order details: ${error.message}`);
    }
}

// Increment user balance
async function incrementBalance(chatId, username, amount) {
    const url = `${BASE_URL}/incrementUserBalance?login=${username}&amount=${amount}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔄 Adding ${amount} to balance for user ${username}...`);

    try {
        const response = await axios.get(url);
        if (response.data.ok) {
            bot.sendMessage(chatId, `✅ Balance successfully added for user ${username}.`);
        } else {
            bot.sendMessage(chatId, `❌ Failed to add balance for user ${username}.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        bot.sendMessage(chatId, `⚠️ Error while trying to add balance: ${error.message}`);
    }
}

// Decrement user balance
async function decrementBalance(chatId, username, amount) {
    const url = `${BASE_URL}/decrementUserBalance?login=${username}&amount=${amount}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔄 Removing ${amount} from balance for user ${username}...`);

    try {
        const response = await axios.get(url);
        if (response.data.ok) {
            bot.sendMessage(chatId, `✅ Balance successfully removed for user ${username}.`);
        } else {
            bot.sendMessage(chatId, `❌ Failed to remove balance for user ${username}.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        bot.sendMessage(chatId, `⚠️ Error while trying to remove balance: ${error.message}`);
    }
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Check if the user is the admin
    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        const opts = {
            reply_markup: {
                keyboard: [
                    [{ text: '➕ Add Balance' }],
                    [{ text: '➖ Remove Balance' }],
                    [{ text: '🔍 Check Order Status' }],
                    [{ text: 'ℹ️ Get Order Details' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        };
        bot.sendMessage(chatId, '🎉 Welcome to the Trendifysmm Marketing Agency Admin Bot! I can help manage www.trendifysmm.com website.', opts);
    } else {
        bot.sendMessage(chatId, '🚫 You are not authorized to use this bot.');
    }
});

// Handle Text Messages
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Check if the user is the admin
    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        if (text === '➕ Add Balance' || text === '➖ Remove Balance') {
            userAction[chatId] = { action: text.includes('Add') ? 'add' : 'remove' };
            bot.sendMessage(chatId, `✏️ You chose to ${userAction[chatId].action} balance. Please enter the username:`);
        } else if (text === '🔍 Check Order Status' || text === 'ℹ️ Get Order Details') {
            userAction[chatId] = { action: text.includes('Check') ? 'check_status' : 'get_details' };
            bot.sendMessage(chatId, '🔍 Please enter the username associated with the order:');
        } else if (userAction[chatId]) {
            if (!userAction[chatId].username) {
                userAction[chatId].username = text;
                bot.sendMessage(chatId, '🔍 Please enter the Service ID:');
            } else if (!userAction[chatId].serviceId) {
                const serviceId = parseInt(text, 10);
                if (!isNaN(serviceId)) {
                    userAction[chatId].serviceId = serviceId;

                    if (userAction[chatId].action === 'check_status') {
                        getOrderDetails(chatId, userAction[chatId].username, userAction[chatId].serviceId);
                    } else if (userAction[chatId].action === 'get_details') {
                        getOrderDetails(chatId, userAction[chatId].username, userAction[chatId].serviceId);
                    }
                    userAction[chatId] = null;  // Clear the action after processing
                } else {
                    bot.sendMessage(chatId, '❗ Please enter a valid Service ID.');
                }
            } else if (userAction[chatId].action === 'add') {
                const amount = parseInt(text, 10);
                if (!isNaN(amount)) {
                    incrementBalance(chatId, userAction[chatId].username, amount);
                    userAction[chatId] = null;  // Clear the action after processing
                } else {
                    bot.sendMessage(chatId, '❗ Please enter a valid amount.');
                }
            } else if (userAction[chatId].action === 'remove') {
                const amount = parseInt(text, 10);
                if (!isNaN(amount)) {
                    decrementBalance(chatId, userAction[chatId].username, amount);
                    userAction[chatId] = null;  // Clear the action after processing
                } else {
                    bot.sendMessage(chatId, '❗ Please enter a valid amount.');
                }
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
