Page({
  data: {
    imagePath: '',
    selectedArea: null,
    brushPath: null,
    canvasContext: null,
    canvasWidth: 300,
    canvasHeight: 300,
    isAnimating: false,
    animationPosition: 0,
    animationFrame: null,
    distortionStrength: 5,
    animationSpeed: 15,
    processedImagePath: '',
    isProcessing: false,
    animationDuration: 2, // 动画时长(秒)
    frameCount: 6, // 减少帧数从10改为6，减轻云函数负担
    frames: [], // 用于存储动画帧
    isCapturingFrames: false, // 是否正在捕获帧
    generatedGifPath: '',
    showResult: false,
    processing: false,
    captureFrameCount: 6, // 用于控制捕获的帧数
    frameList: [], // 用于存储使用新方法捕获的帧
    // 新增调试状态
    showDebugInfo: false,
    canvasError: false,
    canvasErrorMessage: '',
    initializingCanvas: false,
    useDirectImageMode: false // 是否直接使用图片模式（不使用canvas）
  },

  onLoad: function(options) {
    console.log('download page onLoad, options:', options);
    
    if (options.imagePath) {
      // 解码URL参数
      const imagePath = decodeURIComponent(options.imagePath);
      console.log('Decoded imagePath:', imagePath);
      
      let selectedArea = null;
      let brushPath = null;
      
      try {
        if (options.selectedArea) {
          selectedArea = JSON.parse(decodeURIComponent(options.selectedArea));
          console.log('Decoded selectedArea:', selectedArea);
        }
        
        if (options.brushPath) {
          brushPath = JSON.parse(decodeURIComponent(options.brushPath));
          console.log('Decoded brushPath:', brushPath);
        }
      } catch (error) {
        console.error('解析参数出错:', error);
      }
      
      this.setData({
        imagePath: imagePath,
        selectedArea: selectedArea,
        brushPath: brushPath
      });
    } else {
      console.error('No imagePath provided in options');
    }
    
    // 获取系统信息以设置canvas大小
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      canvasWidth: systemInfo.windowWidth * 0.9,
      canvasHeight: systemInfo.windowHeight * 0.5
    });
  },
  
  onReady: function() {
    console.log('download页面onReady...');
    
    // 页面渲染完成后，需要稍等一会再初始化Canvas
    setTimeout(() => {
      if (this.data.imagePath) {
        console.log('页面准备好，开始初始化Canvas...');
        // 显示调试信息，方便排查问题
        this.setData({ showDebugInfo: true });
        
        // 增加等待时间，确保DOM已经完全渲染
        setTimeout(() => {
          this.initCanvas()
            .catch(err => {
              console.error('Canvas初始化失败:', err);
              // 自动切换到直接图片模式
              this.skipToDirectImageMode();
            });
        }, 500);
      } else {
        console.warn('没有图片路径，无法初始化Canvas');
        this.setData({
          canvasError: true,
          canvasErrorMessage: '未找到图片路径',
          showDebugInfo: true
        });
      }
    }, 500);
  },
  
  onShow: function() {
    console.log('download页面onShow...');
    // 页面显示时，如果Canvas还未初始化但有图片路径，尝试初始化
    if (!this.data.canvasContext && this.data.imagePath && !this.initializingCanvas) {
      console.log('页面显示，尝试初始化Canvas...');
      this.initializingCanvas = true;
      
      setTimeout(() => {
        this.initCanvas().finally(() => {
          this.initializingCanvas = false;
        });
      }, 300);
    }
  },
  
  onUnload: function() {
    // 页面卸载时停止动画
    this.stopAnimation();
  },
  
  initCanvas: function() {
    return new Promise((resolve, reject) => {
      try {
        // 增加延迟时间，确保页面完全渲染
        setTimeout(() => {
          console.log('开始初始化Canvas...');
          const query = wx.createSelectorQuery();
          query.select('#previewCanvas')
            .fields({ node: true, size: true })
            .exec((res) => {
              console.log('Canvas查询结果:', res);
              
              if (!res || !res[0] || !res[0].node) {
                const error = new Error('Canvas node not found');
                console.error('Canvas initialization failed: Canvas node not found');
                this.handleCanvasError(error);
                
                // 显示失败信息并激活备用图片显示
                this.setData({
                  canvasError: true,
                  canvasErrorMessage: '无法找到Canvas节点',
                  showDebugInfo: true
                });
                
                reject(error);
                return;
              }
              
              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                const error = new Error('Could not get 2D context');
                console.error('Canvas initialization failed: Could not get 2D context');
                this.handleCanvasError(error);
                
                // 显示失败信息并激活备用图片显示
                this.setData({
                  canvasError: true,
                  canvasErrorMessage: '无法获取2D上下文',
                  showDebugInfo: true
                });
                
                reject(error);
                return;
              }
              
              console.log('Canvas节点和上下文获取成功');
              
              // 保存canvas引用
              this.canvas = canvas;
              
              // 设置canvas大小
              const dpr = wx.getSystemInfoSync().pixelRatio;
              canvas.width = this.data.canvasWidth * dpr;
              canvas.height = this.data.canvasHeight * dpr;
              ctx.scale(dpr, dpr);
              
              console.log('Canvas尺寸设置完成:', {
                width: canvas.width,
                height: canvas.height,
                dpr: dpr
              });
              
              this.setData({
                canvasContext: ctx,
                canvasError: false,
                canvasErrorMessage: ''
              }, () => {
                console.log('Canvas初始化完成，准备绘制图片');
                
                // 延迟执行绘制，确保Canvas状态更新
                setTimeout(() => {
                  // 绘制图片
                  this.drawImageToCanvas(this.data.imagePath).catch(err => {
                    console.error('Failed to draw image after canvas init:', err);
                    this.handleCanvasError(err);
                  });
                }, 100);
                
                resolve(ctx);
              });
            });
        }, 300); // 延长等待时间到300ms
      } catch (error) {
        console.error('Canvas initialization failed with error:', error);
        this.handleCanvasError(error);
        
        // 显示失败信息并激活备用图片显示
        this.setData({
          canvasError: true,
          canvasErrorMessage: error.message || '初始化过程出现异常',
          showDebugInfo: true
        });
        
        reject(error);
      }
    });
  },
  
  drawImageToCanvas: function(imagePath) {
    console.log('drawImageToCanvas called with imagePath:', imagePath);
    
    return new Promise((resolve, reject) => {
      if (!this.data.canvasContext) {
        console.error('Canvas context not available');
        wx.showToast({
          title: 'Canvas未初始化',
          icon: 'none'
        });
        
        // 更新错误状态，激活备用显示模式
        this.setData({ 
          canvasError: true,
          canvasErrorMessage: 'Canvas上下文不可用',
          showDebugInfo: true
        });
        
        reject(new Error('Canvas context not available'));
        return;
      }

      // 检查图片路径是否有效
      if (!imagePath) {
        console.error('Image path is empty or invalid');
        wx.showToast({
          title: '图片路径无效',
          icon: 'none'
        });
        
        // 更新错误状态，激活备用显示模式
        this.setData({ 
          canvasError: true,
          canvasErrorMessage: '图片路径无效',
          showDebugInfo: true
        });
        
        reject(new Error('Image path is invalid'));
        return;
      }

      const ctx = this.data.canvasContext;
      
      // 先尝试判断图片路径类型
      if (imagePath.startsWith('cloud://')) {
        // 云存储路径，先获取临时URL
        console.log('检测到云存储路径，正在获取临时URL...');
        wx.cloud.getTempFileURL({
          fileList: [imagePath],
          success: res => {
            if (res.fileList && res.fileList.length > 0) {
              const tempUrl = res.fileList[0].tempFileURL;
              console.log('获取临时URL成功:', tempUrl);
              // 使用临时URL加载图片
              this.loadImageWithPath(tempUrl, ctx, resolve, reject);
            } else {
              console.error('获取临时URL失败: 返回结果为空');
              this.setData({
                canvasError: true,
                canvasErrorMessage: '无法获取云存储图片',
                showDebugInfo: true
              });
              reject(new Error('获取临时URL失败'));
            }
          },
          fail: err => {
            console.error('获取临时URL出错:', err);
            this.setData({
              canvasError: true,
              canvasErrorMessage: '云存储访问失败',
              showDebugInfo: true
            });
            reject(err);
          }
        });
      } else {
        // 本地路径或网络路径，直接加载
        this.loadImageWithPath(imagePath, ctx, resolve, reject);
      }
    });
  },
  
  // 新增：使用路径加载图片到Canvas
  loadImageWithPath: function(imagePath, ctx, resolve, reject) {
    console.log('正在加载图片:', imagePath);
    
    // 使用wx.getImageInfo获取图片信息
    wx.getImageInfo({
      src: imagePath,
      success: (res) => {
        console.log('getImageInfo success:', res);
        try {
          // 创建图片对象
          const img = this.canvas.createImage();
          img.onload = () => {
            // 清除canvas
            ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
            
            // 添加白色背景，确保透明图片可见
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
            ctx.restore();
            
            // 计算图片绘制尺寸，保持宽高比
            const scale = Math.min(
              this.data.canvasWidth / res.width,
              this.data.canvasHeight / res.height
            );
            const width = res.width * scale;
            const height = res.height * scale;
            const x = (this.data.canvasWidth - width) / 2;
            const y = (this.data.canvasHeight - height) / 2;
            
            console.log('Drawing image with dimensions:', {
              canvasWidth: this.data.canvasWidth,
              canvasHeight: this.data.canvasHeight,
              imageWidth: width,
              imageHeight: height,
              x, y
            });
            
            // 保存图片信息
            this.imageInfo = {
              x, y, width, height,
              originalWidth: res.width,
              originalHeight: res.height,
              scale: scale
            };
            
            // 绘制图片
            ctx.drawImage(img, x, y, width, height);
            
            // 如果有选区和画笔路径，绘制选区
            if (this.data.selectedArea && this.data.brushPath) {
              this.drawBrushSelection();
            }
            
            // 取消错误状态
            this.setData({
              canvasError: false,
              canvasErrorMessage: ''
            });
            
            resolve();
          };
          img.onerror = (err) => {
            console.error('Image loading failed:', err);
            
            wx.showToast({
              title: '图片加载失败',
              icon: 'none'
            });
            
            this.setData({
              canvasError: true,
              canvasErrorMessage: '图片加载到Canvas失败',
              showDebugInfo: true
            });
            
            reject(err);
          };
          img.src = imagePath;
          console.log('Set image src:', imagePath);
        } catch (error) {
          console.error('Error drawing image:', error);
          
          wx.showToast({
            title: '绘制图片失败',
            icon: 'none'
          });
          
          this.setData({
            canvasError: true,
            canvasErrorMessage: '图片绘制过程出错',
            showDebugInfo: true
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
        
        this.setData({
          canvasError: true,
          canvasErrorMessage: '无法获取图片信息',
          showDebugInfo: true
        });
        
        reject(err);
      }
    });
  },
  
  // 绘制画笔选区
  drawBrushSelection: function() {
    if (!this.data.canvasContext || !this.data.brushPath) return;
    
    const ctx = this.data.canvasContext;
    ctx.save();
    
    // 绘制画笔路径
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(this.data.brushPath[0].x, this.data.brushPath[0].y);
    
    for (let i = 1; i < this.data.brushPath.length; i++) {
      ctx.lineTo(this.data.brushPath[i].x, this.data.brushPath[i].y);
    }
    
    // 闭合路径 - 连接到第一个点
    if (this.data.brushPath.length > 2) {
      ctx.lineTo(this.data.brushPath[0].x, this.data.brushPath[0].y);
    }
    
    ctx.stroke();
    ctx.restore();
  },
  
  // 动画按钮点击
  toggleAnimation: function() {
    if (this.data.isAnimating) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
  },
  
  startAnimation: function() {
    if (!this.data.canvasContext || !this.imageInfo) {
      wx.showToast({
        title: '无法开始动画',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isAnimating: true });
    
    // 开始动画
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
    this.drawImageToCanvas(this.data.imagePath);
  },
  
  updateAnimationEffect: function(progress) {
    if (!this.data.isAnimating) return;
    
    // 基于选择的区域位置应用动画效果
    this.applyAnimationEffect();
    
    // 继续下一帧
    const fps = Math.max(5, this.data.animationSpeed);
    this.animationFrame = setTimeout(() => {
      this.animationPosition += 0.1;
      this.updateAnimationEffect();
    }, 1000 / fps);
  },
  
  applyAnimationEffect: function(progress) {
    if (!this.canvas || !this.data.canvasContext) {
      console.error('Canvas或上下文未初始化');
      return;
    }
    
    const ctx = this.data.canvasContext;
    
    // 清空画布
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 添加白色背景，防止黑屏
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    ctx.restore();
    
    // 如果没有图像，直接返回
    if (!this.data.imagePath) {
      console.warn('没有图像数据可用于动画');
      return;
    }
    
    try {
      console.log(`应用动画效果，进度: ${progress.toFixed(2)}`);
      
      // 加载图片
      const img = this.canvas.createImage();
      
      img.onload = () => {
        // 选择的区域
        const selectedArea = this.data.selectedArea;
        const brushPath = this.data.brushPath;
        const hasSelection = selectedArea && brushPath && brushPath.length > 2;
        
        // 绘制原始图像
        if (this.imageInfo) {
          const { x, y, width, height } = this.imageInfo;
          ctx.drawImage(img, x, y, width, height);
        } else {
          // 如果没有imageInfo，尝试居中绘制
          ctx.drawImage(img, 0, 0, this.data.canvasWidth, this.data.canvasHeight);
        }
        
        // 如果有选择区域，应用特殊效果
        if (hasSelection) {
          // 设置剪切路径
          ctx.save();
          ctx.beginPath();
          
          ctx.moveTo(brushPath[0].x, brushPath[0].y);
          for (let i = 1; i < brushPath.length; i++) {
            ctx.lineTo(brushPath[i].x, brushPath[i].y);
          }
          
          // 闭合路径
          ctx.closePath();
          ctx.clip();
          
          // 计算选择区域边界
          let minX = brushPath[0].x, minY = brushPath[0].y;
          let maxX = brushPath[0].x, maxY = brushPath[0].y;
          
          for (let i = 1; i < brushPath.length; i++) {
            minX = Math.min(minX, brushPath[i].x);
            minY = Math.min(minY, brushPath[i].y);
            maxX = Math.max(maxX, brushPath[i].x);
            maxY = Math.max(maxY, brushPath[i].y);
          }
          
          // 选区尺寸和中心点
          const selectionWidth = maxX - minX;
          const selectionHeight = maxY - minY;
          
          // 相位和扭曲强度
          const phase = progress * 2 * Math.PI;
          const strength = 4; // 减小扭曲强度
          
          // 清除选区内容，准备重新绘制
          ctx.clearRect(minX, minY, selectionWidth, selectionHeight);
          
          // 第一层图层移动效果
          const upperOffset = Math.sin(phase) * strength;
          
          if (this.imageInfo) {
            const { x, y, width, height } = this.imageInfo;
            
            // 计算选区在图像上的相对位置
            const relMinX = (minX - x) / width;
            const relMinY = (minY - y) / height;
            const relWidth = selectionWidth / width;
            const relHeight = selectionHeight / height;
            
            // 绘制第一层图层
            ctx.globalAlpha = 0.85;
            ctx.drawImage(
              img,
              x + width * relMinX, 
              y + height * relMinY,
              width * relWidth,
              height * relHeight,
              minX + upperOffset,
              minY,
              selectionWidth,
              selectionHeight
            );
            
            // 绘制第二层图层，使用不同混合模式和相位
            const lowerOffset = Math.sin(phase + Math.PI) * strength;
            ctx.globalCompositeOperation = 'soft-light';
            ctx.globalAlpha = 0.75;
            ctx.drawImage(
              img,
              x + width * relMinX, 
              y + height * relMinY,
              width * relWidth,
              height * relHeight,
              minX + lowerOffset,
              minY,
              selectionWidth,
              selectionHeight
            );
          } else {
            // 如果没有imageInfo，简单绘制
            ctx.globalAlpha = 0.85;
            ctx.drawImage(
              img,
              0, 0,
              this.data.canvasWidth, this.data.canvasHeight,
              minX + upperOffset, minY,
              selectionWidth, selectionHeight
            );
            
            // 第二层
            ctx.globalCompositeOperation = 'soft-light';
            ctx.globalAlpha = 0.75;
            const lowerOffset = Math.sin(phase + Math.PI) * strength;
            ctx.drawImage(
              img,
              0, 0,
              this.data.canvasWidth, this.data.canvasHeight,
              minX + lowerOffset, minY,
              selectionWidth, selectionHeight
            );
          }
          
          // 恢复状态
          ctx.restore();
          
          // 绘制选区边框
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 150, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          ctx.moveTo(brushPath[0].x, brushPath[0].y);
          
          for (let i = 1; i < brushPath.length; i++) {
            ctx.lineTo(brushPath[i].x, brushPath[i].y);
          }
          
          // 闭合路径
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      };
      
      img.onerror = (err) => {
        console.error('图像加载失败:', err);
        // 绘制错误提示
        ctx.fillStyle = 'red';
        ctx.fillRect(10, 10, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText('图像加载失败', 20, 50);
      };
      
      // 设置图片源
      img.src = this.data.imagePath;
    } catch (error) {
      console.error('应用动画效果时出错:', error);
    }
  },
  
  // 调整动画时长
  onDurationChange: function(e) {
    this.setData({
      animationDuration: e.detail.value
    });
  },
  
  // 捕获动画帧
  captureAnimationFrames: function() {
    if (!this.data.selectedArea || !this.data.brushPath) {
      wx.showToast({
        title: '无效的选择区域',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ 
      isProcessing: true,
      isCapturingFrames: true,
      frames: []
    });
    
    // 先停止任何正在进行的动画
    this.stopAnimation();
    
    // 设置帧数和时间间隔
    const frameCount = this.data.frameCount;
    const interval = (this.data.animationDuration * 1000) / frameCount;
    
    // 开始捕获帧
    this.captureFrameSequence(0, frameCount, interval);
  },
  
  // 按顺序捕获每一帧
  captureFrameSequence: function() {
    if (this.canvas) {
      // 相关变量初始化
      const frameCount = this.data.captureFrameCount;
      const duration = this.data.animationDuration;
      const frameDuration = duration / frameCount;
      const frames = [];
      const maxFrames = 6; // 设置最大帧数限制

      console.log(`开始捕获帧序列，计划帧数: ${frameCount}，动画时长: ${duration}ms，每帧间隔: ${frameDuration}ms`);
      
      wx.showLoading({
        title: '捕获动画帧中...',
        mask: true
      });

      // 清除旧帧
      this.frameList = [];
      this.setData({ processing: true });

      // 创建捕获函数
      const captureFrame = (index) => {
        if (index >= frameCount || index >= maxFrames) {
          console.log(`捕获完成，共${this.frameList.length}帧`);
          this.setData({ 
            processing: false,
            frames: this.frameList // 将捕获的帧转移到frames数组中
          });
          wx.hideLoading();
          wx.showToast({
            title: `已捕获${this.frameList.length}帧`,
            icon: 'success'
          });
          
          // 自动启动GIF生成
          if (this.frameList.length > 0) {
            setTimeout(() => {
              this.generateGif();
            }, 500);
          }
          return;
        }

        // 计算当前时间点
        const progress = index / (frameCount - 1);
        
        // 应用动画效果
        this.applyAnimationEffect(progress);
        
        // 捕获帧
        const that = this;
        
        // 用PNG格式保存，保持透明度
        wx.canvasToTempFilePath({
          canvas: this.canvas,
          destWidth: 200, // 减小尺寸优化性能
          destHeight: 150,
          fileType: 'png',
          quality: 0.9, // 高质量
          success: function(res) {
            const framePath = res.tempFilePath;
            console.log(`帧 ${index+1}/${frameCount} 捕获成功: ${framePath}`);
            that.frameList.push(framePath);
            
            // 捕获下一帧
            setTimeout(() => {
              captureFrame(index + 1);
            }, 100); // 短暂延迟以确保UI更新
          },
          fail: function(error) {
            console.error(`帧 ${index+1} 捕获失败:`, error);
            wx.hideLoading();
            that.setData({ processing: false });
            wx.showToast({
              title: '帧捕获失败',
              icon: 'none'
            });
          }
        });
      };

      // 开始捕获
      captureFrame(0);
    } else {
      console.error('Canvas节点未初始化');
      wx.showToast({
        title: 'Canvas未准备好',
        icon: 'none'
      });
    }
  },
  
  // 处理捕获的帧，生成动画
  processAnimationFrames: function() {
    if (this.data.frames.length === 0) {
      this.setData({ 
        isProcessing: false,
        isCapturingFrames: false
      });
      wx.showToast({
        title: '没有捕获到帧',
        icon: 'none'
      });
      return;
    }
    
    this.generateGif();
  },
  
  // 处理下载的图像
  handleDownloadedImage: function(fileID) {
    // 显示加载状态
    wx.showLoading({
      title: '准备预览...',
      mask: true
    });
    
    // 获取临时文件URL
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: res => {
        if (res.fileList && res.fileList.length > 0) {
          const tempUrl = res.fileList[0].tempFileURL;
          console.log('获取到临时文件URL:', tempUrl);
          
          this.setData({
            generatedGifPath: tempUrl,
            showResult: true,
            processing: false
          });
          
          wx.hideLoading();
        } else {
          throw new Error('获取临时文件URL失败: 返回结果为空');
        }
      },
      fail: err => {
        console.error('获取临时文件URL出错:', err);
        wx.hideLoading();
        wx.showToast({
          title: '获取文件失败',
          icon: 'none'
        });
        this.setData({ processing: false });
      }
    });
  },
  
  // 下载生成的图像
  downloadImage: function() {
    const filePath = this.data.generatedGifPath;
    if (!filePath) {
      wx.showToast({
        title: '请先生成GIF',
        icon: 'none'
      });
      return;
    }

    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('Failed to save image:', err);
        
        if (err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存相册',
            showCancel: false,
            success: () => {
              wx.openSetting();
            }
          });
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      }
    });
  },
  
  // 生成GIF图像的函数
  generateGif: function() {
    return new Promise((resolve, reject) => {
      // 确保frameList已初始化
      if (!this.frameList) {
        this.frameList = [];
      }
      
      if (this.frameList.length === 0) {
        // Capture frames first
        this.captureFramesForGif()
          .then(() => {
            // 再次检查帧是否捕获成功
            if (!this.frameList || this.frameList.length === 0) {
              reject(new Error('帧捕获失败，请重试'));
              return;
            }
            this.processFramesForGif(resolve, reject);
          })
          .catch(error => {
            reject(error);
          });
      } else {
        // Already have frames, process them
        this.processFramesForGif(resolve, reject);
      }
    });
  },
  
  captureFramesForGif: function() {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        console.error('Canvas节点未初始化');
        reject(new Error('Canvas未准备好'));
        return;
      }

      // Related variables initialization
      const frameCount = this.data.captureFrameCount || 5;
      const duration = this.data.animationDuration || 1000;
      const maxFrames = 6; // Maximum frame limit

      wx.showLoading({
        title: '捕获动画帧中...',
        mask: true
      });

      // Clear old frames and ensure frameList is initialized
      if (!this.frameList) {
        this.frameList = [];
      } else {
        this.frameList = [];
      }

      // Create capture function
      const captureFrame = (index) => {
        if (index >= frameCount || index >= maxFrames) {
          console.log(`捕获完成，共${this.frameList.length}帧`);
          wx.hideLoading();
          resolve();
          return;
        }

        // Calculate current time point
        const progress = index / (frameCount - 1);
        
        // Apply animation effect
        this.applyAnimationEffect(progress);
        
        // Capture frame
        const that = this;
        
        wx.canvasToTempFilePath({
          canvas: this.canvas,
          destWidth: 200,
          destHeight: 150,
          fileType: 'png',
          quality: 0.9,
          success: function(res) {
            const framePath = res.tempFilePath;
            console.log(`帧 ${index+1}/${frameCount} 捕获成功: ${framePath}`);
            that.frameList.push(framePath);
            
            // Capture next frame
            setTimeout(() => {
              captureFrame(index + 1);
            }, 100); // Short delay to ensure UI update
          },
          fail: function(error) {
            console.error(`帧 ${index+1} 捕获失败:`, error);
            wx.hideLoading();
            reject(new Error('帧捕获失败'));
          }
        });
      };

      // Start capturing
      captureFrame(0);
    });
  },

  processFramesForGif: function(resolve, reject) {
    const frames = this.frameList;
    
    if (!frames || frames.length === 0) {
      reject(new Error('没有捕获到帧'));
      return;
    }
    
    wx.showLoading({
      title: '生成GIF中...',
      mask: true
    });
    
    // Call cloud function to generate GIF
    wx.cloud.callFunction({
      name: 'createGif',
      data: {
        frameUrls: frames,
        duration: this.data.animationDuration || 1000,
        frameCount: frames.length
      },
      timeout: 60000, // 60 seconds timeout
      success: res => {
        console.log('云函数调用结果:', res);
        
        if (res.result && res.result.success) {
          // Successfully generated GIF
          const fileID = res.result.fileID;
          console.log('生成的GIF文件ID:', fileID);
          
          // Get temporary file URL
          wx.cloud.getTempFileURL({
            fileList: [fileID],
            success: result => {
              const tempUrl = result.fileList[0].tempFileURL;
              console.log('GIF临时URL:', tempUrl);
              
              wx.hideLoading();
              resolve(tempUrl);
            },
            fail: error => {
              console.error('获取文件URL失败:', error);
              wx.hideLoading();
              reject(new Error('获取GIF失败'));
            }
          });
        } else if (res.result && res.result.staticImage) {
          // Static image fallback
          console.log('云函数只返回了静态图:', res.result.staticImage);
          
          wx.cloud.getTempFileURL({
            fileList: [res.result.staticImage],
            success: result => {
              const tempUrl = result.fileList[0].tempFileURL;
              console.log('静态图片临时URL:', tempUrl);
              
              wx.hideLoading();
              resolve(tempUrl);
            },
            fail: error => {
              console.error('获取静态图片URL失败:', error);
              wx.hideLoading();
              reject(new Error('获取图片失败'));
            }
          });
        } else {
          // Processing failed
          console.error('生成GIF失败:', res.result ? res.result.error : '未知错误');
          wx.hideLoading();
          reject(new Error(res.result && res.result.error ? res.result.error : 'GIF生成失败'));
        }
      },
      fail: error => {
        console.error('调用云函数失败:', error);
        wx.hideLoading();
        reject(new Error('调用云函数失败'));
      }
    });
  },
  
  // 修改生成并下载的方法，使用新的帧捕获方法
  generateAndDownload: function(e) {
    // Prevent multiple processing
    if (this.data.processing) {
      wx.showToast({
        title: '正在处理中，请稍候',
        icon: 'none'
      });
      return;
    }

    // Set processing state
    this.setData({ 
      processing: true,
      generatedGifPath: ''
    });

    // Generate GIF
    this.generateGif()
      .then(gifPath => {
        // Update UI with the generated GIF
        this.setData({
          generatedGifPath: gifPath,
          showResult: true,
          processing: false
        });

        wx.showToast({
          title: 'GIF生成成功',
          icon: 'success'
        });

        // If this was triggered by download button, proceed to download
        if (e && e.currentTarget && e.currentTarget.dataset.action === 'download') {
          this.downloadImage();
        }
      })
      .catch(error => {
        console.error('GIF生成失败:', error);
        this.setData({ processing: false });
        
        wx.showToast({
          title: error.message || 'GIF生成失败',
          icon: 'none'
        });
      });
  },
  
  // 保存到相册
  saveToAlbum: function() {
    if (!this.data.processedImagePath) {
      // 如果还没有处理后的图片，先生成
      this.generateAndDownload();
      return;
    }
    
    wx.saveImageToPhotosAlbum({
      filePath: this.data.processedImagePath,
      success: function() {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: function(err) {
        console.error('保存失败:', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 返回到首页
  goToHome: function() {
    wx.navigateBack({
      delta: 2  // 返回到首页
    });
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },
  
  // 返回到主页
  backToIndex: function() {
    wx.navigateBack({
      delta: 1,
    });
  },
  
  // 显示结果并允许下载
  showResultAndDownloadOptions: function() {
    if (this.data.generatedGifPath) {
      wx.hideLoading();
      this.setData({
        showResult: true,
        processing: false
      });
    } else {
      wx.showToast({
        title: '没有可用的图像',
        icon: 'none'
      });
    }
  },
  
  // 重置状态，清除选择的帧
  resetSelection: function() {
    this.setData({
      showResult: false,
      generatedGifPath: ''
    });
    this.resetCanvas();
  },

  resetCanvas: function() {
    // Reinitialize the canvas
    if (this.canvas) {
      this.initCanvas();
    } else {
      this.createCanvasContext();
    }
  },

  handleImageError: function(e) {
    console.error('Image error:', e);
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },
  
  // 处理直接显示图片的错误
  handleDirectImageError: function(e) {
    console.error('Direct image error:', e);
    wx.showToast({
      title: '图片直接加载失败',
      icon: 'none'
    });
    
    // 如果是云存储图片，尝试获取临时URL
    if (this.data.imagePath && this.data.imagePath.startsWith('cloud://')) {
      wx.cloud.getTempFileURL({
        fileList: [this.data.imagePath],
        success: res => {
          if (res.fileList && res.fileList.length > 0) {
            const tempUrl = res.fileList[0].tempFileURL;
            this.setData({
              imagePath: tempUrl
            });
          }
        }
      });
    }
  },
  
  // 切换调试信息显示
  toggleDebugInfo: function() {
    this.setData({
      showDebugInfo: !this.data.showDebugInfo
    });
  },
  
  // 捕获Canvas初始化错误
  handleCanvasError: function(error) {
    console.error('Canvas initialization error:', error);
    this.setData({
      canvasError: true,
      canvasErrorMessage: error.message || '初始化失败'
    });
    
    // 显示调试信息
    this.setData({
      showDebugInfo: true
    });
  },
  
  // 尝试重新初始化Canvas
  tryInitCanvasAgain: function() {
    console.log('尝试重新初始化Canvas...');
    
    this.setData({
      canvasError: false,
      canvasErrorMessage: '',
      showDebugInfo: true // 保持调试信息显示
    });
    
    setTimeout(() => {
      this.initCanvas();
    }, 500);
  },
  
  // 跳过Canvas，直接使用图片模式
  skipToDirectImageMode: function() {
    console.log('切换到直接图片模式...');
    
    this.setData({
      useDirectImageMode: true,
      canvasError: false, // 不再显示错误
      canvasErrorMessage: ''
    });
    
    // 如果是云存储图片，确保获取临时URL
    if (this.data.imagePath && this.data.imagePath.startsWith('cloud://')) {
      wx.cloud.getTempFileURL({
        fileList: [this.data.imagePath],
        success: res => {
          if (res.fileList && res.fileList.length > 0) {
            const tempUrl = res.fileList[0].tempFileURL;
            this.setData({
              imagePath: tempUrl
            });
          }
        }
      });
    }
  },
  
  // 在直接图片模式下保存图片到相册
  saveToAlbum: function() {
    // 如果有处理后的图片，优先使用
    if (this.data.processedImagePath) {
      wx.saveImageToPhotosAlbum({
        filePath: this.data.processedImagePath,
        success: function() {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        },
        fail: function(err) {
          console.error('保存失败:', err);
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      });
      return;
    }
    
    // 如果是直接图片模式，使用wx.downloadFile下载原图
    if (this.data.useDirectImageMode && this.data.imagePath) {
      // 判断是否是网络图片
      if (this.data.imagePath.startsWith('http')) {
        wx.showLoading({
          title: '下载图片中...',
          mask: true
        });
        
        wx.downloadFile({
          url: this.data.imagePath,
          success: res => {
            if (res.statusCode === 200) {
              wx.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => {
                  wx.hideLoading();
                  wx.showToast({
                    title: '保存成功',
                    icon: 'success'
                  });
                },
                fail: err => {
                  wx.hideLoading();
                  console.error('保存到相册失败:', err);
                  wx.showToast({
                    title: '保存失败',
                    icon: 'none'
                  });
                }
              });
            } else {
              wx.hideLoading();
              wx.showToast({
                title: '下载失败',
                icon: 'none'
              });
            }
          },
          fail: err => {
            wx.hideLoading();
            console.error('下载图片失败:', err);
            wx.showToast({
              title: '下载失败',
              icon: 'none'
            });
          }
        });
      } else {
        // 本地图片路径，直接保存
        wx.saveImageToPhotosAlbum({
          filePath: this.data.imagePath,
          success: () => {
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: err => {
            console.error('保存到相册失败:', err);
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
          }
        });
      }
    } else {
      // 如果还没有处理后的图片，先生成
      this.generateAndDownload();
    }
  },
}); 