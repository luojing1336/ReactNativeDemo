import React, {Component} from 'react';
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import {
  BaiduSynthesizer,
  SynthesizerData,
  SynthesizerResultData,
  SynthesizerResultError,
} from 'react-native-baidu-asr';

class BaiduSynthesizerScreen extends Component {
  resultListener: any;
  errorListener: any;
  constructor(props: {}) {
    super(props);
    this.state = {
      text: '百度语音合成适用于泛阅读、订单播报、智能硬件等应用场景，让您的应用、设备开口说话，更具个性。',
      status: '☆语音合成☆',
      currentIndex: 0,
    };
  }

  componentDidMount() {
    BaiduSynthesizer.initialTts();
    this.resultListener = BaiduSynthesizer.addResultListener(
      this.onSynthesizerResult,
    );
    this.errorListener = BaiduSynthesizer.addErrorListener(
      this.onSynthesizerError,
    );
  }

  componentWillUnmount() {
    this.resultListener?.remove();
    this.errorListener?.remove();
    // fixme: 如果你调用了release方法 等下重新reload页面的时候 会报: "MySynthesizer 对象里面 SpeechSynthesizer还未释放，请勿新建一个新对象。" 的错误
    // 但是我确保是已经调用的了 现在我认为是合成器release不是立即的 在毫秒级别内重新new一个会报错 所以在测试的时候可以先不释放 上线后在加上
    if (!__DEV__) {
      BaiduSynthesizer.release();
    }
  }

  onSynthesizerResult = (
    data: SynthesizerData<SynthesizerResultData | string | undefined>,
  ) => {
    console.log(data);
    this.setState({status: data.msg});
  };

  onSynthesizerError = (data: SynthesizerData<SynthesizerResultError>) => {
    this.setState({status: data.msg});
    ToastAndroid.show(
      `${data.msg}，错误码: 【${data.data.code}】，${data.data.description}`,
      ToastAndroid.LONG,
    );
    console.log('onSynthesizerError ', JSON.stringify(data));
  };

  speak = () => {
    BaiduSynthesizer.speak(
      this.state.text,
      {
        PARAM_SPEAKER: '1',
      },
      status => {
        console.log('speak --> ', status);
      },
    );
  };

  batchSpeak = () => {
    BaiduSynthesizer.batchSpeak(
      [
        '开始批量播放',
        '123456',
        '欢迎使用百度语音',
        '重(chong2)量这个是多音字示例',
      ],
      {
        PARAM_SPEAKER: '1',
      },
      status => {
        console.log('batchSpeak --> ', status);
      },
    );
  };

  handleTextChange = (text: string) => {
    this.setState({text});
  };

  pause = () => {
    BaiduSynthesizer.pause(status => {
      console.log('pause --> ', status);
    });
  };

  resume = () => {
    BaiduSynthesizer.resume(status => {
      console.log('resume --> ', status);
    });
  };

  stop = () => {
    BaiduSynthesizer.stop(status => {
      console.log('stop --> ', status);
    });
  };

  changeText = () => {
    const {currentIndex} = this.state;
    const textList = [
      '上海华夏财富投资管理有限公司成立于2016年1月4日，是华夏基金管理有限公司的全资子公司，中国基金业协会联席会员，拥有中国证监会颁发的基金销售牌照，并在2019年10月，首批获得证监会基金投资顾问业务试点资格。目前在北京、广州、深圳、南京、成都、太原、西安、宁波、武汉、郑州、天津、青岛、重庆、大连设有分公司，为客户提供一对一的财富管理服务。华夏财富的理念是以客户为中心，通过对客户家庭金融资产和理财需求的深入了解，提供定制化的投资建议服务，帮助客户实现财富的保值、增值与传承，立足客户财富管理和资产配置需求，通过线上+线下业务融合发展，利用投资顾问与金融科技双轮驱动，实现优势互补和业务协同发展。',
      '方兴未艾的科技革命中，鲜为人知的古籍记载着蒙古草原的校勘秘闻。他屏息凝神地校对着殷红印章下的曲谱，却因强行熬夜导致心广体胖的身材愈发臃肿。',
      '狡黠的饕餮之徒，在福祉庇护下豢养着罹难者的后裔。他们穿过阴霾笼罩的粗犷山谷，用缫丝机盥洗着赧然失笑的僭越者。',
      '武则天自创的"曌"字辉映日月，古玉雕师摩挲着玊的瑕疵，韩式茶寮里巭者正在冲泡"尛"字茶饼。突然，三犬成猋奔过，惊动了妊娠中的莘莘学子。',
      '在参差不齐的碑拓中，他揣度着吐蕃王朝的秘史。那个曾叱咤风云的单于，在龟裂的陶片上用炮制丹药的秘方，给骠骑将军的创伤止血。婢女端着紫檀木盘，颤巍巍地穿过槛窗，瞥见龟兹古谱里记载的腊肉腌制法。',
      '耄耋老者在氍毹上捋须沉吟，脚边蹲踞的猞猁正睥睨着菡萏池中的锦鲤。忽闻门外有趑趄声，原是驿丞捎来讣告：彳亍于阛阓的仳离妇人，因罹患瘰疬而薨逝于彘肩宴上。',
      '刍荛者攀陟嶙峋山崖，瞥见鹁鸪掠过薜荔丛。他掣肘阻止同伴刬伐柽柳，却见瘗玉碑旁有耒耜与耧车，箴言镌刻着“畋不掩群，不涸泽而渔”。远处鞑靼人的鞲鹰正睃巡着羱羊。',
    ];
    this.handleTextChange(textList[currentIndex]);
    this.setState(prevState => ({
      currentIndex: (prevState.currentIndex + 1) % textList.length,
    }));
  };

  render() {
    const {text, status} = this.state;
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>{status}</Text>

        <View style={styles.actionView}>
          <View style={styles.itemView}>
            <Button title={'合成并播放'} onPress={this.speak} />
          </View>
          <View style={styles.itemView}>
            <Button title={'批量合成并播放'} onPress={this.batchSpeak} />
          </View>
          <View style={styles.itemView}>
            <Button title={'播放暂停'} onPress={this.pause} />
          </View>
          <View style={styles.itemView}>
            <Button title={'播放恢复'} onPress={this.resume} />
          </View>
          <View style={styles.itemView}>
            <Button title={'停止合成引擎'} onPress={this.stop} />
          </View>
        </View>

        <TextInput
          style={styles.textInput}
          value={text}
          multiline
          onChangeText={this.handleTextChange}
        />
        <View>
          <Button title={'切换预设文字'} onPress={this.changeText} />
        </View>
      </View>
    );
  }
}

export default BaiduSynthesizerScreen;

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
  actionView: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  itemView: {
    marginHorizontal: 5,
    marginBottom: 5,
  },
  textInput: {
    fontSize: 16,
    marginHorizontal: 5,
    marginTop: 10,
    borderBottomWidth: 1,
    borderColor: '#afafaf',
  },
});
