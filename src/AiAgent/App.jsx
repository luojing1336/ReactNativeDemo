import {useEffect, useRef, useState} from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  SafeAreaView,
  StatusBar,
} from 'react-native';

import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import ChatInput from './components/ChatInput';
import LoadingIndicator from './components/LoadingIndicator';
import {lightTheme} from './constants/theme';
import {useChatMessages} from './hooks/useChatMessages';

const App = () => {
  const {messages, isLoading, error, sendChatMessage, createNewConversation} =
    useChatMessages();
  const scrollViewRef = useRef(null);
  const [streamingMessage, setStreamingMessage] = useState(null);

  // 当有新消息时，滚动到最底部
  useEffect(() => {
    if ((messages.length > 0 || streamingMessage) && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages, streamingMessage]);

  const handleSend = async content => {
    try {
      // 创建一个临时的流式消息对象
      setStreamingMessage({
        id: 'streaming-' + Date.now(),
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      // 发送消息并获取流式响应
      await sendChatMessage(content, partialResponse => {
        // 更新流式消息内容
        setStreamingMessage(prev => ({
          ...prev,
          content: prev.content + partialResponse,
        }));
      });

      // 消息完成后清除流式状态
      setStreamingMessage(null);
    } catch (error) {
      console.error(error);
      setStreamingMessage(null);
    }
  };

  const handleNewChat = () => {
    // TODO:新对话功能实现
    createNewConversation();
    setStreamingMessage(null);
  };

  const handleMenu = () => {
    // TODO:菜单功能实现
  };

  // 合并正常消息和流式消息
  const displayMessages = [...messages];
  if (streamingMessage) {
    displayMessages.push(streamingMessage);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={lightTheme.colors.background}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.mainContainer}>
          <View style={styles.headerContainer}>
            <Header
              title="AI助手"
              onMenuPress={handleMenu}
              onNewChat={handleNewChat}
            />
          </View>

          {displayMessages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>开始新的对话吧</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.chatContainer}
              showsVerticalScrollIndicator={true}
              onContentSizeChange={() => {
                scrollViewRef.current?.scrollToEnd({animated: true});
              }}>
              {displayMessages.map(item => (
                <ChatBubble
                  key={item.id}
                  message={item}
                  isStreaming={item.isStreaming}
                />
              ))}
            </ScrollView>
          )}

          {isLoading && !streamingMessage && <LoadingIndicator />}

          <View style={styles.inputContainer}>
            <ChatInput
              onSend={handleSend}
              isLoading={isLoading || !!streamingMessage}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  headerContainer: {
    width: '100%',
    paddingVertical: 36,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border || '#E5E5E5',
  },
  scrollView: {
    flex: 1,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: lightTheme.colors.background,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border || '#E5E5E5',
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: lightTheme.colors.text || '#666',
    opacity: 0.6,
  },
});

export default App;
