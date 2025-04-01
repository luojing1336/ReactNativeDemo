import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import EventSource from 'react-native-sse';
import {OPENAI_API_KEY, OPENAI_BASE_URL} from './apis/OPENAI_CONFIG';

// 打字机文本组件：逐字显示新加入的字符，并显示闪烁光标
const TypewriterText = ({text, speed = 50, loading}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (text.length > displayedText.length) {
      const interval = setInterval(() => {
        setDisplayedText(prev => {
          const next = text.slice(0, prev.length + 1);
          if (next.length === text.length) {
            clearInterval(interval);
          }
          return next;
        });
      }, speed);
      return () => clearInterval(interval);
    } else {
      setDisplayedText(text);
    }
  }, [displayedText.length, speed, text]);

  useEffect(() => {
    if (loading) {
      const cursorInterval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      return () => clearInterval(cursorInterval);
    } else {
      setShowCursor(false);
    }
  }, [loading]);

  return (
    <Text style={styles.bubbleText}>
      {displayedText}
      {loading && showCursor && <Text style={styles.cursor}>|</Text>}
    </Text>
  );
};

const ChatBubble = ({message, isUser, loading, time}) => {
  const formattedTime = time ? new Date(time).toLocaleTimeString() : '';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
      {loading && !message ? (
        <ActivityIndicator
          size="small"
          color={isUser ? '#FFFFFF' : '#D5F9C1'}
        />
      ) : (
        <>
          {!isUser && loading ? (
            <TypewriterText text={message} loading={loading} />
          ) : (
            <Text style={styles.bubbleText}>{message}</Text>
          )}
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

const App = () => {
  const {conversation, loading, sendMessage, stopStream} = useAiChat();
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleButtonPress = () => {
    if (loading) {
      stopStream();
    } else {
      handleSend();
    }
  };

  // 新消息加入时自动滚动到底部
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({animated: true});
    }
  }, [conversation]);

  const renderItem = ({item, index}) => {
    const isLastMessage =
      index === conversation.length - 1 && item.role === 'ai';
    return (
      <ChatBubble
        key={index.toString()}
        message={item.content}
        isUser={item.role === 'user'}
        loading={isLastMessage && loading}
        time={item.time}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={conversation}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContent}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="输入消息"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonStop]}
          onPress={handleButtonPress}>
          <Text style={styles.buttonText}>{loading ? '停止请求' : '发送'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 10,
  },
  chatContent: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 16,
    color: '#333',
  },
  cursor: {
    fontSize: 16,
    color: '#000000',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginRight: 10,
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  buttonStop: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default App;
