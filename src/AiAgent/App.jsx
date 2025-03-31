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
import {sendMessageToOpenAI} from './constants/OPENAI_CONFIG';

const App = () => {
  const {messages, isLoading, sendChatMessage, createNewConversation} =
    useChatMessages();
  const scrollViewRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({animated: true});
  }, [messages]);

  const handleSend = async content => {
    setIsStreaming(true);
    sendMessageToOpenAI(
      content,
      chunk => {
        console.log(chunk);
        sendChatMessage(chunk); //逐步更新消息
      },
      error => {
        console.error(error);
      },
      () => {
        setIsStreaming(false);
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={lightTheme.colors.background}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.mainContainer}>
          <Header
            title="AI助手"
            onMenuPress={() => {}}
            onNewChat={createNewConversation}
          />

          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>开始新的对话吧</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.chatContainer}>
              {messages.map(item => (
                <ChatBubble key={item.id} message={item} />
              ))}
            </ScrollView>
          )}

          {isLoading && <LoadingIndicator />}

          <View style={styles.inputContainer}>
            <ChatInput
              onSend={handleSend}
              isLoading={isLoading || isStreaming}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: lightTheme.colors.background},
  mainContainer: {flex: 1},
  scrollView: {flex: 1},
  chatContainer: {padding: 16, paddingBottom: 80},
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
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: {
    fontSize: 16,
    color: lightTheme.colors.text || '#666',
    opacity: 0.6,
  },
});

export default App;
