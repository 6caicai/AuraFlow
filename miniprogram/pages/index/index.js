const { envList } = require("../../envList");
const { QuickStartPoints, QuickStartSteps } = require("./constants");

Page({
  data: {
    knowledgePoints: QuickStartPoints,
    steps: QuickStartSteps,
    tempImagePath: '',
    distortionStrength: 5,
    animationSpeed: 15,
    canvasContext: null,
    selectedArea: null,
    canvasWidth: 300,
    canvasHeight: 300,
    isSelecting: false,
    selectionStart: null,
    isAnimating: false,
    animationFrame: null
  },

  onLoad: function() {
    // 获取系统信息以设置canvas大小
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      canvasWidth: systemInfo.windowWidth * 0.9,
      canvasHeight: systemInfo.windowHeight * 0.4
    });
  },

  onUnload: function() {
    // 页面卸载时停止动画
    this.stopAnimation();
  },

  onReady: function() {
    // 不再在onReady中初始化Canvas，因为此时Canvas可能不在DOM中
  },

  initCanvas: function() {
    return new Promise((resolve, reject) => {
      try {
        // 延迟一点执行，确保Canvas元素已经渲染
        setTimeout(() => {
          const query = wx.createSelectorQuery();
          query.select('#myCanvas')
            .fields({ node: true, size: true })
            .exec((res) => {
              if (!res || !res[0] || !res[0].node) {
                console.error('Canvas initialization failed: Canvas node not found');
                reject(new Error('Canvas node not found'));
                return;
              }
              
              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                console.error('Canvas initialization failed: Could not get 2D context');
                reject(new Error('Could not get 2D context'));
                return;
              }
              
              // 保存canvas引用
              this.canvas = canvas;
              
              // 设置canvas大小
              const dpr = wx.getSystemInfoSync().pixelRatio;
              canvas.width = this.data.canvasWidth * dpr;
              canvas.height = this.data.canvasHeight * dpr;
              ctx.scale(dpr, dpr);
              
              this.setData({
                canvasContext: ctx
              }, () => {
                console.log('Canvas initialized successfully');
                resolve(ctx);
              });
            });
        }, 100); // 延迟100ms，确保DOM已更新
      } catch (error) {
        console.error('Canvas initialization failed with error:', error);
        reject(error);
      }
    });
  },

  chooseImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 先设置图片路径，这会触发Canvas元素在DOM中的创建
        this.setData({
          tempImagePath: res.tempFilePaths[0],
          selectedArea: null,
          isSelecting: false,
          isAnimating: false
        }, async () => {
          // 在回调中初始化Canvas，确保Canvas元素已经在DOM中
          try {
            // 初始化Canvas
            await this.initCanvas();
            // 绘制图片
            await this.drawImageToCanvas(res.tempFilePaths[0]);
          } catch (error) {
            console.error('Failed to initialize canvas:', error);
            wx.showToast({
              title: '初始化画布失败',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  drawImageToCanvas: function(imagePath) {
    return new Promise((resolve, reject) => {
      if (!this.data.canvasContext) {
        console.error('Canvas context not available');
        reject(new Error('Canvas context not available'));
        return;
      }

      const ctx = this.data.canvasContext;
      
      // 使用wx.getImageInfo获取图片信息
      wx.getImageInfo({
        src: imagePath,
        success: (res) => {
          try {
            // 创建图片对象
            const img = this.canvas.createImage();
            img.onload = () => {
              // 清除canvas
              ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
              
              // 计算图片绘制尺寸，保持宽高比
              const scale = Math.min(
                this.data.canvasWidth / res.width,
                this.data.canvasHeight / res.height
              );
              const width = res.width * scale;
              const height = res.height * scale;
              const x = (this.data.canvasWidth - width) / 2;
              const y = (this.data.canvasHeight - height) / 2;
              
              // 保存图片信息
              this.imageInfo = {
                x, y, width, height,
                originalWidth: res.width,
                originalHeight: res.height,
                scale: scale
              };
              
              // 绘制图片
              ctx.drawImage(img, x, y, width, height);
              resolve();
            };
            img.onerror = (err) => {
              console.error('Image loading failed:', err);
              wx.showToast({
                title: '图片加载失败',
                icon: 'none'
              });
              reject(err);
            };
            img.src = imagePath;
          } catch (error) {
            console.error('Error drawing image:', error);
            wx.showToast({
              title: '绘制图片失败',
              icon: 'none'
            });
            reject(error);
          }
        },
        fail: (err) => {
          console.error('Failed to get image info:', err);
          wx.showToast({
            title: '获取图片信息失败',
            icon: 'none'
          });
          reject(err);
        }
      });
    });
  },

  startSelection: function() {
    this.setData({
      isSelecting: !this.data.isSelecting,
      selectionStart: null
    });
    
    if (!this.data.isSelecting && this.imageInfo) {
      // 如果关闭选择模式，重绘图像
      this.redrawImage();
    }
  },

  clearSelection: function() {
    this.setData({
      selectedArea: null,
      isSelecting: false
    });
    this.redrawImage();
  },

  redrawImage: function() {
    if (!this.data.tempImagePath) return;
    
    this.drawImageToCanvas(this.data.tempImagePath).then(() => {
      // 如果有选中区域，绘制选中框
      if (this.data.selectedArea) {
        this.drawSelectionBox(this.data.selectedArea);
      }
    });
  },

  onCanvasTouchStart: function(e) {
    if (!this.data.isSelecting) return;
    
    const touch = e.touches[0];
    const x = touch.x;
    const y = touch.y;
    
    this.setData({
      selectionStart: { x, y }
    });
  },

  onCanvasTouchMove: function(e) {
    if (!this.data.isSelecting || !this.data.selectionStart) return;
    
    const touch = e.touches[0];
    const startX = this.data.selectionStart.x;
    const startY = this.data.selectionStart.y;
    const currentX = touch.x;
    const currentY = touch.y;
    
    // 计算选择框
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    const selectedArea = { x, y, width, height };
    
    // 重绘图像和选择框
    this.redrawImage();
    this.drawSelectionBox(selectedArea);
  },

  onCanvasTouchEnd: function(e) {
    if (!this.data.isSelecting || !this.data.selectionStart) return;
    
    const touch = e.changedTouches[0];
    const startX = this.data.selectionStart.x;
    const startY = this.data.selectionStart.y;
    const endX = touch.x;
    const endY = touch.y;
    
    // 计算最终选择框
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // 确保选择框大小有效
    if (width < 10 || height < 10) {
      wx.showToast({
        title: '请选择更大的区域',
        icon: 'none'
      });
      this.redrawImage();
      return;
    }
    
    // 保存选择区域
    this.setData({
      selectedArea: { x, y, width, height },
      isSelecting: false,
      selectionStart: null
    });
    
    // 最终绘制选择框
    this.redrawImage();
  },

  drawSelectionBox: function(area) {
    if (!this.data.canvasContext) return;
    
    const ctx = this.data.canvasContext;
    ctx.save();
    
    // 绘制边框
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(area.x, area.y, area.width, area.height);
    
    ctx.restore();
  },

  onStrengthChange: function(e) {
    this.setData({
      distortionStrength: e.detail.value
    });
    
    // 如果正在动画中，更新效果
    if (this.data.isAnimating) {
      this.updateAnimationEffect();
    }
  },

  onSpeedChange: function(e) {
    this.setData({
      animationSpeed: e.detail.value
    });
    
    // 如果正在动画中，更新效果
    if (this.data.isAnimating) {
      this.updateAnimationEffect();
    }
  },

  processImage: function() {
    if (!this.data.tempImagePath) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }
    
    // 切换动画状态
    if (this.data.isAnimating) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
  },
  
  startAnimation: function() {
    if (!this.data.canvasContext || !this.imageInfo) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isAnimating: true });
    
    // 开始最简单的动画
    this.animationPosition = 0;
    this.updateAnimationEffect();
  },
  
  stopAnimation: function() {
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.setData({ isAnimating: false });
    
    // 恢复原始图像
    this.redrawImage();
  },
  
  updateAnimationEffect: function() {
    if (!this.data.isAnimating) return;
    
    // 基于选择的区域位置简单移动图片
    this.simpleMoveEffect();
    
    // 继续下一帧
    const fps = Math.max(5, this.data.animationSpeed);
    this.animationFrame = setTimeout(() => {
      this.animationPosition += 0.1;
      this.updateAnimationEffect();
    }, 1000 / fps);
  },
  
  simpleMoveEffect: function() {
    if (!this.data.canvasContext || !this.imageInfo) return;
    
    const ctx = this.data.canvasContext;
    const { x, y, width, height } = this.imageInfo;
    const strength = this.data.distortionStrength * 0.5;
    
    // 获取选区范围，如果没有选择则使用整个图像
    const area = this.data.selectedArea || { x, y, width, height };
    
    // 计算简单的波动偏移
    const offsetX = Math.sin(this.animationPosition) * strength;
    const offsetY = Math.cos(this.animationPosition * 1.3) * strength;
    
    // 重新加载图片并绘制
    wx.getImageInfo({
      src: this.data.tempImagePath,
      success: (res) => {
        const img = this.canvas.createImage();
        img.onload = () => {
          // 清除画布
          ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
          
          // 首先只绘制背景区域（跳过选中区域）
          if (this.data.selectedArea) {
            // 计算原始图片上对应的区域
            const sourceX = (area.x - x) / width * res.width;
            const sourceY = (area.y - y) / height * res.height;
            const sourceWidth = area.width / width * res.width;
            const sourceHeight = area.height / height * res.height;
            
            // 绘制背景（上部分）
            if (area.y > y) {
              ctx.drawImage(
                img, 
                0, 0, 
                res.width, sourceY, 
                x, y, 
                width, area.y - y
              );
            }
            
            // 绘制背景（左部分）
            if (area.x > x) {
              ctx.drawImage(
                img, 
                0, sourceY, 
                sourceX, sourceHeight, 
                x, area.y, 
                area.x - x, area.height
              );
            }
            
            // 绘制背景（右部分）
            if (area.x + area.width < x + width) {
              ctx.drawImage(
                img, 
                sourceX + sourceWidth, sourceY, 
                res.width - sourceX - sourceWidth, sourceHeight, 
                area.x + area.width, area.y, 
                x + width - (area.x + area.width), area.height
              );
            }
            
            // 绘制背景（下部分）
            if (area.y + area.height < y + height) {
              ctx.drawImage(
                img, 
                0, sourceY + sourceHeight, 
                res.width, res.height - sourceY - sourceHeight, 
                x, area.y + area.height, 
                width, y + height - (area.y + area.height)
              );
            }
            
            // 绘制动态效果区域（多次叠加偏移的图像）
            for (let i = -1; i <= 1; i += 0.5) {
              // 计算偏移
              const shiftX = offsetX * i;
              const shiftY = offsetY * i;
              
              // 绘制偏移的图像
              ctx.drawImage(
                img, 
                sourceX, 
                sourceY, 
                sourceWidth, 
                sourceHeight,
                area.x + shiftX, 
                area.y + shiftY, 
                area.width, 
                area.height
              );
            }
            
            // 添加边框提示效果区域
            ctx.strokeStyle = 'rgba(255, 68, 68, 0.7)';
            ctx.lineWidth = Math.max(1, strength * 0.3);
            ctx.strokeRect(
              area.x + offsetX * 0.5, 
              area.y + offsetY * 0.5, 
              area.width, 
              area.height
            );
          } else {
            // 如果没有选择区域，对整个图像应用简单动画效果
            // 先绘制原图
            ctx.drawImage(img, x, y, width, height);
            
            // 再叠加偏移的半透明图像
            ctx.globalAlpha = 0.5;
            ctx.drawImage(
              img,
              x + offsetX * 0.3,
              y + offsetY * 0.3,
              width,
              height
            );
            ctx.globalAlpha = 1.0;
          }
        };
        img.src = this.data.tempImagePath;
      }
    });
  },

  handleLocalImage: function(imagePath) {
    // 显示成功提示
    wx.showToast({
      title: '处理成功（本地版）',
      icon: 'success',
      duration: 2000
    });
    
    // 直接预览图片
    wx.previewImage({
      current: imagePath,
      urls: [imagePath]
    });
  },

  handleVideoResult: function(result) {
    if (result.success) {
      // 检查是否有消息需要显示
      if (result.message) {
        wx.showToast({
          title: result.message,
          icon: 'none',
          duration: 2000
        });
      }
      
      // 判断返回的是视频还是图片（暂时版本可能返回图片）
      const isVideo = result.videoUrl.includes('mp4') || result.videoUrl.includes('videos/');
      
      if (isVideo) {
        // 跳转到预览页面
        wx.navigateTo({
          url: `/pages/preview/preview?videoUrl=${result.videoUrl}`
        });
      } else {
        // 直接预览图片
        wx.previewImage({
          current: result.videoUrl,
          urls: [result.videoUrl]
        });
      }
    } else {
      wx.showToast({
        title: result.error || '处理失败',
        icon: 'none'
      });
    }
  },

  copyCode(e) {
    const code = e.target?.dataset?.code || '';
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({
          title: '已复制',
        })
      },
      fail: (err) => {
        console.error('复制失败-----', err);
      }
    })
  },

  discoverCloud() {
    wx.switchTab({
      url: '/pages/examples/index',
    })
  },

  gotoGoodsListPage() {
    wx.navigateTo({
      url: '/pages/goods-list/index',
    })
  },
});
