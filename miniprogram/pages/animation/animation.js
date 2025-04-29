Page({
  data: {
    frames: [],
    isLoading: true,
    frameInterval: 200,
    imageTempFiles: [], // 临时文件路径，用于清理
    errorMessage: ''
  },

  onLoad: function(options) {
    // 如果有传入帧数据，进行处理
    if (options.frameData) {
      try {
        // 先确保正确解码URL编码的字符串
        const decodedData = decodeURIComponent(options.frameData);
        const frameData = JSON.parse(decodedData);
        this.processFrames(frameData);
      } catch (error) {
        console.error('解析帧数据失败:', error);
        this.setData({
          isLoading: false,
          errorMessage: '解析帧数据失败: ' + error.message
        });
      }
    } else {
      // 没有帧数据时，可以显示测试数据或引导用户上传
      this.setData({
        isLoading: false
      });
    }
  },

  processFrames: function(frameData) {
    console.log('处理帧数据:', frameData);
    
    if (frameData && frameData.frameUrls && frameData.frameUrls.length > 0) {
      const frames = frameData.frameUrls;
      console.log('有效帧数:', frames.length);
      
      this.setData({
        frames: frames,
        frameInterval: frameData.duration ? Math.floor(frameData.duration / frameData.frameCount) : 200,
        isLoading: false
      });
      
      console.log('帧间隔:', this.data.frameInterval, 'ms');
    } else {
      console.error('无效的帧数据格式:', frameData);
      this.setData({
        isLoading: false,
        errorMessage: '没有有效的帧数据'
      });
    }
  },

  onFrameTap: function(e) {
    const { url } = e.detail;
    // 预览图片
    wx.previewImage({
      current: url,
      urls: this.data.frames
    });
  },

  onAnimationEnd: function() {
    console.log('动画播放结束');
  },

  chooseImages: function() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        const frames = tempFiles.map(file => file.tempFilePath);
        
        this.setData({
          frames: frames,
          imageTempFiles: frames,
          isLoading: false,
          errorMessage: ''
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
      }
    });
  },

  goBack: function() {
    wx.navigateBack();
  },

  onShareAppMessage: function() {
    return {
      title: '我制作的动态图片效果',
      path: '/pages/index/index'
    };
  },

  onUnload: function() {
    // 清理临时文件
    this.data.imageTempFiles.forEach(path => {
      wx.removeSavedFile({
        filePath: path,
        fail: (err) => {
          console.log('删除临时文件失败:', err);
        }
      });
    });
  }
}) 