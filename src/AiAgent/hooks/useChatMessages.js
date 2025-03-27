import {useState, useEffect} from 'react';
import {useOpenAI} from './useOpenAI';

// 在现有的 useChatMessages hook 中添加对流式响应的支持
export const useChatMessages = () => {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const {sendMessage, isLoading, error} = useOpenAI();

  // 初始化会话
  useEffect(() => {
    if (currentConversationId) {
      const conversation = conversations.find(
        c => c.id === currentConversationId,
      );
      if (conversation) {
        setMessages(conversation.messages);
      }
    }
  }, [currentConversationId]);

  // 保存会话
  const saveConversations = newConversations => {
    setConversations(newConversations);
  };

  // 创建新会话
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      title: '新会话',
      messages: [],
      createdAt: new Date().toISOString(),
    };

    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationId(newId);
    setMessages([]);
    return newId;
  };

  // 添加消息
  const addMessage = (content, role = 'user') => {
    const newMessage = {
      id: Date.now().toString(),
      content,
      role,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);

    if (currentConversationId) {
      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === currentConversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, newMessage],
                title:
                  conversation.messages.length === 0
                    ? content.substring(0, 20) + '...'
                    : conversation.title,
              }
            : conversation,
        ),
      );
    } else {
      const newId = createNewConversation();
      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === newId
            ? {
                ...conversation,
                messages: [newMessage],
                title: content.substring(0, 20) + '...',
              }
            : conversation,
        ),
      );
    }

    return newMessage;
  };

  // 发送消息并获取AI回复
  const sendChatMessage = async (content, onStreamUpdate) => {
    try {
      // 添加用户消息
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
      };

      setMessages(prev => [...prev, userMessage]);

      // 如果支持流式响应
      if (onStreamUpdate) {
        // 调用支持流式响应的API
        await fetchStreamingResponse(content, onStreamUpdate);
      } else {
        // 原有的非流式响应处理
        const response = await fetchResponse(content);

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      // setError(error.message);
    }
  };

  // 流式响应的API调用
  const fetchStreamingResponse = async (content, onStreamUpdate) => {
    // 这里需要根据您的后端API实现流式响应
    // 例如使用 fetch 的 ReadableStream 或 EventSource

    // 示例实现（需要根据实际API调整）:
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: content}),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullText += chunk;
      onStreamUpdate(chunk);
    }

    // 流式响应完成后，添加完整消息到状态
    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: fullText,
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  // 删除会话
  const deleteConversation = async conversationId => {
    const updatedConversations = conversations.filter(
      conversation => conversation.id !== conversationId,
    );
    await saveConversations(updatedConversations);

    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }
  };

  return {
    messages,
    conversations,
    isLoading,
    error,
    currentConversationId,
    setCurrentConversationId,
    addMessage,
    sendChatMessage,
    createNewConversation,
    deleteConversation,
  };
};
