Page({
  data: {
    frames: [],
    isLoading: true,
    frameInterval: 200,
    imageTempFiles: [], // 临时文件路径，用于清理
    errorMessage: '',
    isLoggedIn: false,   // 用户登录状态
    userInfo: null,      // 用户信息
    isSaved: false       // 是否已保存到云端
  },

  onLoad: function(options) {
    // 检查用户登录状态
    this.checkLoginStatus();
    
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
  
  // 检查用户登录状态
  checkLoginStatus: function() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token) {
      // 验证token有效性
      this.validateToken(token, userInfo);
    }
  },
  
  // 验证token有效性
  validateToken: function(token, userInfo) {
    wx.cloud.callFunction({
      name: 'verifyToken',
      data: { token },
      success: res => {
        if (res.result && res.result.success) {
          this.setData({
            isLoggedIn: true,
            userInfo: userInfo || res.result.userInfo
          });
        } else {
          this.setData({ isLoggedIn: false, userInfo: null });
        }
      },
      fail: err => {
        console.error('验证token失败:', err);
        this.setData({ isLoggedIn: false, userInfo: null });
      }
    });
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
  
  // 保存动画到云端
  saveToCloud: function() {
    // 检查用户是否登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '保存作品需要登录，是否现在登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: res => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    // 检查是否已经保存过
    if (this.data.isSaved) {
      wx.showToast({
        title: '已保存到云端',
        icon: 'success'
      });
      return;
    }
    
    // 检查是否有帧数据
    if (!this.data.frames || this.data.frames.length === 0) {
      wx.showToast({
        title: '没有可保存的动画',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '正在保存...',
      mask: true
    });
    
    // 将帧数据信息保存到云端
    const animationData = {
      frames: this.data.frames,
      frameCount: this.data.frames.length,
      frameInterval: this.data.frameInterval,
      createTime: new Date()
    };
    
    wx.cloud.callFunction({
      name: 'saveAnimation',
      data: animationData,
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          this.setData({
            isSaved: true
          });
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result?.message || '保存失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('保存动画失败:', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
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