import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import clipboard from 'clipboardy';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sanitize from 'sanitize-filename';

// Only for debug:
import util from 'util';

// Fix for __dirname not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

marked.use(markedTerminal({ reflowText: true, width: process.stdout.columns }));

// ANSI escape sequences
const reset = '\x1b[0m';
const reverse = '\x1b[7m';
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const grey = '\x1b[90m';

// Get user input
async function prompt(text = `${green}🮥${reset}  `) {
	const rl = readline.createInterface({ input, output });
	const answer = await rl.question(text);
	rl.close();
	return answer;
}

// Message header
function header(text, color) {
	const len = process.stdout.columns - text.length - 3;
	console.log(`\n${color}${reverse} ${text} ${reset}${color}${'─'.repeat(len)}${reset}`);
}

function headerCenter(text, color) {
	const len = process.stdout.columns - text.length - 4;
	const left = Math.floor(len / 2);
	const right = len - left;
	// 🭮 🭬
	console.log(
		`\n\n${color}${'━'.repeat(left)}${reverse} ${text} ${reset}${color}${'━'.repeat(right)}${reset}\n\n`
	);
}

// Display debug info if enabled in config
function debugInfo(object) {
	if (CONFIG.debug_mode === 'true') {
		const len = process.stdout.columns - 7;
		const left = Math.floor(len / 2);
		const right = len - left;

		console.log(`\n${grey}${'─'.repeat(left)} debug ${'─'.repeat(right)}${reset}`);
		console.log(util.inspect(object, false, null, true));
		console.log(`${grey}${'─'.repeat(process.stdout.columns)}${reset}\n`);
	}
}

// Display output of executed command
function commandOutput(text, isError = false) {
	const startingCharacter = isError ? `${red}✘` : `${green}✔`;
	console.log(`\n ${startingCharacter}${reset} ${text}\n`);
}

// Delete last terminal line
function deleteLastLine() {
	process.stdout.clearLine();
	process.stdout.moveCursor(0, -1);
	process.stdout.clearLine();
}

// Returns date for unique file name
function getCurrentDateAsId() {
	const date = new Date();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	const hour = `${date.getHours()}`.padStart(2, '0');
	const minute = `${date.getMinutes()}`.padStart(2, '0');
	const second = `${date.getSeconds()}`.padStart(2, '0');
	const parsedDate = `${date.getFullYear()}${month}${day}_${hour}${minute}${second}`;
	return parsedDate;
}

// Returns short unique and system save file name
function parseFileName(name, extension) {
	return sanitize(`${sanitize(name.trim()).slice(0, 35)} [${getCurrentDateAsId()}].${extension}`);
}

// Save text to markdown file
async function saveToFile(fileName, text) {
	let outputPath = '';
	if (CONFIG.output_path.length > 0) {
		outputPath = path.join(CONFIG.output_path, fileName);
	} else {
		const directory = path.join(__dirname, 'generated_files');
		if (!(await checkExists(directory))) {
			fs.mkdirSync(directory, { recursive: true });
		}
		outputPath = path.join(directory, fileName);
	}
	try {
		await fs.promises.writeFile(outputPath, text);
		commandOutput(`Saved to ${outputPath}`);
	} catch (error) {
		commandOutput(`Error while saving to ${outputPath}: ${error}`, true);
	}
}

// Check if file of folder exists
async function checkExists(filePath) {
	try {
		await fs.promises.access(filePath, fs.constants.F_OK);
		return true;
	} catch (error) {
		return false;
	}
}

// Load config file
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
debugInfo(CONFIG);

// Gemini api
// const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.gemini_api_key}`;
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${CONFIG.gemini_api_key}`;

// Proxy
let proxyAgent;
if (CONFIG.proxy.length > 1) {
	proxyAgent = new HttpsProxyAgent(CONFIG.proxy);
}

const chatHistory = [];
console.log('Welcome to the Google Gemini AI chatbot CLI! Type your prompt below.');
console.log('Commands: /help /exit /new /copy /save /save-all /save-json\n');

while (true) {
	// Get user input
	header('Your prompt:', green);
	const question = await prompt();

	// Commands
	switch (question.trim()) {
		case '': {
			continue;
		}
		case '/q':
		case '/exit': {
			process.exit();
			break;
		}
		case '/h':
		case '/help': {
			const markdown = `
# Available commands:

