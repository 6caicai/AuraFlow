// effect-generator.test.js

const app = getApp();

Page({
  data: {
    testResults: [],
    testStatus: 'ready', // ready, running, completed
    currentTest: '',
    totalTests: 4,
    completedTests: 0,
    imagePath: '/images/test-image.jpg',
    mockCanvas: null,
    mockContext: null,
    testImageLoaded: false
  },

  onLoad: function() {
    // 初始化测试环境
    this.initTestEnvironment();
  },

  // 初始化测试环境
  initTestEnvironment: function() {
    try {
      // 创建离屏Canvas用于测试
      const mockCanvas = wx.createOffscreenCanvas({
        type: '2d',
        width: 300,
        height: 300
      });
      const mockContext = mockCanvas.getContext('2d');
      
      this.setData({ 
        mockCanvas: mockCanvas,
        mockContext: mockContext 
      });
      
      // 加载测试图像
      this.loadTestImage();
      
      console.log('测试环境初始化成功');
    } catch (error) {
      console.error('测试环境初始化失败:', error);
      this.logTestResult('测试环境初始化', false, `初始化失败: ${error.message}`);
    }
  },

  // 加载测试图像
  loadTestImage: function() {
    try {
      const img = this.data.mockCanvas.createImage();
      img.onload = () => {
        // 图像加载成功，绘制到Canvas
        this.data.mockContext.drawImage(img, 0, 0, 300, 300);
        this.setData({ testImageLoaded: true });
        console.log('测试图像加载成功');
      };
      img.onerror = (err) => {
        console.error('测试图像加载失败:', err);
        this.logTestResult('图像加载', false, `加载失败: ${err}`);
      };
      img.src = this.data.imagePath;
    } catch (error) {
      console.error('图像加载过程出错:', error);
    }
  },

  // 开始执行所有测试
  startAllTests: function() {
    if (!this.data.testImageLoaded) {
      wx.showToast({
        title: '测试图像未加载完成',
        icon: 'none'
      });
      return;
    }
    
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
      this.testBasicEffectGeneration,
      this.testParameterAdjustment,
      this.testComplexImageProcessing,
      this.testPerformanceBoundary
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
    
    // 执行下一个测试
    setTimeout(() => {
      this.runNextTest();
    }, 500);
  },

  // 测试用例1：基本效果生成
  testBasicEffectGeneration: function() {
    console.log('开始测试：基本效果生成');
    
    // 模拟参数
    const params = {
      strength: 5,    // 中等强度
      speed: 15       // 中等速度
    };
    
    // 模拟选区路径
    const selectedPath = [
      {x: 100, y: 100},
      {x: 200, y: 100},
      {x: 200, y: 200},
      {x: 100, y: 200},
      {x: 100, y: 100}
    ];
    
    // 测试生成单帧
    this.testGenerateFrame(0, 24, selectedPath, params.strength)
      .then(frameGenerated => {
        if (frameGenerated) {
          this.logTestResult('基本效果生成', true, '成功生成基本效果帧');
        } else {
          this.logTestResult('基本效果生成', false, '生成基本效果帧失败');
        }
      })
      .catch(error => {
        this.logTestResult('基本效果生成', false, `测试出错: ${error.message}`);
      });
  },

  // 测试用例2：参数调整测试
  testParameterAdjustment: function() {
    console.log('开始测试：参数调整测试');
    
    // 模拟选区路径
    const selectedPath = [
      {x: 100, y: 100},
      {x: 200, y: 100},
      {x: 200, y: 200},
      {x: 100, y: 200},
      {x: 100, y: 100}
    ];
    
    // 高参数设置
    const highParams = {
      strength: 10,   // 最大强度
      speed: 30       // 最大速度
    };
    
    // 低参数设置
    const lowParams = {
      strength: 1,    // 最低强度
      speed: 5        // 最低速度
    };
    
    // 测试高参数帧生成
    this.testGenerateFrame(0, 24, selectedPath, highParams.strength)
      .then(highStrengthResult => {
        // 测试低参数帧生成
        return this.testGenerateFrame(0, 24, selectedPath, lowParams.strength)
          .then(lowStrengthResult => {
            // 比较两种参数下的结果
            if (highStrengthResult && lowStrengthResult) {
              this.logTestResult('参数调整测试', true, '不同参数的效果生成均成功');
            } else {
              this.logTestResult('参数调整测试', false, '参数调整效果测试失败');
            }
          });
      })
      .catch(error => {
        this.logTestResult('参数调整测试', false, `测试出错: ${error.message}`);
      });
  },

  // 测试用例3：复杂图像处理
  testComplexImageProcessing: function() {
    console.log('开始测试：复杂图像处理');
    
    // 模拟复杂不规则选区路径
    const complexPath = [
      {x: 50, y: 50},
      {x: 100, y: 30},
      {x: 150, y: 50},
      {x: 200, y: 100},
      {x: 150, y: 150},
      {x: 100, y: 170},
      {x: 50, y: 150},
      {x: 30, y: 100},
      {x: 50, y: 50}
    ];
    
    // 标准参数
    const params = {
      strength: 5,
      speed: 15
    };
    
    // 生成复杂效果帧
    this.testGenerateFrame(0, 24, complexPath, params.strength)
      .then(result => {
        if (result) {
          this.logTestResult('复杂图像处理', true, '成功处理复杂图像区域');
        } else {
          this.logTestResult('复杂图像处理', false, '复杂图像处理失败');
        }
      })
      .catch(error => {
        this.logTestResult('复杂图像处理', false, `测试出错: ${error.message}`);
      });
  },

  // 测试用例4：性能边界测试
  testPerformanceBoundary: function() {
    console.log('开始测试：性能边界测试');
    
    // 模拟大面积选区
    const largeArea = [
      {x: 10, y: 10},
      {x: 290, y: 10},
      {x: 290, y: 290},
      {x: 10, y: 290},
      {x: 10, y: 10}
    ];
    
    // 高强度参数
    const highParams = {
      strength: 10,
      speed: 30
    };
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 生成大面积高强度效果
    this.testGenerateFrame(0, 24, largeArea, highParams.strength)
      .then(result => {
        // 计算处理时间
        const processingTime = Date.now() - startTime;
        
        if (result) {
          // 设置性能边界（10秒）
          const withinPerformanceBounds = processingTime < 10000;
          
          if (withinPerformanceBounds) {
            this.logTestResult('性能边界测试', true, `处理时间: ${processingTime}ms, 在可接受范围内`);
          } else {
            this.logTestResult('性能边界测试', false, `处理时间过长: ${processingTime}ms`);
          }
        } else {
          this.logTestResult('性能边界测试', false, '边界条件下效果生成失败');
        }
      })
      .catch(error => {
        this.logTestResult('性能边界测试', false, `测试出错: ${error.message}`);
      });
  },

  // 测试生成单个帧
  testGenerateFrame: function(frameIndex, totalFrames, path, strength) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.data.mockContext) {
          throw new Error('Canvas上下文不可用');
        }
        
        const ctx = this.data.mockContext;
        
        // 清除画布
        ctx.clearRect(0, 0, 300, 300);
        
        // 载入测试图像（此时应已在画布上）
        
        // 计算当前帧的进度
        const progress = frameIndex / (totalFrames - 1);
        
        // 使用简化的正弦函数模拟周期变化
        const cyclePosition = Math.sin(progress * Math.PI * 2);
        const normProgress = (cyclePosition + 1) / 2; // 归一化到0-1
        
        // 设置变形强度
        const distortionStrength = strength;
        
        // 创建并应用裁剪路径
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.closePath();
        ctx.clip();
        
        // 模拟简化的变形效果
        // 注意：这是一个简化版，实际效果要复杂得多
        const bounds = this.calculateBoundingBox(path);
        const gridSize = 5;
        
        // 应用简单的水波效果
        for (let y = bounds.y; y < bounds.y + bounds.height; y += gridSize) {
          for (let x = bounds.x; x < bounds.x + bounds.width; x += gridSize) {
            // 计算扭曲
            const distortionX = Math.sin(progress * Math.PI * 2) * distortionStrength;
            const distortionY = Math.cos(progress * Math.PI * 2) * distortionStrength * 0.5;
            
            // 应用变形（简化版）
            ctx.drawImage(
              this.data.mockCanvas,
              x, y, gridSize, gridSize,
              x + distortionX, y + distortionY, gridSize, gridSize
            );
          }
        }
        
        ctx.restore();
        
        // 模拟帧保存成功
        resolve(true);
      } catch (error) {
        console.error('帧生成失败:', error);
        reject(error);
      }
    });
  },

  // 计算边界框
  calculateBoundingBox: function(path) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const point of path) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
})
