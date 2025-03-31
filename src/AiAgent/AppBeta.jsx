import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import EventSource from 'react-native-sse';
import {OPENAI_API_KEY, OPENAI_BASE_URL} from './constants/OPENAI_CONFIG';

// 聊天气泡组件，根据 isUser 判断不同样式，并显示加载状态和时间戳
const ChatBubble = ({message, isUser, loading, time}) => {
  // 格式化时间（可根据需求调整格式）
  const formattedTime = time ? new Date(time).toLocaleTimeString() : '';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
      {loading && !message ? (
        <ActivityIndicator size="small" color={isUser ? '#000' : '#555'} />
      ) : (
        <>
          <Text style={styles.bubbleText}>{message}</Text>
          {formattedTime !== '' && (
            <Text style={styles.timeText}>{formattedTime}</Text>
          )}
        </>
      )}
    </View>
  );
};

const useAiChat = () => {
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef(null);

  // 发送用户消息并发起流式请求
  const sendMessage = useCallback(
    userMessage => {
      // 添加用户消息（包含时间戳）
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
          model: 'gpt-3.5-turbo',
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
        if (event.data !== '[DONE]') {
          try {
            const data = JSON.parse(event.data);
            const delta = data.choices?.[0]?.delta?.content;
            if (delta !== undefined) {
              aiMessage += delta;
              // 如果最后一条消息是 AI，则更新其内容；否则添加一条新消息，附带时间戳
              setConversation(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'ai') {
                  // 更新时间戳只在首次添加时设置
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
    // 注意依赖 conversation 会导致 sendMessage 每次对话更新时重新创建，
    // 可根据需要使用函数式更新避免依赖问题
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

const App = () => {
  const {conversation, loading, sendMessage, stopStream} = useAiChat();
  const [input, setInput] = useState('');

  // 处理发送消息
  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  // 合并按钮：当 loading 时触发停止请求，否则发送消息
  const handleButtonPress = () => {
    if (loading) {
      stopStream();
    } else {
      handleSend();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}>
        {conversation.map((msg, index) => {
          // 判断最后一条消息是否为 AI 且正在加载
          const isLastMessage =
            index === conversation.length - 1 && msg.role === 'ai';
          return (
            <ChatBubble
              key={index}
              message={msg.content}
              isUser={msg.role === 'user'}
              loading={isLastMessage && loading}
              time={msg.time}
            />
          );
        })}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="输入消息"
          editable={!loading} // 正在加载时禁用输入框
        />
        <Button
          title={loading ? '停止请求' : '发送'}
          onPress={handleButtonPress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 20,
  },
  chatContent: {
    paddingVertical: 10,
  },
  bubble: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#ECECEC',
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    height: 40,
  },
});

export default App;
