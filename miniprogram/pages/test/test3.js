const app = getApp();

Page({
  data: {
    testResults: [],
    testStatus: 'ready', // ready, running, completed
    currentTest: '',
    totalTests: 4,
    completedTests: 0,
    testFrames: [],
    frameInterval: 80, // 默认帧间隔 (毫秒)
    isPlaying: false,
    playbackTimerId: null,
    currentFrameIndex: 0,
    playStartTime: 0,
    frameCount: 0,
    deviceInfo: null
  },

  onLoad: function() {
    // 初始化测试环境
    this.initTestEnvironment();
  },

  // 初始化测试环境
  initTestEnvironment: function() {
    try {
      // 生成测试帧
      this.generateTestFrames(24);
      
      // 获取设备信息
      const deviceInfo = wx.getSystemInfoSync();
      
      this.setData({ 
        deviceInfo: deviceInfo,
        frameCount: 24
      });
      
      console.log('测试环境初始化成功, 设备信息:', deviceInfo);
    } catch (error) {
      console.error('测试环境初始化失败:', error);
      this.logTestResult('测试环境初始化', false, `初始化失败: ${error.message}`);
    }
  },

  // 开始执行所有测试
  startAllTests: function() {
    this.setData({ 
      testStatus: 'running',
      testResults: [],
      completedTests: 0 
    });
    
    this.runNextTest();
  },

  // 运行下一个测试
  runNextTest: function() {
    const testFunctions = [
      this.testBasicPlayback,
      this.testLongPlayback,
      this.testParameterAdjustment,
      this.testDeviceCompatibility
    ];
    
    if (this.data.completedTests < testFunctions.length) {
      const currentTest = testFunctions[this.data.completedTests];
      currentTest.call(this);
    } else {
      this.setData({ testStatus: 'completed' });
      console.log('所有测试完成');
    }
  },

  // 记录测试结果
  logTestResult: function(testName, passed, message) {
    const result = {
      name: testName,
      passed: passed,
      message: message || (passed ? '测试通过' : '测试失败')
    };
    
    const results = this.data.testResults;
    results.push(result);
    
    this.setData({
      testResults: results,
      completedTests: this.data.completedTests + 1,
      currentTest: testName
    });
    
    console.log(`测试 ${testName}: ${passed ? '通过' : '失败'} - ${message}`);
    
    // 停止所有播放
    this.stopPlayback();
    
    // 执行下一个测试
    setTimeout(() => {
      this.runNextTest();
    }, 500);
  },

  // 生成测试帧
  generateTestFrames: function(count) {
    const frames = [];
    
    // 生成模拟帧URL
    for (let i = 0; i < count; i++) {
      frames.push(`https://example.com/testframe_${i}.png`);
    }
    
    this.setData({ testFrames: frames });
    console.log(`生成了${count}个测试帧`);
  },

  // 开始播放动画
  startPlayback: function(frameInterval) {
    // 停止任何现有播放
    this.stopPlayback();
    
    const interval = frameInterval || this.data.frameInterval;
    const startTime = Date.now();
    
    this.setData({
      isPlaying: true,
      playStartTime: startTime,
      currentFrameIndex: 0
    });
    
    // 创建帧循环定时器
    const playbackLoop = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const frameIndex = Math.floor(elapsed / interval) % this.data.testFrames.length;
      
      this.setData({ currentFrameIndex: frameIndex });
      
      // 保存定时器ID，以便后续可以停止
      this.data.playbackTimerId = setTimeout(playbackLoop, interval);
    };
    
    // 开始循环
    this.data.playbackTimerId = setTimeout(playbackLoop, 0);
    
    return true;
  },

  // 停止播放动画
  stopPlayback: function() {
    if (this.data.playbackTimerId) {
      clearTimeout(this.data.playbackTimerId);
      this.setData({
        playbackTimerId: null,
        isPlaying: false
      });
      return true;
    }
    return false;
  },

  // 测试用例1：基本播放功能
  testBasicPlayback: function() {
    console.log('开始测试：基本播放功能');
    
    try {
      // 开始播放
      const playbackStarted = this.startPlayback();
      
      // 100ms后检查播放状态
      setTimeout(() => {
        const isPlaying = this.data.isPlaying;
        const currentIndex = this.data.currentFrameIndex;
        
        // 暂停播放
        const pauseSuccessful = this.stopPlayback();
        
        // 检查是否可以恢复播放
        const resumeSuccessful = this.startPlayback();
        
        // 再次暂停以结束测试
        this.stopPlayback();
        
        // 验证测试结果
        if (playbackStarted && isPlaying && currentIndex >= 0 && 
            pauseSuccessful && resumeSuccessful) {
          this.logTestResult('基本播放功能', true, '播放、暂停和恢复功能正常');
        } else {
          this.logTestResult('基本播放功能', false, '基本播放功能测试失败');
        }
      }, 100);
    } catch (error) {
      this.logTestResult('基本播放功能', false, `测试出错: ${error.message}`);
    }
  },

  // 测试用例2：长时间播放稳定性
  testLongPlayback: function() {
    console.log('开始测试：长时间播放稳定性');
    
    try {
      // 记录开始时间
      const startTime = Date.now();
      
      // 开始播放
      this.startPlayback();
      
      // 设置内存使用检查
      let initialMemory = null;
      if (this.data.deviceInfo && this.data.deviceInfo.platform === 'devtools') {
        // 仅在开发工具中可用
        initialMemory = wx.getPerformance ? wx.getPerformance().memory : null;
      }
      
      // 创建检查函数
      const checkPlaybackStatus = () => {
        const currentTime = Date.now();
        const playbackDuration = currentTime - startTime;
        
        // 检查是否已经播放了至少5秒钟
        if (playbackDuration < 5000) {
          // 还未达到测试时间，继续等待
          setTimeout(checkPlaybackStatus, 1000);
          return;
        }
        
        // 检查播放状态
        const isPlaying = this.data.isPlaying;
        const frameIndex = this.data.currentFrameIndex;
        
        // 检查内存使用情况
        let memoryStable = true;
        if (initialMemory && wx.getPerformance) {
          const currentMemory = wx.getPerformance().memory;
          const memoryIncrease = currentMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
          // 如果内存增长超过5MB，认为可能有内存泄漏
          memoryStable = memoryIncrease < 5 * 1024 * 1024;
        }
        
        // 尝试切换到后台再返回
        const backgroundTest = () => {
          // 模拟切换到后台
          wx.onAppHide(() => {
            // 模拟切换回前台
            wx.onAppShow(() => {
              // 检查返回后是否仍在播放
              const resumedPlaying = this.data.isPlaying;
              
              // 停止播放
              this.stopPlayback();
              
              // 汇总测试结果
              if (isPlaying && frameIndex >= 0 && memoryStable && resumedPlaying) {
                this.logTestResult('长时间播放稳定性', true, '长时间播放保持稳定');
              } else {
                this.logTestResult('长时间播放稳定性', false, '长时间播放测试不稳定');
              }
            });
            
            // 模拟200ms后返回
            setTimeout(() => {
              wx.onAppShow();
            }, 200);
          });
          
          // 触发模拟切换到后台
          wx.onAppHide();
        };
        
        // 实际环境中无法自动触发切换，仅测试基本稳定性
        this.stopPlayback();
        if (isPlaying && frameIndex >= 0 && memoryStable) {
          this.logTestResult('长时间播放稳定性', true, '长时间播放保持稳定');
        } else {
          this.logTestResult('长时间播放稳定性', false, '长时间播放测试不稳定');
        }
      };
      
      // 开始检查
      setTimeout(checkPlaybackStatus, 1000);
    } catch (error) {
      this.stopPlayback();
      this.logTestResult('长时间播放稳定性', false, `测试出错: ${error.message}`);
    }
  },

  // 测试用例3：参数调整测试
  testParameterAdjustment: function() {
    console.log('开始测试：参数调整测试');
    
    try {
      // 基准帧间隔
      const defaultInterval = this.data.frameInterval;
      
      // 先用默认参数进行播放
      this.startPlayback();
      
      // 记录默认播放帧率
      const defaultFrameIndex = this.data.currentFrameIndex;
      setTimeout(() => {
        // 停止默认参数播放
        this.stopPlayback();
        
        // 使用快速参数
        const fastInterval = Math.max(20, defaultInterval / 2);
        this.startPlayback(fastInterval);
        
        // 等待200ms后检查
        setTimeout(() => {
          // 记录快速参数下的帧索引
          const fastFrameIndex = this.data.currentFrameIndex;
          this.stopPlayback();
          
          // 使用慢速参数
          const slowInterval = defaultInterval * 2;
          this.startPlayback(slowInterval);
          
          // 等待200ms后检查
          setTimeout(() => {
            // 记录慢速参数下的帧索引
            const slowFrameIndex = this.data.currentFrameIndex;
            this.stopPlayback();
            
            // 分析参数调整的效果
            // 预期快速播放应该比默认播放产生更高的帧索引
            // 预期慢速播放应该比默认播放产生更低的帧索引
            const parameterEffective = (fastFrameIndex > defaultFrameIndex) && 
                                      (slowFrameIndex < fastFrameIndex);
            
            if (parameterEffective) {
              this.logTestResult('参数调整测试', true, '参数调整能有效改变播放效果');
            } else {
              this.logTestResult('参数调整测试', false, '参数调整未能有效改变播放效果');
            }
          }, 200);
        }, 200);
      }, 200);
    } catch (error) {
      this.stopPlayback();
      this.logTestResult('参数调整测试', false, `测试出错: ${error.message}`);
    }
  },

  // 测试用例4：设备兼容性测试
  testDeviceCompatibility: function() {
    console.log('开始测试：设备兼容性测试');
    
    try {
      // 获取设备信息
      const deviceInfo = this.data.deviceInfo;
      if (!deviceInfo) {
        throw new Error('无法获取设备信息');
      }
      
      // 记录设备特性
      const platform = deviceInfo.platform; // 操作系统
      const brand = deviceInfo.brand;       // 设备品牌
      const model = deviceInfo.model;       // 设备型号
      const screenWidth = deviceInfo.screenWidth;
      const screenHeight = deviceInfo.screenHeight;
      const pixelRatio = deviceInfo.pixelRatio;
      
      // 低性能设备判断标准
      // 这些只是示例标准，实际项目中需要根据目标设备调整
      const isLowEndDevice = (
        (platform === 'android' && pixelRatio < 2) ||
        (screenWidth * screenHeight < 320 * 480) ||
        (/iPhone\s(5|6|7|8)/i.test(model))  // 旧款iPhone
      );
      
      // 调整帧间隔以适应设备性能
      let adaptiveInterval = this.data.frameInterval;
      if (isLowEndDevice) {
        // 低性能设备降低刷新率
        adaptiveInterval = Math.max(120, adaptiveInterval * 1.5);
      }
      
      // 开始播放测试
      this.startPlayback(adaptiveInterval);
      
      // 记录测试开始时间
      const startTime = Date.now();
      
      // 执行15帧切换的测试
      setTimeout(() => {
        // 停止播放
        this.stopPlayback();
        
        // 计算实际播放时间
        const elapsedTime = Date.now() - startTime;
        
        // 计算实际帧率
        const frameIndex = this.data.currentFrameIndex;
        const actualFPS = frameIndex > 0 ? (frameIndex * 1000 / elapsedTime) : 0;
        
        // 判断播放质量
        // 如果实际帧率低于理论帧率的70%，认为性能不佳
        const theoreticalFPS = 1000 / adaptiveInterval;
        const performanceRatio = actualFPS / theoreticalFPS;
        
        console.log(`设备兼容性测试 - 设备: ${brand} ${model}, 理论帧率: ${theoreticalFPS.toFixed(2)}fps, 实际帧率: ${actualFPS.toFixed(2)}fps, 性能比: ${(performanceRatio * 100).toFixed(1)}%`);
        
        if (performanceRatio >= 0.7) {
          this.logTestResult('设备兼容性测试', true, `设备${brand} ${model}兼容性良好，性能达到预期的${(performanceRatio * 100).toFixed(1)}%`);
        } else if (performanceRatio >= 0.4) {
          // 性能不佳但仍可接受
          this.logTestResult('设备兼容性测试', true, `设备${brand} ${model}兼容性一般，性能为预期的${(performanceRatio * 100).toFixed(1)}%，但在可接受范围内`);
        } else {
          this.logTestResult('设备兼容性测试', false, `设备${brand} ${model}兼容性差，性能仅为预期的${(performanceRatio * 100).toFixed(1)}%`);
        }
      }, 1000); // 测试1秒
    } catch (error) {
      this.stopPlayback();
      this.logTestResult('设备兼容性测试', false, `测试出错: ${error.message}`);
    }
  }
})
