const { Bot } = require("grammy");

// 1. Встав сюди токен, який ти отримав від @BotFather
const bot = new Bot("8966606507:AAEt4_J0hMXeBGkeNtav7o3p7SIPoSmLJNI");

// 2. Повний словник матерних слів та виразів (у нижньому регістрі)
const BAD_WORDS = [
    // Українські та російські корені/слова
    "хуй", "нахуй", "охуеть", "охуїти", "хуёвый", "хуйовий", "хуила", "хуїло", 
    "хуярить", "хуярити", "дохуя", "нихуя", "ніхуя", "пизда", "пиздец", "пиздець", 
    "пиздеть", "пиздіти", "пиздюк", "распиздяй", "розпиздяй", "пиздануть", "пизданути", 
    "ебать", "їбати", "ёбнуть", "йобнути", "заебать", "заїбати", "выебать", "виїбати", 
    "поебать", "поїбати", "доебаться", "доїбатися", "уебать", "уїбати", "ебаный", "йобаний", 
    "заебись", "заїбісь", "блядь", "блять", "блядский", "блядський", "выблядок", "виблядок",
    
    // Англійські слова та фрази
    "dick", "cock", "fuck off", "to hell", "holy shit", "be fucking amazed", 
    "shitty", "crappy", "dickhead", "asshole", "to hit hard", "to do intensely", 
    "fucking smash", "a fucking lot", "a ton", "nothing", "not a damn thing", "cunt", 
    "fucked up", "complete disaster", "to bullshit", "to lie", "little brat", "little shit", 
    "slacker", "fuck-up", "to blurt out", "to fuck", "to whack", "to go crazy", "to piss off", 
    "to annoy", "to screw", "not give a fuck", "to pick on", "to hassle", "to smash", 
    "fucking", "fucked-up", "damn", "awesome", "fucking great", "fuck!", "bitch!", "damn!", 
    "damned", "bastard", "son of a bitch", "fuck"
];

// 3. База даних у пам'яті для лічильника попереджень { user_id: count }
const userWarnings = {};

// Функція перевірки на мат
function containsBadWords(text) {
    if (!text) return false;
    
    // Переводимо в нижній регістр та очищаємо від знаків
    let textLower = text.toLowerCase();
    const charsToRemove = [".", ",", "!", "?", ")", "(", "-", "_"];
    charsToRemove.forEach(char => {
        textLower = textLower.split(char).join(" ");
    });

    // Перевіряємо наявність слів зі списку
    return BAD_WORDS.some(word => textLower.includes(word));
}

// Слухаємо всі текстові повідомлення
bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const firstName = ctx.from.first_name;

    if (containsBadWords(ctx.message.text)) {
        // 1. Видаляємо повідомлення з матом
        try {
            await ctx.deleteMessage();
        } catch (error) {
            console.error("Не вдалося видалити повідомлення (можливо, немає прав адміна):", error.message);
            return;
        }

        // Ініціалізуємо лічильник для юзера
        if (!userWarnings[userId]) {
            userWarnings[userId] = 0;
        }

        // Завжди +1 за факт наявності мату в одному повідомленні
        userWarnings[userId] += 1;
        const warningsCount = userWarnings[userId];

        if (warningsCount < 3) {
            // Попередження 1 та 2
            const warningText = 
                `⚠️ <b>Прохання так не виражатися, ${firstName}.</b>\n` +
                `<u>Так писати не можна</u>, є інші методи висловити свою думку.\n` +
                `Попередження: ${warningsCount}/2`;

            await ctx.reply(warningText, { parse_mode: "HTML" });
        } else {
            // 3-є порушення: БАН НА 1 ГОДИНУ
            const banUntil = Math.floor(Date.now() / 1000) + 3600; // Поточний час в сек + 1 година

            try {
                await ctx.banChatMember(userId, { until_date: banUntil });
                await ctx.reply(`🚫 Користувач ${firstName} відправлений в бан на 1 годину за систематичний мат.`);
            } catch (error) {
                await ctx.reply("Не вдалося забанити користувача. Перевірте мої права адміна!");
                console.error("Помилка бану:", error.message);
            }

            // Обнуляємо лічильник після бану
            userWarnings[userId] = 0;
        }
    }
});

// Запуск бота
console.log("JS Бот успішно запущений і модерирує чат...");
bot.start();