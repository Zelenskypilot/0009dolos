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

// Modify Balance
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

// Get Order Details
async function getOrderDetails(chatId, username, orderId) {
    const url = `${BASE_URL}/getOrders?order_ids=${orderId}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔍 Checking order details for Order ID: ${orderId} and Username: ${username}...`);

    try {
        const response = await axios.get(url);
        console.log(response.data);  // Log the response for debugging

        if (response.data.count > 0) {
            const order = response.data.items.find(order => order.user.login === username);
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
                bot.sendMessage(chatId, `❌ No order found for Order ID: ${orderId} and Username: ${username}.`);
            }
        } else {
            bot.sendMessage(chatId, `❌ No order found for Order ID: ${orderId}.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);  // Log the error for debugging
        bot.sendMessage(chatId, `⚠️ Error while trying to get order details: ${error.message}`);
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
                bot.sendMessage(chatId, '🔍 Please enter the Order ID:');
            } else if (!userAction[chatId].orderId) {
                const orderId = parseInt(text, 10);
                if (!isNaN(orderId)) {
                    userAction[chatId].orderId = orderId;

                    if (userAction[chatId].action === 'check_status') {
                        getOrderDetails(chatId, userAction[chatId].username, userAction[chatId].orderId);
                    } else if (userAction[chatId].action === 'get_details') {
                        getOrderDetails(chatId, userAction[chatId].username, userAction[chatId].orderId);
                    }
                    userAction[chatId] = null;  // Clear the action after processing
                } else {
                    bot.sendMessage(chatId, '❗ Please enter a valid Order ID.');
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
