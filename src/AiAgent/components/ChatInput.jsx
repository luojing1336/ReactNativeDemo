import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import {lightTheme} from '../constants/theme';

const ChatInput = ({onSend, isLoading}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() === '' || isLoading) return;

    onSend(message);
    setMessage('');
    Keyboard.dismiss();
  };

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: lightTheme.colors.background},
      ]}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: lightTheme.colors.background,
            color: lightTheme.colors.onBackground,
            borderColor: lightTheme.colors.border,
          },
        ]}
        placeholder="输入消息..."
        placeholderTextColor={lightTheme.colors.onBackground + '80'}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        editable={!isLoading}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          {backgroundColor: lightTheme.colors.primary},
          (!message.trim() || isLoading) && {opacity: 0.5},
        ]}
        onPress={handleSend}
        disabled={!message.trim() || isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? '等待中...' : '发送'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: lightTheme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ChatInput;
