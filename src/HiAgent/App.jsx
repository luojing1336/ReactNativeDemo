import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import EventSource from 'react-native-sse';
import {
  HIAGENT_API_BASE_URL,
  HIAGENT_API_KEY,
  HIAGENT_APP_KEY,
  HIAGENT_DEFAULT_USER_ID,
} from './apis/HIAGENT_CONFIG';

// 打字机效果组件 - 优化性能
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

// 聊天气泡组件 - 增强视觉效果
const ChatBubble = ({message, isUser, loading, time}) => {
  const formattedTime = time ? new Date(time).toLocaleTimeString() : '';
  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.aiBubble,
        message && message.length > 100 && styles.longMessageBubble,
      ]}>
      <View style={styles.bubbleContent}>
        {loading && !message ? (
          <ActivityIndicator
            size="small"
            color={isUser ? '#FFFFFF' : '#007AFF'}
          />
        ) : (
          <>
            {!isUser ? (
              <TypewriterText text={message} loading={loading} />
            ) : (
              <Text
                style={[styles.bubbleText, isUser && styles.userBubbleText]}>
                {message}
              </Text>
            )}
          </>
        )}
      </View>
      {formattedTime !== '' && (
        <Text style={styles.timeText}>{formattedTime}</Text>
      )}
    </View>
  );
};

// 头部导航组件
const Header = () => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>华小夏-智能投顾助手</Text>
  </View>
);

// 自定义Hook - 管理SSE连接和消息处理
const useHiAgentHandler = () => {
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);

  const eventSourceRef = useRef(null);

  // 创建一个新的会话
  const createConversation = useCallback(
    async (inputs = {}, userId = HIAGENT_DEFAULT_USER_ID) => {
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
        setError('创建会话失败，请稍后重试');
        throw error;
      }
    },
    [],
  );

  // 更新AI消息
  const updateAIMessage = useCallback(content => {
    if (!content || !content.trim()) {
      return;
    }
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
          time: new Date(), // 更新时间戳为当前时间
        };
      }
      return newConversation;
    });
  }, []);

  // 清理SSE连接资源
  const cleanupEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setLoading(false);
  }, []);

  // 停止正在进行的流响应
  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('手动停止SSE请求');
      cleanupEventSource();
    }
  }, [cleanupEventSource]);

  // 获取设备系统标识
  const getDeviceOS = useCallback(() => {
    switch (Platform.OS) {
      case 'ios':
        return 'iPhone';
      case 'android':
        return 'Android';
      case 'web':
        return 'Web';
      default:
        return 'Unknown';
    }
  }, []);

  // 发送消息并处理流响应
  const sendMessage = useCallback(
    async (
      userMessage,
      userId = HIAGENT_DEFAULT_USER_ID,
      queryExtends = {},
    ) => {
      setError(null);

      // 首先确保我们有一个会话ID
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        try {
          currentConversationId = await createConversation(
            {
              DEVICE_OS: getDeviceOS(),
              CURRENT_PAGE: '首页',
              var: 'variables',
              PAGE_DATA: '',
            },
            userId,
          );
        } catch (error) {
          console.error('创建会话失败:', error);
          setError('无法创建会话，请检查网络连接');
          return;
        }
      }

      // 将用户消息添加到会话中
      const userMsg = {role: 'user', content: userMessage, time: new Date()};
      setConversation(prev => [...prev, userMsg]);

      // 创建一个AI消息占位符
      // 在 sendMessage 函数中创建占位消息时不设置时间
      const placeholderMsg = {role: 'ai', content: ''};
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

      // 处理不同事件类型
      const eventHandlers = {
        agent_thought: data => {
          if (data.thought) {
            aiMessage = data.thought;
            updateAIMessage(aiMessage);
          }
        },

        agent_thought_end: data => {
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
        },

        message_output_start: data => {
          console.log('开始接收消息输出，会话ID:', data.conversation_id);
        },

        message_start: data => {
          console.log('开始接收消息，会话ID:', data.conversation_id);
        },

        message: data => {
          if (data.answer) {
            aiMessage += data.answer;
            updateAIMessage(aiMessage);
          }
        },

        message_end: data => {
          console.log('消息接收完成');
          cleanupEventSource();
        },

        massage_output_end: data => {
          console.log('消息输出完成');
          cleanupEventSource();
        },
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
          if (eventHandlers[eventType]) {
            eventHandlers[eventType](data);
          } else {
            // 默认处理
            const delta = data.Content || data.content;
            if (delta) {
              aiMessage += delta;
              updateAIMessage(aiMessage);
            }
          }
        } catch (error) {
          console.error('解析SSE数据失败:', error, '原始数据:', event.data);
        }
      });

      es.addEventListener('error', event => {
        console.error('SSE请求错误:', event);
        cleanupEventSource();
        setError('连接出现问题，请稍后再试');
        updateAIMessage(aiMessage || '抱歉，连接出现问题，请稍后再试。');
      });

      es.addEventListener('close', () => {
        console.log('SSE连接已关闭');
        cleanupEventSource();
      });
    },
    [
      conversationId,
      createConversation,
      getDeviceOS,
      updateAIMessage,
      cleanupEventSource,
    ],
  );

  return {
    conversation,
    loading,
    error,
    sendMessage,
    stopStream,
  };
};

const App = () => {
  const {conversation, loading, error, sendMessage, stopStream} =
    useHiAgentHandler();

  const [input, setInput] = useState('');
  const flatListRef = useRef(null);

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

  // 渲染错误提示
  const renderError = () => {
    if (!error) {
      return null;
    }
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f2f2" />
      <Header />
      {renderError()}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={conversation}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="输入消息..."
            placeholderTextColor="#999"
            editable={!loading}
            multiline
            maxLength={1000}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  header: {
    height: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    margin: 10,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  chatContent: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    marginVertical: 6,
    maxWidth: '80%',
  },
  bubbleContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  longMessageBubble: {
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
    marginLeft: '20%',
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
    marginRight: '20%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  userBubbleText: {
    color: '#fff',
  },
  cursor: {
    fontSize: 16,
    color: '#000000',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    textAlign: 'right',
    opacity: 1,
    fontWeight: '500',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginRight: 10,
    maxHeight: 120,
    minHeight: 40,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
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
