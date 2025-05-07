const app = getApp();

Page({
  data: {
    testResults: [],
    testStatus: 'ready', // ready, running, completed
    currentTest: '',
    totalTests: 4,
    completedTests: 0,
    imagePath: '/images/test-image.jpg',
    brushPoints: [],
    mockCanvas: null,
    mockContext: null
  },

  onLoad: function() {
    // 初始化模拟画布和上下文
    this.initMockCanvas();
    this.setData({ testStatus: 'ready' });
  },

  // 初始化模拟画布以进行测试
  initMockCanvas: function() {
    try {
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
      
      console.log('模拟画布初始化成功');
    } catch (error) {
      console.error('模拟画布初始化失败:', error);
      this.logTestResult('画布初始化', false, `初始化失败: ${error.message}`);
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
      this.testBasicDrawing,
      this.testComplexShape,
      this.testClearAndRedraw,
      this.testEdgeHandling
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

  // 测试用例1：基本绘制功能
  testBasicDrawing: function() {
    try {
      console.log('开始测试：基本绘制功能');
      
      // 模拟用户绘制的点
      const points = [
        {x: 50, y: 50},
        {x: 150, y: 50},
        {x: 150, y: 150},
        {x: 50, y: 150},
        {x: 50, y: 50} // 闭合路径
      ];
      
      // 模拟绘制轨迹
      const ctx = this.data.mockContext;
      if (!ctx) {
        throw new Error('画布上下文不可用');
      }
      
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      ctx.closePath();
      ctx.stroke();
      
      // 模拟填充选区
      ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
      ctx.fill();
      
      // 验证绘制是否成功
      const imageData = ctx.getImageData(100, 100, 1, 1);
      const hasColor = imageData.data[3] > 0; // 检查alpha通道是否有值
      
      // 检查选区是否被正确填充
      if (hasColor) {
        this.logTestResult('基本绘制功能', true, '绘制正常，选区正确填充');
      } else {
        this.logTestResult('基本绘制功能', false, '选区未正确填充');
      }
    } catch (error) {
      this.logTestResult('基本绘制功能', false, `测试出错: ${error.message}`);
    }
  },

  // 测试用例2：复杂形状绘制
  testComplexShape: function() {
    try {
      console.log('开始测试：复杂形状绘制');
      
      // 清除画布
      const ctx = this.data.mockContext;
      ctx.clearRect(0, 0, 300, 300);
      
      // 模拟复杂S形绘制路径
      const sShape = [
        {x: 50, y: 50},
        {x: 100, y: 30},
        {x: 150, y: 50},
        {x: 200, y: 100},
        {x: 150, y: 150},
        {x: 100, y: 170},
        {x: 50, y: 150},
        {x: 30, y: 100},
        {x: 50, y: 50} // 闭合路径
      ];
      
      // 绘制复杂形状
      ctx.beginPath();
      ctx.moveTo(sShape[0].x, sShape[0].y);
      
      for (let i = 1; i < sShape.length; i++) {
        ctx.lineTo(sShape[i].x, sShape[i].y);
      }
      
      ctx.closePath();
      ctx.stroke();
      
      // 填充选区
      ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
      ctx.fill();
      
      // 验证中心点是否被填充
      const centerImageData = ctx.getImageData(100, 100, 1, 1);
      const centerHasColor = centerImageData.data[3] > 0;
      
      // 验证边缘点是否按预期绘制
      const edgeImageData1 = ctx.getImageData(sShape[3].x, sShape[3].y, 1, 1);
      const edgeImageData2 = ctx.getImageData(sShape[5].x, sShape[5].y, 1, 1);
      
      const edgesCorrect = edgeImageData1.data[3] > 0 && edgeImageData2.data[3] > 0;
      
      if (centerHasColor && edgesCorrect) {
        this.logTestResult('复杂形状绘制', true, '复杂形状正确绘制和填充');
      } else {
        this.logTestResult('复杂形状绘制', false, '复杂形状未正确处理');
      }
    } catch (error) {
      this.logTestResult('复杂形状绘制', false, `测试出错: ${error.message}`);
    }
  },

  // 测试用例3：清除和重新选择
  testClearAndRedraw: function() {
    try {
      console.log('开始测试：清除和重新选择');
      
      const ctx = this.data.mockContext;
      
      // 先绘制一个选区
      ctx.beginPath();
      ctx.rect(50, 50, 100, 100);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fill();
      
      // 检查是否成功绘制
      let imageData1 = ctx.getImageData(75, 75, 1, 1);
      const initiallyFilled = imageData1.data[3] > 0;
      
      // 模拟清除功能
      ctx.clearRect(0, 0, 300, 300);
      
      // 检查是否成功清除
      let imageData2 = ctx.getImageData(75, 75, 1, 1);
      const successfullyCleared = imageData2.data[3] === 0;
      
      // 模拟重新绘制
      ctx.beginPath();
      ctx.rect(100, 100, 100, 100);
      ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
      ctx.fill();
      
      // 检查新区域是否成功绘制
      let imageData3 = ctx.getImageData(150, 150, 1, 1);
      const successfullyRedrawn = imageData3.data[3] > 0;
      
      if (initiallyFilled && successfullyCleared && successfullyRedrawn) {
        this.logTestResult('清除和重新选择', true, '成功清除并重新绘制选区');
      } else {
        this.logTestResult('清除和重新选择', false, '清除或重新绘制功能失败');
      }
    } catch (error) {
      this.logTestResult('清除和重新选择', false, `测试出错: ${error.message}`);
    }
  },

  // 测试用例4：边缘像素处理
  testEdgeHandling: function() {
    try {
      console.log('开始测试：边缘像素处理');
      
      const ctx = this.data.mockContext;
      ctx.clearRect(0, 0, 300, 300);
      
      // 模拟边缘选择
      const edgePoints = [
        {x: 0, y: 50},     // 左边缘
        {x: 50, y: 0},     // 上边缘
        {x: 100, y: 50},
        {x: 50, y: 100},
        {x: 0, y: 50}      // 闭合路径
      ];
      
      // 绘制边缘选区
      ctx.beginPath();
      ctx.moveTo(edgePoints[0].x, edgePoints[0].y);
      
      for (let i = 1; i < edgePoints.length; i++) {
        ctx.lineTo(edgePoints[i].x, edgePoints[i].y);
      }
      
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
      ctx.fill();
      
      // 检查边缘内的点是否被填充
      const innerImageData = ctx.getImageData(50, 50, 1, 1);
      const innerFilled = innerImageData.data[3] > 0;
      
      // 尝试获取超出画布的点（应该不会出错）
      let outOfBoundsHandled = true;
      try {
        ctx.getImageData(-10, 50, 1, 1);
      } catch (e) {
        outOfBoundsHandled = false;
      }
      
      if (innerFilled && outOfBoundsHandled) {
        this.logTestResult('边缘像素处理', true, '边缘区域正确处理');
      } else {
        this.logTestResult('边缘像素处理', false, '边缘处理不正确');
      }
    } catch (error) {
      this.logTestResult('边缘像素处理', false, `测试出错: ${error.message}`);
    }
  }
})
