import React, {useState} from 'react';
import {
  Image,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
} from 'react-native';
import BaiduWakeUpScreen from './screens/BaiduWakeUpScreen';
import BaiduAsrScreen from './screens/BaiduAsrScreen';
import BaiduSynthesizerScreen from './screens/BaiduSynthesizerScreen';

const App = () => {
  const [activeTab, setActiveTab] = useState('WakeUp');
  const [isInitialized, setIsInitialized] = useState(false);
  const tabs = [
    {id: 'WakeUp', title: '语音唤醒'},
    {id: 'ASR', title: '实时语音识别'},
    {id: 'Synthesis', title: '语音合成'},
  ];

  // 进入页面就获取Audio权限
  React.useEffect(() => {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
      .then(result => {
        console.log('获取权限成功：', result);
      })
      .catch(error => {
        console.log('获取权限失败：', error);
      });
  }, []);

  return (
    <View style={styles.container}>
      {!isInitialized ? (
        <View style={styles.initContainer}>
          <Image
            source={{
              uri: 'https://p8.itc.cn/images01/20220719/758eb26b8bdc4ffd82497ae37d7c711f.jpeg',
            }}
            style={styles.initLogo}
          />
          <Text style={styles.initTitle}>语音技术DEMO</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setIsInitialized(true)}>
            <Text style={styles.buttonText}>开始体验</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Tab 标签栏 */}
          <View style={styles.tabBar}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabItem,
                  activeTab === tab.id && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab.id)}>
                <Text
                  style={
                    activeTab === tab.id ? styles.activeText : styles.text
                  }>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab 动态内容区域 */}
          <View style={styles.content}>
            {activeTab === 'WakeUp' && <BaiduWakeUpScreen />}
            {activeTab === 'ASR' && <BaiduAsrScreen />}
            {activeTab === 'Synthesis' && <BaiduSynthesizerScreen />}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  initContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  initTitle: {
    fontSize: 24,
    marginBottom: 30,
    color: '#333',
  },
  initLogo: {
    width: 200,
    height: 200,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  container: {flex: 1},
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  text: {color: '#666'},
  activeText: {color: '#007AFF', fontWeight: 'bold'},
  content: {flex: 1, padding: 20},
});

export default App;
