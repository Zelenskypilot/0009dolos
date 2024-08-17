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

// Function to modify balance (Add/Remove)
async function modifyBalance(chatId, username, amount, action) {
    const endpoint = action === 'add' ? 'incrementUserBalance' : 'decrementUserBalance';
    const url = `${BASE_URL}/${endpoint}?login=${username}&amount=${amount}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔄 Calling server to ${action} balance for username: ${username} with amount: ${amount}...`);

    try {
        const response = await axios.get(url);
        if (response.data.ok) {
            bot.sendMessage(chatId, `✅ Success! ${action === 'add' ? 'Added' : 'Removed'} ${amount} balance for username: ${username}.`);
        } else {
            bot.sendMessage(chatId, `❌ Failed to ${action} balance. Server response was not OK.`);
        }
    } catch (error) {
        bot.sendMessage(chatId, `⚠️ Error while trying to ${action} balance: ${error.message}`);
    }
}

// Function to get orders
async function getOrders(chatId, status, orderIds = '', limit = 10, offset = 0, serviceId = '') {
    const url = `${BASE_URL}/getOrders?status=${status}&order_ids=${orderIds}&limit=${limit}&offset=${offset}&service_id=${serviceId}&token=${API_TOKEN}`;
    bot.sendMessage(chatId, `🔄 Fetching orders with status: ${status}...`);

    try {
        const response = await axios.get(url);
        const { count, items } = response.data;
        let message = `📄 Found ${count} orders:\n\n`;

        items.forEach(order => {
            message += `Order ID: ${order.id}\nStatus: ${order.status}\nUser: ${order.user.login}\nCharge: ${order.charge}\nCurrency: ${order.currency}\nRemains: ${order.remains}\n\n`;
        });

        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, `⚠️ Error fetching orders: ${error.message}`);
    }
}

// Function to edit order
async function editOrder(chatId, orderId, status = '', startCount = null, completions = null) {
    const url = `${BASE_URL}/editOrder?order_id=${orderId}&status=${status}&start_count=${startCount}&completions=${completions}&token=${API_TOKEN}`;

    bot.sendMessage(chatId, `🔄 Editing order with ID: ${orderId}...`);

    try {
        const response = await axios.get(url);
        if (response.data.ok) {
            bot.sendMessage(chatId, `✅ Order ${orderId} updated successfully.`);
        } else {
            bot.sendMessage(chatId, `❌ Failed to edit order.`);
        }
    } catch (error) {
        bot.sendMessage(chatId, `⚠️ Error editing order: ${error.message}`);
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
                    [{ text: '📄 Get Orders', callback_data: 'get_orders' }],
                    [{ text: '✏️ Edit Order', callback_data: 'edit_order' }]
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
        } else if (action === 'get_orders') {
            userAction[chatId] = { action: 'get_orders' };
            bot.sendMessage(chatId, '📄 Please enter the order status (e.g., completed, active):');
        } else if (action === 'edit_order') {
            userAction[chatId] = { action: 'edit_order' };
            bot.sendMessage(chatId, '✏️ Please enter the Order ID to edit:');
        }
    } else {
        bot.sendMessage(chatId, '🚫 You are not authorized to use this bot.');
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Check if the user is the admin
    if (chatId === parseInt(ADMIN_USER_ID, 10)) {
        if (userAction[chatId]) {
            const action = userAction[chatId].action;

            if (action === 'add_balance' || action === 'remove_balance') {
                if (!userAction[chatId].username) {
                    userAction[chatId].username = text;
                    bot.sendMessage(chatId, '💰 Please enter the amount:');
                } else if (!userAction[chatId].amount) {
                    const amount = parseInt(text, 10);
                    if (!isNaN(amount)) {
                        modifyBalance(chatId, userAction[chatId].username, amount, userAction[chatId].action);
                        userAction[chatId] = null;
                    } else {
                        bot.sendMessage(chatId, '❗ Please enter a valid number for the amount.');
                    }
                }
            } else if (action === 'get_orders') {
                if (!userAction[chatId].status) {
                    userAction[chatId].status = text;
                    getOrders(chatId, userAction[chatId].status);
                    userAction[chatId] = null;
                }
            } else if (action === 'edit_order') {
                if (!userAction[chatId].orderId) {
                    userAction[chatId].orderId = parseInt(text, 10);
                    bot.sendMessage(chatId, '✏️ Enter the new status for the order (optional):');
                } else if (!userAction[chatId].status) {
                    userAction[chatId].status = text;
                    editOrder(chatId, userAction[chatId].orderId, userAction[chatId].status);
                    userAction[chatId] = null;
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
