import React, {useState, useRef, useEffect} from 'react';
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
import {
  HIAGENT_API_BASE_URL,
  HIAGENT_API_KEY,
  HIAGENT_APP_KEY,
  HIAGENT_DEFAULT_USER_ID,
} from './apis/HIAGENT_CONFIG';

// 打字机效果组件
const TypewriterText = ({text, speed = 50, loading}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const lastTimeRef = useRef(0);
  const animationRef = useRef(null);
  const currentIndexRef = useRef(0);

  // 使用requestAnimationFrame来处理文字动画，提高性能
  useEffect(() => {
    if (!text) {
      return;
    }

    currentIndexRef.current = 0;
    setDisplayedText('');

    const animate = timestamp => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed > speed) {
        lastTimeRef.current = timestamp;
        if (currentIndexRef.current < text.length) {
          const nextIndex = currentIndexRef.current + 1;
          currentIndexRef.current = nextIndex;
          setDisplayedText(text.slice(0, nextIndex));
        }
      }

      if (currentIndexRef.current < text.length) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [text, speed]);

  // 光标闪烁效果
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <Text style={styles.bubbleText}>
      {displayedText}
      {loading && showCursor && <Text style={styles.cursor}>|</Text>}
    </Text>
  );
};

// 聊天气泡组件
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

