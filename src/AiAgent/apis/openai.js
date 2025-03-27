import axios from 'axios';

const OPENAI_API_KEY = 'sk-DTldwHBcIBEIGW1QytwKZTXHrSU6r7sAYRb8FmiQlkAzExmv';
const OPENAI_API_URL = 'https://api.chatanywhere.tech/v1';

// 创建一个axios实例
const openaiClient = axios.create({
  baseURL: OPENAI_API_URL || 'https://api.chatanywhere.tech/v1',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
});

// 发送聊天请求
export const sendChatMessage = async (messages, model = 'gpt-3.5-turbo') => {
  try {
    const response = await openaiClient.post('/chat/completions', {
      model,
      messages,
      temperature: 0.7,
    });

    return response.data.choices[0].message;
  } catch (error) {
    console.error(
      'OpenAI API Error:',
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
};

// 设置API密钥
export const setApiKey = apiKey => {
  openaiClient.defaults.headers.common.Authorization = `Bearer ${apiKey}`;
};
