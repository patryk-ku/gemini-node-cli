# gemini-node-cli

Simple cross platform chatbot CLI for the Gemini API written in Node.js with **markdown** support and built-in **proxy** for European users where the API is not yet available.

![chat](/assets/chat.gif)

> [!TIP]
> Friendly reminder that Gemini API access is currently free of charge (with rate limits). The only problem is that it's not yet available in Europe, but this can be bypassed using a proxy or VPN.

It is possible to save the last message, the whole chat or export data to a JSON file:

![demo](/assets/demo.gif)

Markdown support:

![markdown](/assets/markdown.png)

And code syntax highlighting:

![code](/assets/code.png)

Every gif and screenshot in this repo was made using [VHS](https://github.com/charmbracelet/vhs).

## Requirements

- Node.js and NPM installed and available in PATH.
- Any modern terminal emulator.

## Installation

Clone the repo and install the required packages. Then rename the `config.json.example` to `config.json`.

For Unix-like system:

```sh
git clone 'https://github.com/patryk-ku/gemini-node-cli'
cd gemini-node-cli
npm install --omit=dev
mv config.json.example config.json
```

Now insert your Gemini API key and proxy ip into config.json.

## Configuration

Configuration file includes several options:

```json
{
	"gemini_api_key": "your-api-key-here",
	"proxy": "",
	"output_path": "",
	"safety_settings": "false",
	"debug_mode": "false",
	"default_model": "1.5-flash"
}
```

| option | description |
| --- | --- |
| gemini_api_key | Your Gemini API key.  |
| proxy | Proxy IP address and port in ip:port format e.g. `http://xxx.xxx.xxx.xxx:xxxx`. Leave empty if you don't want to use any proxy. |
| output_path | Path to the folder where the conversations will be saved. |
| safety_settings | Gemini safety settings. Set to `false` to disable all safety restrictions, or `true` to enable the default safety restrictions. |
| debug_mode | For development purposes. Prints raw responses from the API and other informations. |
| default_model | Select the default model. Available options: `1.0-pro`, `1.5-pro`, `1.5-flash` |

## Usage

Simply open your terminal, navigate to the directory where you have cloned the files, and run either `npm run start` or `node index.js`.

I recommend creating an alias for this so that you can access the chatbot from anywhere.

## Available commands

| command | alias | description |
|---|---|---|
| /help | /h | shows this help |
| /exit | /q | exits the application |
| /new | /n | start the new conversation |
| /copy | /cp | copy last response to clipboard |
| /save | /s | saves last presponse to .md file |
| /save all | /sa | saves entire conversation to .md file |
| /save json | /sj | saves entire conversation to .json file |
| /model | /m | Gemini model selection |
