const { Bot } = require("grammy");
const express = require("express");

// ====================================================================
// 1. НАЛАШТУВАННЯ ВЕБ-СЕРВЕРУ (Щоб Render не вимикав бота)
// ====================================================================
const app = express();
const PORT = process.env.PORT || 3000;

// Коли Cron-Job або UptimeRobot буде заходити за цим шляхом, сервер відповість "ОК"
app.get("/", (req, res) => {
    res.send("Bot is alive and running!");
});

app.listen(PORT, () => {
    console.log(`[Веб-сервер]: Запущено на порту ${PORT}`);
});

// ====================================================================
// 2. ІНІЦІАЛІЗАЦІЯ TELEGRAM БОТА
// ====================================================================
// Сюди встав свій токен, отриманий від @BotFather
const bot = new Bot("8966606507:AAEt4_J0hMXeBGkeNtav7o3p7SIPoSmLJNI");

// ====================================================================
// 3. БАЗА МАТЕРНИХ СЛІВ ТА ВИРАЗІВ (3 мови)
// ====================================================================
const BAD_WORDS = [
    // Українська та російська мови
    "хуй", "нахуй", "охуеть", "охуїти", "хуёвый", "хуйовий", "хуила", "хуїло", 
    "хуярить", "хуярити", "дохуя", "нихуя", "ніхуя", "пизда", "пиздец", "пиздець", 
    "пиздеть", "пиздіти", "пиздюк", "распиздяй", "розпиздяй", "пиздануть", "пизданути", 
    "ебать", "їбати", "ёбнуть", "йобнути", "заебать", "заїбати", "выебать", "виїбати", 
    "поебать", "поїбати", "доебаться", "доїбатися", "уебать", "уїбати", "ебаный", "йобаний", 
    "заебись", "заїбісь", "блядь", "блять", "блядский", "блядський", "выблядок", "виблядок",
    
    // Англійська мова (English)
    "dick", "cock", "fuck off", "to hell", "holy shit", "be fucking amazed", 
    "shitty", "crappy", "dickhead", "asshole", "to hit hard", "to do intensely", 
    "fucking smash", "a fucking lot", "a ton", "nothing", "not a damn thing", "cunt", 
    "fucked up", "complete disaster", "to bullshit", "to lie", "little brat", "little shit", 
    "slacker", "fuck-up", "to blurt out", "to fuck", "to whack", "to go crazy", "to piss off", 
    "to annoy", "to screw", "not give a fuck", "to pick on", "to hassle", "to smash", 
    "fucking", "fucked-up", "damn", "awesome", "fucking great", "fuck", "bitch", "damned", 
    "bastard", "son of a bitch"
];

// Локальна база даних у пам'яті для лічильника попереджень { user_id: count }
const userWarnings = {};

// ====================================================================
// 4. ФУНКЦІЯ ПЕРЕВІРКИ ТЕКСТУ
// ====================================================================
function containsBadWords(text) {
    if (!text) return false;
    
    let textLower = text.toLowerCase();
    
    // Очищаємо текст від розділових знаків, щоб обійти варіанти типу "хуй!!!" або "блять,"
    const charsToRemove = [".", ",", "!", "?", ")", "(", "-", "_", "*", "/"];
    charsToRemove.forEach(char => {
        textLower = textLower.split(char).join(" ");
    });

    // Перевіряємо, чи є хоча б одне заборонене слово в очищеному тексті
    return BAD_WORDS.some(word => textLower.includes(word));
}

// ====================================================================
// 5. ОБРОБКА ПОВІДОМЛЕНЬ У ЧАТІ
// ====================================================================
bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const firstName = ctx.from.first_name;

    // Якщо знайдено мат (неважливо скільки слів у повідомленні, рахуємо як 1 факт порушення)
    if (containsBadWords(ctx.message.text)) {
        
        // 1. Спроба видалити повідомлення порушника
        try {
            await ctx.deleteMessage();
        } catch (error) {
            console.error("[Помилка]: Не вдалося видалити повідомлення. Перевірте права адміна бота у групі!", error.message);
            return; // Зупиняємо виконання, якщо бот не адмін і не може видалити повідомлення
        }

        // 2. Робота з лічильником
        if (!userWarnings[userId]) {
            userWarnings[userId] = 0;
        }

        userWarnings[userId] += 1;
        const warningsCount = userWarnings[userId];

        // 3. Реагування на кількість порушень
        if (warningsCount < 3) {
            // Попередження 1 та 2 (Текст відформатовано за допомогою HTML)
            const warningText = 
                `⚠️ <b>Прохання так не виражатися, ${firstName}.</b>\n` +
                `<u>Так писати не можна</u>, є інші методи висловити свою думку.\n` +
                `Попередження: ${warningsCount}/2`;

            await ctx.reply(warningText, { parse_mode: "HTML" });
        } else {
            // 3-є порушення: БАН НА 1 ГОДИНУ
            const banUntil = Math.floor(Date.now() / 1000) + 3600; // Поточний UNIX-час + 3600 секунд (1 година)

            try {
                // Банимо користувача в цьому чаті на вказаний час
                await ctx.banChatMember(userId, { until_date: banUntil });
                await ctx.reply(`🚫 Користувач ${firstName} відправлений в бан на 1 годину за систематичний мат.`);
            } catch (error) {
                await ctx.reply("❌ Не вдалося забанити користувача. Перевірте, чи є у бота права бану!");
                console.error("[Помилка бану]:", error.message);
            }

            // Обов'язково обнуляємо лічильник для цього користувача
            userWarnings[userId] = 0;
        }
    }
});

// ====================================================================
// 6. ЗАПУСК СЛУХАННЯ ТЕЛЕГРАМ
// ====================================================================
console.log("[Бот]: Слухання Telegram запущено. Модерація активована...");
bot.start();
