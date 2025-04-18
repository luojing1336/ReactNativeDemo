import React, {Component} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ToastAndroid,
  ScrollView,
  Button,
} from 'react-native';
import {
  BaiduAsr,
  StatusCode,
  IBaseData,
  RecognizerResultError,
  RecognizerResultData,
  VolumeData,
} from 'react-native-baidu-asr';
import {BAIDU_API_KEY, BAIDU_APP_ID, BAIDU_SECRET_KEY} from '../constants';

export default class BaiduAsrScreen extends Component {
  resultListener: any;
  errorListener: any;
  volumeListener: any;
  constructor(props: {}) {
    super(props);
    this.state = {
      status: '☆语音识别☆',
      speechRecognizerVolume: 0,
      results: [],
      isStart: false,
    };
  }

  componentDidMount() {
    BaiduAsr.init({
      APP_ID: BAIDU_APP_ID,
      APP_KEY: BAIDU_API_KEY,
      SECRET: BAIDU_SECRET_KEY,
    });
    this.resultListener = BaiduAsr.addResultListener(this.onRecognizerResult);
    this.errorListener = BaiduAsr.addErrorListener(this.onRecognizerError);
    this.volumeListener = BaiduAsr.addAsrVolumeListener(this.onAsrVolume);
  }

  componentWillUnmount() {
    this.resultListener?.remove();
    this.errorListener?.remove();
    this.volumeListener?.remove();
    BaiduAsr.release();
  }

  onRecognizerResult = (data: IBaseData<RecognizerResultData | undefined>) => {
    if (
      data.code === StatusCode.STATUS_SPEAKING ||
      data.code === StatusCode.STATUS_FINISHED
    ) {
      if (data.data?.results_recognition?.length) {
        const result = data.data.results_recognition[0];
        this.setState(preState => {
          const newResults = preState.results;
          newResults.push(result);
          return {
            results: newResults,
            status: data.msg,
          };
        });
      }
    } else if (data.code === StatusCode.STATUS_RECOGNITION) {
      console.log('用户说话结束');
    }
  };

  onRecognizerError = (data: IBaseData<RecognizerResultError>) => {
    this.setState({status: data.msg});
    ToastAndroid.show(
      `${data.msg}，错误码: 【${data.data.errorCode}, ${data.data.subErrorCode}】，${data.data.descMessage}`,
      ToastAndroid.LONG,
    );
    console.log('onRecognizerError ', JSON.stringify(data));
  };

  /**
   * 处理音量变化
   * @param volume
   */
  onAsrVolume = (volume: VolumeData) => {
    // 一共7格音量 inputRange: [0, 100] outputRange:[0, 7]
    this.setState({
      speechRecognizerVolume: Math.floor((7 / 100) * volume.volumePercent),
    });
  };

  handleAction = () => {
    if (this.state.isStart) {
      BaiduAsr.cancel();
      this.setState({isStart: false});
    } else {
      BaiduAsr.start({
        // 长语音
        VAD_ENDPOINT_TIMEOUT: 0,
        BDS_ASR_ENABLE_LONG_SPEECH: true,
        // 禁用标点符号
        DISABLE_PUNCTUATION: true,
      });
      this.setState({isStart: true});
    }
  };

  render() {
    const {results, status, isStart, speechRecognizerVolume} = this.state;
    // 0,1,2,3 ...
    const speechRecognizerVolumeList = [
      ...Array(speechRecognizerVolume).keys(),
    ];
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>{status}</Text>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {results.map(result => (
            <Text key={result + Math.random(5)} style={styles.resultText}>
              {result}
            </Text>
          ))}
        </ScrollView>

        <View style={styles.bottomView}>
          {speechRecognizerVolumeList.reverse().map((value, index) => (
            <View
              style={[
                styles.volumeView,
                index === 0 ? undefined : styles.ml3,
                // @ts-ignore
                styles[`volume${value}`],
              ]}
              key={index}
            />
          ))}
          <View style={[styles.ml3, styles.mr3]}>
            <Button
              title={isStart ? '结束' : '开始'}
              onPress={this.handleAction}
            />
          </View>
          {speechRecognizerVolumeList.map((value, index) => (
            <View
              style={[
                styles.volumeView,
                value === 0 ? undefined : styles.mr3,
                // @ts-ignore
                styles[`volume${index}`],
              ]}
              key={index}
            />
          ))}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 16,
    textAlign: 'center',
    margin: 10,
  },
  scrollViewContent: {
    flex: 1,
  },
  bottomView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  volumeView: {
    width: 5,
    height: 18,
    borderRadius: 6,
  },
  volume0: {
    backgroundColor: 'rgba(248, 70, 70, 1)',
  },
  volume1: {
    backgroundColor: 'rgba(248, 70, 70, 0.8)',
  },
  volume2: {
    backgroundColor: 'rgba(248, 70, 70, 0.6)',
  },
  volume3: {
    backgroundColor: 'rgba(248, 70, 70, 0.4)',
  },
  volume4: {
    backgroundColor: 'rgba(248, 143, 143, 0.7)',
  },
  volume5: {
    backgroundColor: 'rgba(238, 238, 238, 0.7)',
  },
  volume6: {
    backgroundColor: 'rgba(255, 212, 17, 1)',
  },
  mr3: {
    marginRight: 3,
  },
  ml3: {
    marginLeft: 3,
  },
  resultText: {
    marginVertical: 3,
    marginLeft: 5,
  },
});
