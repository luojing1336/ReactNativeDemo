import {useState, useRef, useCallback} from 'react';
import EventSource from 'react-native-sse';
import {OPENAI_API_KEY, OPENAI_BASE_URL} from '../apis/OPENAI_CONFIG';

const useAiChat = () => {
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef(null);

  // 发送用户消息并发起流式请求
  const sendMessage = useCallback(
    userMessage => {
      const userMsg = {role: 'user', content: userMessage, time: new Date()};
      setConversation(prev => [...prev, userMsg]);
      setLoading(true);
      let aiMessage = '';

      // 构造上下文消息：系统提示 + 历史对话 + 当前用户消息
      const messages = [
        {role: 'system', content: '你是一个中文的回答问题助手'},
        ...conversation,
        {role: 'user', content: userMessage},
      ];

      const es = new EventSource(`${OPENAI_BASE_URL}/chat/completions`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 600,
          n: 1,
          temperature: 0.7,
          stream: true,
        }),
        pollingInterval: 0,
      });

      eventSourceRef.current = es;

      es.addEventListener('open', () => {
        // 可选：初始化或清空临时状态
      });

      es.addEventListener('message', event => {
        if (event.data === '[DONE]') {
          // SSE 数据传输完毕，关闭连接
          es.removeAllEventListeners();
          es.close();
          setLoading(false);
          return;
        }
        if (event.data !== '[DONE]') {
          try {
            const data = JSON.parse(event.data);
            const delta = data.choices?.[0]?.delta?.content;
            if (delta !== undefined) {
              aiMessage += delta;
              // 若最后一条消息为 AI，则更新内容；否则添加新消息
              setConversation(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'ai') {
                  return [
                    ...prev.slice(0, prev.length - 1),
                    {...last, content: aiMessage},
                  ];
                } else {
                  return [
                    ...prev,
                    {role: 'ai', content: aiMessage, time: new Date()},
                  ];
                }
              });
            }
          } catch (error) {
            console.error('解析 SSE 数据失败:', error);
          }
        }
      });

      es.addEventListener('error', event => {
        if (event.type === 'error') {
          console.error('SSE 请求错误:', event);
          setLoading(false);
          es.removeAllEventListeners();
          es.close();
        }
      });

      es.addEventListener('close', () => {
        setLoading(false);
        es.removeAllEventListeners();
      });
    },
    [conversation],
  );

  // 手动停止流式请求
  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      setLoading(false);
    }
  }, []);

  return {conversation, loading, sendMessage, stopStream};
};

export default useAiChat;
