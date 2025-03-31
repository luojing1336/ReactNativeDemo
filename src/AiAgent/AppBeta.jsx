import React, {useState} from 'react';
import {View, Text, Button, ScrollView} from 'react-native';
import EventSource from 'react-native-sse';
import {OPENAI_API_KEY, OPENAI_BASE_URL} from './constants/OPENAI_CONFIG';

const App = () => {
  const [messages, setMessages] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchOpenAIStream = async () => {
    setMessages('');
    setLoading(true);

    const es = new EventSource(`${OPENAI_BASE_URL}/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: '你是用来做什么的？',
          },
        ],
        max_tokens: 600,
        n: 1,
        temperature: 0.7,
        stream: true,
      }),
      pollingInterval: 0,
    });

    es.addEventListener('open', () => {
      setMessages('');
    });

    es.addEventListener('message', event => {
      if (event.data !== '[DONE]') {
        try {
          const data = JSON.parse(event.data);
          if (data.choices?.[0]?.delta?.content !== undefined) {
            setMessages(
              prevMessages => prevMessages + data.choices[0].delta.content,
            );
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      }
    });

    es.addEventListener('error', event => {
      if (event.type === 'error') {
        console.error('SSE Error:', event);
        setLoading(false);
        es.removeAllEventListeners();
        es.close();
      }
    });

    es.addEventListener('close', () => {
      setLoading(false);
      es.removeAllEventListeners();
    });

    return () => {
      es.removeAllEventListeners();
      es.close();
      setLoading(false);
    };
  };

  return (
    <View style={{padding: 20}}>
      <Button
        title={loading ? 'Streaming...' : 'Start Streaming'}
        onPress={fetchOpenAIStream}
        disabled={loading}
      />
      <ScrollView style={{marginTop: 20, height: 200}}>
        <Text>{messages}</Text>
      </ScrollView>
    </View>
  );
};

export default App;
