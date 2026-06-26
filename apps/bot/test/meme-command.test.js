const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { fetchRandomMeme } = require('../src/commands/Fun/meme');

test('meme command uses Meme API when its response is valid', async () => {
	const request = {
		get: async (url) => {
			assert.match(url, /meme-api/);
			return { data: { postLink: 'https://example.com/post', title: 'Meme', url: 'https://example.com/meme.png', ups: 42 } };
		}
	};

	const meme = await fetchRandomMeme(request);
	assert.equal(meme.provider, 'Meme API');
	assert.equal(meme.ups, 42);
});

test('meme command falls back to Imgflip when Meme API returns 530', async () => {
	const calls = [];
	const request = {
		get: async (url) => {
			calls.push(url);
			if (url.includes('meme-api')) throw Object.assign(new Error('530'), { response: { status: 530 } });
			return {
				data: {
					success: true,
					data: { memes: [{ id: '61579', name: 'One Does Not Simply', url: 'https://i.imgflip.com/1bij.jpg' }] }
				}
			};
		}
	};

	const meme = await fetchRandomMeme(request);
	assert.equal(meme.provider, 'Imgflip');
	assert.equal(meme.title, 'One Does Not Simply');
	assert.equal(meme.postLink, 'https://imgflip.com/memetemplate/61579');
	assert.equal(calls.length, 2);
});

test('meme command reports both providers when every provider fails', async () => {
	const request = {
		get: async (url) => {
			throw Object.assign(new Error('unavailable'), { response: { status: url.includes('meme-api') ? 530 : 503 } });
		}
	};

	await assert.rejects(() => fetchRandomMeme(request), /Meme API 530; Imgflip 503/);
});
