import { env } from "node:process";
import { FileAdapter } from "@grammyjs/storage-file";
import { config as dotenv } from "dotenv";
import { Bot, session } from "grammy";
import { MenuMiddleware } from "grammy-inline-menu";
import { generateUpdateMiddleware } from "telegraf-middleware-console-time";
import { i18n } from "../translation.js";
import { menu } from "./menu/index.js";
import type { MyContext, Session } from "./my-context.js";
import { followAddressforDB } from "../followDB.js";

dotenv(); // Load from .env file
const token = env["BOT_TOKEN"];
if (!token) {
	throw new Error(
		"You have to provide the bot-token from @BotFather via environment variable (BOT_TOKEN)",
	);
}

const bot = new Bot<MyContext>(token);

// Define a simple in-memory storage for tracking context
const contextStore = new Map<number, string>(); // Map user IDs to previous messages
const addressStore = new Map<number, string>();

bot.use(
	session({
		initial: (): Session => ({}),
		storage: new FileAdapter(),
	}),
);

// Event handler for handling button presses
bot.use(async (ctx, next) => {
	contextStore.set(
		ctx.callbackQuery?.from.id || 0,
		ctx.callbackQuery?.data || "",
	);

	await next();
});

bot.use(async (ctx: MyContext, next) => {
	// Check if the user has sent a text message
	if (ctx.message && ctx.message.text) {
		const userId = ctx.message.from?.id || 0;
		const userInput = ctx.message.text;
		const pattern = /^0x([a-fA-F0-9]{40})$/;

		// Retrieve previous message from context store
		const previousMessage = contextStore.get(userId);

		// Process user input based on context
		let response = "";
		if (
			previousMessage === `/follow@${ctx.me.username}` ||
			previousMessage === `/follow` ||
			previousMessage === "/follow/"
		) {
			if (pattern.test(userInput)) {
				addressStore.set(userId, userInput);
				response = `You typed valid wallet address: ${userInput}. Is it correct?`;
				// Create an inline keyboard with "Yes" and "No" buttons
				const keyboard = {
					inline_keyboard: [
						[
							{ text: "Yes", callback_data: "confirm_yes" },
							{ text: "No", callback_data: "/" },
						],
					],
				};

				// Send the response text along with the inline keyboard
				await ctx.reply(response, { reply_markup: keyboard });
			} else {
				response = `Invalid wallet address. Please go back to menu and try again.`;
				const keyboard = {
					inline_keyboard: [[{ text: "Back", callback_data: "/" }]],
				};
				// Send the response text along with the back button
				await ctx.reply(response, { reply_markup: keyboard });
			}
		}
		if (!pattern.test(userInput || "")) {
			addressStore.set(userId, "");
		}

		contextStore.set(userId, userInput);
	}
	// Continue processing other middleware and handlers
	await next();
});

bot.use(i18n.middleware());

if (env["NODE_ENV"] !== "production") {
	// Show what telegram updates (messages, button clicks, ...) are happening (only in development)
	bot.use(generateUpdateMiddleware());
}

bot.command("help", async (ctx) => ctx.reply(ctx.t("help")));

const menuMiddleware = new MenuMiddleware("/", menu);

bot.command("start", async (ctx) => menuMiddleware.replyToContext(ctx));
bot.command("follow", async (ctx) => {
	await menuMiddleware.replyToContext(ctx, "/follow/");
});
bot.use(menuMiddleware.middleware());

bot.on("callback_query:data", async (ctx) => {
	// const userId = ctx.callbackQuery?.from.id || 0;
	const callbackData = ctx.callbackQuery?.data || "";

	if (callbackData === "confirm_yes") {
		// Perform actions when the user confirms "Yes"
		// For example, you can log a message or send a reply
		const userId = ctx.callbackQuery.from.id;
		const address = addressStore.get(userId);
		await ctx.answerCallbackQuery({ text: "You confirmed 'Yes'." });
		console.log(address);
		if (/^0x([a-fA-F0-9]{40})$/.test(address || "")) {
			const res = await followAddressforDB({
				address: address,
				data: "telegram",
			});
			console.log(res.ok);

			// Now you can proceed with the desired logic
			// For example, you can send a message to the user
			await ctx.reply(
				"you followed the telegram channel and now you can check it on the website launchpad buy page. ",
			);
		} else {
			const response =
				"Something went wrong. Go to follow button and try again";
			const keyboard = {
				inline_keyboard: [[{ text: "Back", callback_data: "/" }]],
			};
			// Send the response text along with the back button
			await ctx.reply(response, { reply_markup: keyboard });
		}
	}
});

// Listen for new members joining the group
bot.on("message", async (ctx) => {
	if (ctx.message?.new_chat_members) {
		// Iterate over each new member
		for (const member of ctx.message.new_chat_members) {
			// Check if the new member is the bot itself
			if (member.id === ctx.me.id) {
				// Skip if the bot itself joined the group
				continue;
			}
			menuMiddleware.replyToContext(ctx);
		}
	}
});

// False positive as bot is not a promise
// eslint-disable-next-line unicorn/prefer-top-level-await
bot.catch((error) => {
	console.error("ERROR on handling update occured", error);
});

export async function start(): Promise<void> {
	// The commands you set here will be shown as /commands like /start or /magic in your telegram client.
	await bot.api.setMyCommands([
		{ command: "start", description: "open the menu" },
		{ command: "follow", description: "follow by telegram" },
		{ command: "help", description: "show the help" },
	]);

	await bot.start({
		onStart(botInfo) {
			console.log(new Date(), "Bot starts as", botInfo.username);
		},
	});
}
