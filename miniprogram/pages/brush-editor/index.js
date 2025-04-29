Page({
  data: {
    tempImagePath: '',
    distortionStrength: 5,
    animationSpeed: 15,
    canvasContext: null,
    canvasWidth: 300,
    canvasHeight: 300,
    isSelecting: true,
    isDrawing: false,
    brushPoints: [],
    brushPath: null,
    selectedArea: null
  },

  onLoad: function(options) {
    // 获取传递过来的图片路径
    if (options.imagePath) {
      this.setData({
        tempImagePath: decodeURIComponent(options.imagePath),
        isSelecting: true  // 默认启用自由画笔模式
      });
    }
    
    // 获取系统信息以设置canvas大小
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      canvasWidth: systemInfo.windowWidth * 0.9,
      canvasHeight: systemInfo.windowHeight * 0.5
    });
  },

  onReady: function() {
    // 页面渲染完成后初始化Canvas
    if (this.data.tempImagePath) {
      this.initCanvas();
    }
  },

  initCanvas: function() {
    console.log('brush-editor: 开始初始化Canvas...');
    return new Promise((resolve, reject) => {
      try {
        setTimeout(() => {
          const query = wx.createSelectorQuery();
          query.select('#myCanvas')
            .fields({ node: true, size: true })
            .exec((res) => {
              console.log('brush-editor: Canvas查询结果:', res);
              
              if (!res || !res[0] || !res[0].node) {
                console.error('Canvas initialization failed: Canvas node not found');
                wx.showToast({
                  title: '初始化画布失败',
                  icon: 'none'
                });
                reject(new Error('Canvas node not found'));
                return;
              }
              
              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                console.error('Canvas initialization failed: Could not get 2D context');
                wx.showToast({
                  title: '初始化画布失败',
                  icon: 'none'
                });
                reject(new Error('Could not get 2D context'));
                return;
              }
              
              console.log('brush-editor: Canvas节点和上下文获取成功');
              
              // 保存canvas引用
              this.canvas = canvas;
              this.ctx = ctx;
              
              // 设置画布大小
              const dpr = wx.getSystemInfoSync().pixelRatio;
              canvas.width = this.data.canvasWidth * dpr;
              canvas.height = this.data.canvasHeight * dpr;
              ctx.scale(dpr, dpr);
              
              console.log('brush-editor: Canvas尺寸设置完成:', {
                width: canvas.width, 
                height: canvas.height,
                dpr: dpr
              });
              
              this.setData({
                canvasContext: ctx
              }, () => {
                console.log('brush-editor: Canvas初始化完成，准备绘制图片');
                
                // 如果有图片路径，立即加载图片
                if (this.data.tempImagePath) {
                  setTimeout(() => {
                    this.drawImageToCanvas(this.data.tempImagePath);
                  }, 100);
                }
                
                resolve(ctx);
              });
            });
        }, 300); // 延迟300ms确保DOM已渲染
      } catch (error) {
        console.error('Canvas initialization failed with error:', error);
        wx.showToast({
          title: '初始化画布失败',
          icon: 'none'
        });
        reject(error);
      }
    });
  },

  drawImageToCanvas: function(imagePath) {
    console.log('brush-editor: 开始绘制图片到Canvas:', imagePath);
    
    return new Promise((resolve, reject) => {
      if (!this.canvas || !this.ctx) {
        console.error('Canvas context not available');
        wx.showToast({
          title: 'Canvas未初始化',
          icon: 'none'
        });
        reject(new Error('Canvas context not available'));
        return;
      }

      const ctx = this.ctx;
      
      // 使用wx.getImageInfo获取图片信息
      wx.getImageInfo({
        src: imagePath,
        success: (res) => {
          console.log('brush-editor: 获取图片信息成功:', res);
          try {
            // 创建图片对象
            const img = this.canvas.createImage();
            img.onload = () => {
              console.log('brush-editor: 图片加载成功，准备绘制');
              
              // 清除canvas
              ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
              
              // 添加白色背景
              ctx.save();
              ctx.fillStyle = '#ffffff';
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
              
              console.log('brush-editor: 图片绘制参数:', {
                x, y, width, height,
                canvasWidth: this.data.canvasWidth,
                canvasHeight: this.data.canvasHeight,
                imageWidth: res.width,
                imageHeight: res.height
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
              console.log('brush-editor: 图片绘制完成');
              
              // 如果有选区，绘制选区
              if (this.data.selectedArea) {
                this.drawBrushPath();
              }
              
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
            console.log('brush-editor: 设置图片源:', imagePath);
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

  clearSelection: function() {
    this.setData({
      selectedArea: null,
      brushPoints: [],
      isDrawing: false,
      brushPath: null
    });
    this.drawImageToCanvas(this.data.tempImagePath);
  },

  redrawImage: function() {
    if (!this.data.tempImagePath) return;
    
    this.drawImageToCanvas(this.data.tempImagePath).then(() => {
      // 如果有选中区域，绘制选中轮廓
      if (this.data.selectedArea && this.brushPath) {
        this.drawBrushSelection();
      }
    });
  },

  onCanvasTouchStart: function(e) {
    if (!this.data.isSelecting) return;
    
    const touch = e.touches[0];
    const x = touch.x;
    const y = touch.y;
    
    // 开始一个新的画笔路径
    const ctx = this.data.canvasContext;
    if (!ctx) return;
    
    this.setData({
      isDrawing: true,
      brushPoints: [{x, y}],  // 记录第一个点
      selectedArea: null,     // 清除之前的选区
      brushPath: null
    });
    
    // 绘制起始点
    ctx.save();
    ctx.fillStyle = 'rgba(0, 150, 255, 0.6)';
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2); // 绘制一个小圆点作为起点
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // 保存当前路径的起始位置
    this.lastX = x;
    this.lastY = y;
  },

  onCanvasTouchMove: function(e) {
    if (!this.data.isDrawing) return;
    
    const touch = e.touches[0];
    const currentX = touch.x;
    const currentY = touch.y;
    
    // 更新笔画路径
    const ctx = this.data.canvasContext;
    if (!ctx) return;
    
    // 添加新的点到路径中
    const brushPoints = this.data.brushPoints.concat({x: currentX, y: currentY});
    this.setData({
      brushPoints: brushPoints
    });
    
    // 绘制线段
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    // 更新上一个点的位置
    this.lastX = currentX;
    this.lastY = currentY;
  },

  onCanvasTouchEnd: function(e) {
    if (!this.data.isDrawing) return;
    
    const ctx = this.data.canvasContext;
    if (!ctx) return;
    
    const touch = e.changedTouches[0];
    const endX = touch.x;
    const endY = touch.y;
    
    // 添加最后一个点
    let brushPoints = this.data.brushPoints.concat({x: endX, y: endY});
    
    // 如果有足够的点，闭合路径
    if (brushPoints.length >= 3) {
      // 闭合路径 - 连接到第一个点
      ctx.lineTo(brushPoints[0].x, brushPoints[0].y);
      ctx.closePath();
      ctx.stroke();
      
      // 计算围绕路径的包围盒
      const bounds = this.calculateBoundingBox(brushPoints);
      
      // 保存用户绘制的路径
      this.brushPath = brushPoints;
      
      // 保存选区信息
      this.setData({
        selectedArea: bounds, // 存储包围盒
        isDrawing: false
      });
      
      // 重绘图像和选区
      this.redrawImage();
    } else {
      // 点太少，无法形成有效区域
      wx.showToast({
        title: '请绘制更多点形成区域',
        icon: 'none'
      });
      
      // 清除已绘制的内容
      this.setData({
        isDrawing: false,
        brushPoints: [],
        selectedArea: null,
        brushPath: null
      });
      
      // 重新绘制原图像
      this.redrawImage();
    }
    
    ctx.restore();
  },

  // 计算包围点集的最小矩形
  calculateBoundingBox: function(points) {
    if (!points || points.length === 0) return null;
    
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      isBrushSelection: true
    };
  },

  // 绘制画笔选区
  drawBrushSelection: function() {
    if (!this.data.canvasContext || !this.brushPath) return;
    
    const ctx = this.data.canvasContext;
    ctx.save();
    
    // 绘制画笔路径
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(this.brushPath[0].x, this.brushPath[0].y);
    
    for (let i = 1; i < this.brushPath.length; i++) {
      ctx.lineTo(this.brushPath[i].x, this.brushPath[i].y);
    }
    
    // 闭合路径 - 连接到第一个点
    ctx.lineTo(this.brushPath[0].x, this.brushPath[0].y);
    
    ctx.stroke();
    ctx.restore();
  },

  // 完成编辑，进入下载页面
  finishEditing: function() {
    if (!this.data.selectedArea) {
      wx.showToast({
        title: '请先画出选择区域',
        icon: 'none'
      });
      return;
    }

    // 保存画布为临时图片
    const that = this;
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      success: function(res) {
        // 跳转到下载页面，传递图片路径和选区信息
        const selectedAreaString = JSON.stringify(that.data.selectedArea);
        const brushPathString = JSON.stringify(that.brushPath);
        
        wx.navigateTo({
          url: `/pages/download/index?imagePath=${encodeURIComponent(that.data.tempImagePath)}&selectedArea=${encodeURIComponent(selectedAreaString)}&brushPath=${encodeURIComponent(brushPathString)}`
        });
      },
      fail: function(error) {
        console.error('保存画布失败:', error);
        wx.showToast({
          title: '处理失败',
          icon: 'none'
        });
      }
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },

  generateAnimation: function() {
    // 检查选区
    if (!this.data.selectedArea || !this.brushPath) {
      wx.showToast({
        title: '请先画出选择区域',
        icon: 'none'
      });
      return;
    }
  
    // 创建帧序列
    const frameUrls = [];
    const numFrames = 20; // 增加帧数以获得更流畅的效果
    
    wx.showLoading({
      title: '生成帧序列...',
      mask: true
    });
    
    // 生成帧序列的函数
    const generateFrames = async () => {
      try {
        // 顺序生成帧，避免并行处理时的内存压力
        const validFrames = [];
        
        for (let i = 0; i < numFrames; i++) {
          const frame = await this.generateFrame(i, numFrames);
          if (frame) {
            validFrames.push(frame);
            // 更新进度
            if (i % 3 === 0) {
              wx.showLoading({
                title: `生成中 ${Math.floor((i + 1) / numFrames * 100)}%`,
                mask: true
              });
            }
          }
        }
        
        if (validFrames.length === 0) {
          wx.hideLoading();
          wx.showToast({
            title: '生成帧序列失败',
            icon: 'none'
          });
          return;
        }
        
        console.log('成功生成帧序列:', validFrames.length, '帧');
        
        // 打包帧数据
        const frameData = {
          frameUrls: validFrames,
          frameCount: validFrames.length,
          duration: validFrames.length * 100 // 每帧100ms，确保流畅的动画效果
        };
        
        // 使用双重编码确保JSON数据安全传递
        const encodedData = encodeURIComponent(JSON.stringify(frameData));
        
        wx.hideLoading();
        
        // 直接跳转到动画页面，不再调用云函数
        wx.navigateTo({
          url: `/pages/animation/animation?frameData=${encodedData}`
        });
      } catch (error) {
        wx.hideLoading();
        console.error('生成帧序列失败:', error);
        wx.showToast({
          title: '生成帧序列失败',
          icon: 'none'
        });
      }
    };
    
    // 开始生成帧
    generateFrames();
  },

  // 为动画生成单个帧
  generateFrame: function(frameIndex, totalFrames) {
    return new Promise((resolve, reject) => {
      try {
        // 获取当前画布内容
        const ctx = this.data.canvasContext;
        if (!ctx) {
          console.error('画布上下文未初始化');
          reject(new Error('画布上下文未初始化'));
          return;
        }
        
        // 计算当前帧的效果参数 - 使用平滑的进度变化
        const progress = frameIndex / (totalFrames - 1);
        
        // 使用正弦函数创建循环变化
        const cyclePosition = Math.sin(progress * Math.PI * 2);
        const normProgress = (cyclePosition + 1) / 2; // 归一化到0-1范围
        
        // 设计更自然的扭曲强度变化
        const distortionStrength = 3 + Math.sin(progress * Math.PI * 2) * 2.5;
        
        // 清除画布
        ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
        
        // 加载并绘制原始图像
        return new Promise((resolveImg, rejectImg) => {
          const img = this.canvas.createImage();
          
          img.onload = () => {
            // 绘制背景图
            if (this.imageInfo) {
              ctx.drawImage(
                img,
                this.imageInfo.x, this.imageInfo.y, 
                this.imageInfo.width, 
                this.imageInfo.height
              );
              
              // 应用特效
              if (this.brushPath && this.brushPath.length > 0) {
                // 在刷子路径上应用变形/扭曲效果
                this.applyEffect(this.brushPath, distortionStrength, normProgress);
              }
              
              // 将画布内容转为临时文件
              wx.canvasToTempFilePath({
                canvas: this.canvas,
                fileType: 'png',
                destWidth: this.data.canvasWidth * 2,
                destHeight: this.data.canvasHeight * 2,
                success: (res) => {
                  resolve(res.tempFilePath);
                },
                fail: (err) => {
                  console.error(`帧 ${frameIndex} 生成失败:`, err);
                  resolve(null);
                }
              });
            } else {
              console.error('imageInfo不存在');
              resolve(null);
            }
          };
          
          img.onerror = (err) => {
            console.error('加载图片失败:', err);
            resolve(null);
          };
          
          img.src = this.data.tempImagePath;
        });
      } catch (error) {
        console.error(`生成帧 ${frameIndex} 时出错:`, error);
        resolve(null);
      }
    });
  },
  
  // 应用特效到画布上指定的路径
  applyEffect: function(path, strength, progress) {
    if (!path || path.length < 2 || !this.data.canvasContext) return;
    
    const ctx = this.data.canvasContext;
    
    // 保存画布状态
    ctx.save();
    
    try {
      // 创建并应用裁剪路径
      this.createClipPath(ctx, path);
      
      // 计算选区中心和边界
      const bounds = this.calculateBoundingBox(path);
      const centerX = bounds.x + bounds.width/2;
      const centerY = bounds.y + bounds.height/2;
      
      // 应用扭曲效果参数
      const maxAmplitude = strength * 2.5; // 最大变形幅度
      const frequency = 0.08; // 波纹频率
      const phase = progress * Math.PI * 2; // 相位变化
      
      // 使用更精细的网格进行变形
      const gridSize = 4; // 更小的网格尺寸提高效果质量
      
      // 创建临时画布，用于扭曲处理
      const tempCanvas = wx.createOffscreenCanvas({
        type: '2d',
        width: this.data.canvasWidth,
        height: this.data.canvasHeight
      });
      
      const tempCtx = tempCanvas.getContext('2d');
      
      // 将当前画布内容复制到临时画布
      tempCtx.drawImage(
        this.canvas,
        0, 0, this.data.canvasWidth, this.data.canvasHeight
      );
      
      // 清除原画布选区内容，准备绘制扭曲效果
      ctx.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // 遍历选区内的每个小网格进行扭曲变形处理
      for (let y = bounds.y; y < bounds.y + bounds.height; y += gridSize) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x += gridSize) {
          // 计算网格中心到选区中心的距离和角度
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx*dx + dy*dy);
          const angle = Math.atan2(dy, dx);
          
          // 计算径向扭曲变形
          const radialFactor = Math.max(0, 1 - distance/(bounds.width/2));
          
          // 计算扭曲偏移量
          let distortionX = Math.sin(distance * frequency + phase + angle) * maxAmplitude * radialFactor;
          let distortionY = Math.cos(distance * frequency + phase - angle) * maxAmplitude * radialFactor;
          
          // 距离边缘处减少扭曲量，防止边缘撕裂
          const edgeFactor = this.calculateEdgeFactor(x, y, path);
          distortionX *= edgeFactor;
          distortionY *= edgeFactor;
          
          // 应用扭曲变形，从临时画布采样并绘制到原画布
          ctx.drawImage(
            tempCanvas,
            x, y, gridSize, gridSize, // 源矩形
            x + distortionX, y + distortionY, gridSize, gridSize // 目标矩形，带扭曲偏移
          );
        }
      }
      
      // 添加边缘高光，增强水波效果
      this.addLiquidEdgeEffect(ctx, path, progress);
      
    } catch (error) {
      console.error('应用扭曲效果失败:', error);
    } finally {
      // 恢复画布状态
      ctx.restore();
    }
  },
  
  // 创建裁剪路径
  createClipPath: function(ctx, path) {
    if (!path || path.length < 3) return;
    
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    
    ctx.closePath();
    ctx.clip();
  },
  
  // 计算点到路径边缘的因子 (0-1), 越靠近边缘值越小
  calculateEdgeFactor: function(x, y, path) {
    if (!path || path.length < 3) return 1.0;
    
    try {
      // 检查点到所有边的最小距离
      let minDistance = Number.MAX_VALUE;
      
      for (let i = 0; i < path.length; i++) {
        const p1 = path[i];
        const p2 = path[(i + 1) % path.length];
        
        // 计算点到线段的距离
        const distance = this.distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        minDistance = Math.min(minDistance, distance);
      }
      
      // 边缘检测阈值 - 使其与线宽相关
      const edgeThreshold = 12;
      
      // 软化边缘过渡 - 使用平滑的过渡函数
      const normalizedDist = Math.min(1, minDistance / edgeThreshold);
      return Math.sin(normalizedDist * Math.PI/2); // 使用正弦函数创造更平滑的过渡
    } catch (error) {
      console.error('边缘因子计算失败:', error);
      return 1.0; // 出错时返回安全值
    }
  },
  
  // 计算点到线段的距离
  distanceToSegment: function(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  },
  
  // 添加液体边缘效果
  addLiquidEdgeEffect: function(ctx, path, progress) {
    if (!path || path.length < 3) return;
    
    // 设置边缘效果的样式
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25;
    
    // 绘制内发光效果
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    
    ctx.closePath();
    
    // 创建渐变
    const bounds = this.calculateBoundingBox(path);
    const centerX = bounds.x + bounds.width/2;
    const centerY = bounds.y + bounds.height/2;
    
    try {
      // 创建径向渐变
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,                    // 内圆
        centerX, centerY, bounds.width/2        // 外圆
      );
      
      // 动态变化的高光颜色
      const baseHue = 190; // 蓝色基调
      const hue1 = (baseHue + progress * 30) % 360;
      const hue2 = (baseHue + 30 + progress * 30) % 360;
      
      // 内部较亮
      gradient.addColorStop(0, `hsla(${hue1}, 90%, 70%, 0.4)`);
      // 中间偏暗
      gradient.addColorStop(0.6, `hsla(${hue2}, 85%, 60%, 0.1)`);
      // 边缘几乎透明
      gradient.addColorStop(1, `hsla(${hue1}, 80%, 50%, 0.05)`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // 添加边缘高光线
      ctx.strokeStyle = `hsla(${hue1}, 90%, 75%, 0.3)`;
      ctx.lineWidth = 1.0;
      ctx.stroke();
      
      // 绘制水波纹小点
      this.drawWaterDroplets(ctx, path, bounds, progress);
      
    } catch (error) {
      console.error('创建渐变失败:', error);
      // 降级方案
      ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
      ctx.fill();
    }
  },
  
  // 绘制水波纹小点，增强液体感
  drawWaterDroplets: function(ctx, path, bounds, progress) {
    const dropletCount = 5;
    const radius = 3;
    
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    
    // 创建一个裁剪区域，确保小点只出现在路径内部
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    
    ctx.closePath();
    ctx.clip();
    
    // 在路径内随机位置绘制小水滴
    const centerX = bounds.x + bounds.width/2;
    const centerY = bounds.y + bounds.height/2;
    
    for (let i = 0; i < dropletCount; i++) {
      // 使用正弦余弦函数计算位置，使小点在区域内移动
      const angle = (i / dropletCount) * Math.PI * 2;
      const distance = bounds.width * 0.3 * Math.random();
      
      const dropX = centerX + Math.cos(angle + progress * Math.PI * 2) * distance;
      const dropY = centerY + Math.sin(angle + progress * Math.PI * 2) * distance;
      
      // 只有通过边缘检测的水滴才会被绘制
      if (this.isPointInPath(dropX, dropY, path)) {
        // 绘制小水滴
        const size = radius * (0.5 + Math.random() * 0.5);
        ctx.beginPath();
        ctx.arc(dropX, dropY, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  },
  
  // 检查点是否在路径内
  isPointInPath: function(x, y, path) {
    // 射线检测算法
    let inside = false;
    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
      const xi = path[i].x, yi = path[i].y;
      const xj = path[j].x, yj = path[j].y;
      
      const intersect = ((yi > y) != (yj > y)) && 
                         (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },
}); 