| command | alias | description |
|---|---|---|
| /help | /h | shows this help |
| /exit | /q | exits the application |
| /new | /n | start the new conversation |
| /copy | /cp | copy last response to clipboard |
| /save | /s | saves last presponse to .md file |
| /save all | /sa | saves entire conversation to .md file |
| /save json | /sj | saves entire conversation to .json file |
`;
			console.log('');
			marked.use(markedTerminal({ reflowText: true, width: process.stdout.columns }));
			console.log(marked.parse(markdown));
			continue;
		}
		case '/n':
		case '/new': {
			chatHistory.length = 0;
			headerCenter('Starting new chat', yellow);
			continue;
		}
		case '/cp':
		case '/copy': {
			if (chatHistory.length > 1) {
				clipboard.writeSync(chatHistory.at(-1).parts[0].text);
				commandOutput('Copied last bot response to clipboard.');
			} else {
				commandOutput('No messages to copy.', true);
			}
			continue;
		}
		case '/s':
		case '/save': {
			if (chatHistory.length > 1) {
				const lastQuestion = chatHistory.at(-2).parts[0].text;
				const fileName = parseFileName(lastQuestion, 'md');

				let fileContent = '# Prompt:\n\n';
				fileContent += `${lastQuestion}\n\n`;
				fileContent += '# Response from Gemini:\n\n';
				fileContent += `${chatHistory.at(-1).parts[0].text}`;

				await saveToFile(fileName, fileContent);
			} else {
				commandOutput('No messages to save.', true);
			}
			continue;
		}
		case '/sa':
		case '/save all': {
			if (chatHistory.length > 1) {
				const firstQuestion = chatHistory[0].parts[0].text;
				const fileName = parseFileName(firstQuestion, 'md');

				let fileContent = '';
				for (const message of chatHistory) {
					if (message.role === 'user') {
						fileContent += '# Prompt:\n\n';
					} else {
						fileContent += '# Response from Gemini:\n\n';
					}
					fileContent += `${message.parts[0].text}\n\n`;
				}

				await saveToFile(fileName, fileContent);
			} else {
				commandOutput('No messages to save.', true);
			}
			continue;
		}
		case '/sj':
		case '/save json': {
			if (chatHistory.length > 1) {
				const firstQuestion = chatHistory[0].parts[0].text;
				const fileName = parseFileName(firstQuestion, 'json');

				const json = [];
				for (const message of chatHistory) {
					json.push({ role: message.role, text: message.parts[0].text });
				}
				const fileContent = JSON.stringify(json);

				await saveToFile(fileName, fileContent);
			} else {
				commandOutput('No messages to save.', true);
			}
			continue;
		}
	}

	// Insert user question to chat history
	chatHistory.push({
		role: 'user',
		parts: [
			{
				text: question,
			},
		],
	});

	// Insert chat history to request body
	const data = {
		contents: [...chatHistory],
		//   "generationConfig": {
		//   }
	};

	// Disable safety settings if specified in config file
	if (CONFIG.safety_settings === 'false') {
		data.safetySettings = [
			{
				category: 'HARM_CATEGORY_HARASSMENT',
				threshold: 'BLOCK_NONE',
			},
			{
				category: 'HARM_CATEGORY_HATE_SPEECH',
				threshold: 'BLOCK_NONE',
			},
			{
				category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
				threshold: 'BLOCK_NONE',
			},
			{
				category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
				threshold: 'BLOCK_NONE',
			},
		];
	}

	// API call
	let answer;
	let isResponseOk = true;

	const requestOptions = {
		method: 'post',
		body: JSON.stringify(data),
	};

	if (CONFIG.proxy.length > 1) {
		requestOptions.agent = proxyAgent;
	}

	try {
		const response = await fetch(API_URL, requestOptions);

		const json = await response.json();
		debugInfo(json);

		// When API returned error code
		if (json.error) {
			throw new Error(json.error.message);
		}

		// When the prompt violates safety settings (if enabled)
		if (
			json?.promptFeedback?.blockReason === 'SAFETY' ||
			json?.candidates?.[0]?.finishReason === 'SAFETY'
		) {
			throw new Error(
				'Response was blocked by Gemini due to safety reasons. This can be disabled in the config file (check readme.md).'
			);
		}

		// When chatbot cenzorship blocked response
		if (
			json?.candidates?.[0]?.finishReason === 'OTHER' ||
			json?.promptFeedback?.blockReason === 'OTHER'
		) {
			throw new Error(
				'Despite disabling safety settings, your prompt still got blocked. Unfortunately, these settings do not fully disable all censorship and your request most likely contained something sensitive or illegal which caused the chatbot to block the response.'
			);
		}

		answer = json.candidates[0].content.parts[0].text;

		header('Gemini:', cyan);
		marked.use(markedTerminal({ reflowText: true, width: process.stdout.columns }));
		console.log(marked.parse(answer));
		deleteLastLine();
	} catch (error) {
		isResponseOk = false;
		header('Gemini:', cyan);
		commandOutput(error, true);
		console.log('');

		// Tip for user about proxy and vpn options
		if (error.message === 'User location is not supported for the API use.') {
			marked.use(markedTerminal({ reflowText: true, width: process.stdout.columns }));
			console.log(
				marked.parse(`
# TIP:

Use **proxy** or **VPN**.

Google Gemini API is not available in Europe yet, but you can bypass
this by using a VPN or proxy from a country outside of Europe
(preferably the USA).

Instructions:

## VPN:

Simply connect to a VPN server through your VPN provider's app. There
are several free VPN providers available, such as **Proton VPN**.

## Proxy:

This client has built-in proxy support so using it is very simple. All
you need to do is find some free proxy (use Google) and then enter its
IP address into the config.json file.

Check \`readme.md\` and \`config.json\` for more info.
`)
			);
		}
	}

	// Add answer to history if everything is ok, else delete last user question if error
	if (isResponseOk) {
		chatHistory.push({
			role: 'model',
			parts: [
				{
					text: answer,
				},
			],
		});
	} else {
		chatHistory.pop();
	}
}
