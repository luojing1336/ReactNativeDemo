import {useState} from 'react';
import {sendChatMessage, setApiKey} from '../apis/openai';
export const useOpenAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 发送消息并获取回复
  const sendMessage = async messages => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage(messages);
      setIsLoading(false);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to get response');
      setIsLoading(false);
      throw err;
    }
  };

  // 初始化API密钥
  const initializeApiKey = () => false;

  // 保存API密钥
  const saveApiKey = apiKey => setApiKey(apiKey);

  return {
    sendMessage,
    isLoading,
    error,
    initializeApiKey,
    saveApiKey,
  };
};