const App = () => {
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);

  const eventSourceRef = useRef(null);
  const flatListRef = useRef(null);

  // 创建一个新的会话
  const createConversation = async (
    inputs = {},
    userId = HIAGENT_DEFAULT_USER_ID,
  ) => {
    try {
      const response = await fetch(
        `${HIAGENT_API_BASE_URL}/create_conversation`,
        {
          method: 'POST',
          headers: {
            Apikey: HIAGENT_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            AppKey: HIAGENT_APP_KEY,
            Inputs: inputs,
            UserID: userId,
          }),
        },
      );

      const conversationData = await response.json();
      console.log('会话创建响应原始数据:', conversationData);

      // 检查响应格式
      if (conversationData?.Conversation?.AppConversationID) {
        // 从 data 字段中获取 AppConversationID
        const appConversationId =
          conversationData.Conversation.AppConversationID;
        setConversationId(appConversationId);
        return appConversationId;
      }

      // 如果没有找到有效的会话ID，记录详细信息并抛出错误
      console.error('响应数据结构:', conversationData);
      throw new Error('无法获取有效的会话ID');
    } catch (error) {
      console.error('创建会话错误:', error);
      throw error;
    }
  };

  // 发送消息并处理流响应
  const sendMessage = async (
    userMessage,
    userId = HIAGENT_DEFAULT_USER_ID,
    queryExtends = {},
  ) => {
    // 首先确保我们有一个会话ID
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      try {
        currentConversationId = await createConversation(
          {
            DEVICE_OS: 'Android',
            CURRENT_PAGE: '首页',
            var: 'variables',
            PAGE_DATA: '',
          },
          userId,
        );
      } catch (error) {
        console.error('创建会话失败:', error);
        return;
      }
    }

    // 将用户消息添加到会话中
    const userMsg = {role: 'user', content: userMessage, time: new Date()};
    setConversation(prev => [...prev, userMsg]);

    // 创建一个AI消息占位符
    const placeholderMsg = {role: 'ai', content: '', time: new Date()};
    setConversation(prev => [...prev, placeholderMsg]);
    setLoading(true);

    let aiMessage = '';

    // 设置SSE连接
    const es = new EventSource(`${HIAGENT_API_BASE_URL}/chat_query_v2`, {
      headers: {
        'Content-Type': 'application/json',
        Apikey: HIAGENT_API_KEY,
      },
      method: 'POST',
      body: JSON.stringify({
        Query: userMessage,
        AppConversationID: currentConversationId,
        ResponseMode: 'streaming',
        UserID: userId,
        QueryExtends: queryExtends,
      }),
      pollingInterval: 0, // 不使用轮询
    });

    eventSourceRef.current = es;

    // 通用的资源清理函数
    const cleanupEventSource = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.removeAllEventListeners();
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setLoading(false);
    };

    // 更新AI消息
    const updateAIMessage = content => {
      if (!content || !content.trim()) return;
      setConversation(prev => {
        const newConversation = [...prev];
        // 查找最后一条AI消息的索引
        const lastAiIndex = newConversation
          .map((msg, idx) => ({...msg, idx}))
          .reverse()
          .find(item => item.role === 'ai')?.idx;
        if (lastAiIndex !== undefined) {
          newConversation[lastAiIndex] = {
            ...newConversation[lastAiIndex],
            content,
          };
        }
        return newConversation;
      });
    };

    // 处理不同事件类型
    const handleAgentThought = data => {
      if (data.thought) {
        aiMessage = data.thought;
        updateAIMessage(aiMessage);
      }
    };

    const handleAgentThoughtEnd = data => {
      if (data.observation) {
        try {
          // 第一次解析 observation 字段
          const observation = JSON.parse(data.observation);
          if (observation.data) {
            // 直接对 observation.data 使用 JSON.parse 去除最外层的转义和引号
            const parsedData = JSON.parse(observation.data);
            if (Array.isArray(parsedData) && parsedData[0]?.answer) {
              // answer 本身也是一个 JSON 字符串
              const marketDataStr = parsedData[0].answer;
              const marketData = JSON.parse(marketDataStr);
              if (Array.isArray(marketData)) {
                // 格式化行情数据
                const formattedMessage = marketData.reduce(
                  (acc, item, index) => {
                    if (index % 2 === 0) {
                      const nextItem = marketData[index + 1];
                      const currentFormat = `${
                        item.symbolName
                      } ${item.price.toFixed(2)}（${(
                        item.dailyChangePercent * 100
                      ).toFixed(2)}%）`;
                      const nextFormat = nextItem
                        ? ` ${nextItem.symbolName} ${nextItem.price.toFixed(
                            2,
                          )}（${(nextItem.dailyChangePercent * 100).toFixed(
                            2,
                          )}%）`
                        : '';
                      return acc + currentFormat + nextFormat + '\n';
                    }
                    return acc;
                  },
                  '\n',
                );

                const timestamp = marketData[0].marketTime;
                const date = new Date(timestamp);
                const timeStr = `\n(数据截止至：${
                  date.getMonth() + 1
                }月${date.getDate()}日 ${date.getHours()}:${String(
                  date.getMinutes(),
                ).padStart(2, '0')})`;
                aiMessage = formattedMessage + timeStr;
                updateAIMessage(aiMessage);
              }
            }
          }
        } catch (error) {
          console.error(
            '解析observation或行情数据失败:',
            error,
            data.observation,
          );
        }
      }
    };

    const handleMessageOutputStart = data => {
      console.log('开始接收消息输出，会话ID:', data.conversation_id);
    };
    const handleMessageStart = data => {
      console.log('开始接收消息，会话ID:', data.conversation_id);
    };

    const handleMessage = data => {
      if (data.answer) {
        aiMessage += data.answer;
        updateAIMessage(aiMessage);
      }
    };

    const handleMessageEnd = data => {
      console.log('消息接收完成');
      cleanupEventSource();
    };

    const handleMessageOutputEnd = data => {
      console.log('消息输出完成');
      cleanupEventSource();
    };

    const handleDefault = data => {
      const delta = data.Content || data.content;
      if (delta) {
        aiMessage += delta;
        updateAIMessage(aiMessage);
      }
    };

    // SSE 事件监听
    es.addEventListener('open', () => {
      console.log('SSE连接已打开');
    });

    es.addEventListener('text', event => {
      if (!event.data) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        const {event: eventType} = data;

        // 根据事件类型处理数据
        switch (eventType) {
          case 'agent_thought':
            handleAgentThought(data);
            break;
          case 'agent_thought_end':
            handleAgentThoughtEnd(data);
            break;
          case 'message_output_start':
            break;
          case 'message_start':
            handleMessageStart(data);
            break;
          case 'message':
            handleMessage(data);
            break;
          case 'message_end':
            handleMessageEnd(data);
            break;
          case 'massage_output_end':
            handleMessageOutputEnd(data);
            break;
          default:
            handleDefault(data);
            break;
        }
      } catch (error) {
        console.error('解析SSE数据失败:', error, '原始数据:', event.data);
      }
    });

    es.addEventListener('error', event => {
      console.error('SSE请求错误:', event);
      cleanupEventSource();
      updateAIMessage(aiMessage || '抱歉，连接出现问题，请稍后再试。');
    });

    es.addEventListener('close', () => {
      console.log('SSE连接已关闭');
      cleanupEventSource();
    });
  };

  // 停止正在进行的流响应
  const stopStream = () => {
    if (eventSourceRef.current) {
      console.log('手动停止SSE请求');
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setLoading(false);
    }
  };

  // 处理发送按钮点击
  const handleSend = async () => {
    if (input.trim()) {
      const message = input.trim();
      setInput('');
      await sendMessage(message);
    }
  };

  // 处理按钮按下（发送或停止）
  const handleButtonPress = () => {
    if (loading) {
      stopStream();
    } else {
      handleSend();
    }
  };

  // 新消息加入时自动滚动到底部
  useEffect(() => {
    if (flatListRef.current && conversation.length > 0) {
      // 使用setTimeout确保渲染完成后滚动
      setTimeout(() => {
        flatListRef.current.scrollToEnd({animated: true});
      }, 100);
    }
  }, [conversation]);

  // 渲染聊天气泡
  const renderItem = ({item, index}) => {
    const isLastMessage =
      index === conversation.length - 1 && item.role === 'ai';
    return (
      <ChatBubble
        message={item.content}
        isUser={item.role === 'user'}
        loading={isLastMessage && loading}
        time={item.time}
      />
    );
  };

  // 键盘感知滚动调整
  const keyExtractor = (_, index) => index.toString();

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={conversation}
        keyExtractor={keyExtractor}
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
          multiline
        />
        <TouchableOpacity
          style={[
            styles.button,
            loading
              ? styles.buttonStop
              : input.trim()
              ? styles.buttonActive
              : styles.buttonInactive,
          ]}
          onPress={handleButtonPress}
          disabled={!input.trim() && !loading}>
          <Text style={styles.buttonText}>{loading ? '停止' : '发送'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
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
    shadowOpacity: 0.2,
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
    paddingHorizontal: 10,
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
    maxHeight: 100,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  buttonActive: {
    backgroundColor: '#007aff',
    opacity: 1,
  },
  buttonInactive: {
    backgroundColor: '#007aff',
    opacity: 0.5,
  },
  buttonStop: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default App;
