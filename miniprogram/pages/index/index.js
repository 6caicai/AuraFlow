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
    brushPoints: [],
    isDrawing: false,
    brushPath: null,
    isAnimating: false,
    animationFrame: null
  },

  // 添加配置常量
  // 边界平滑过渡的配置
  FEATHER_CONFIG: {
    // 羽化区域大小（画笔模式）
    brushFeatherSize: 10,
    // 羽化区域大小（矩形模式）
    rectFeatherSize: 12,
    // 外层羽化区域的透明度
    outerAlpha: 0.35,
    // 外层羽化区域的效果强度系数（相对于主区域）
    outerEffectRatio: 0.4
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
      
      // 清除画布，确保干净的开始
      ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
      
      // 使用wx.getImageInfo获取图片信息
      wx.getImageInfo({
        src: imagePath,
        success: (res) => {
          try {
            // 创建图片对象
            const img = this.canvas.createImage();
            img.onload = () => {
              // 计算图片绘制尺寸，固定使用宽度为基准的比例，确保一致性
              const canvasRatio = this.data.canvasWidth / this.data.canvasHeight;
              const imageRatio = res.width / res.height;
              
              let width, height, x, y;
              
              // 使用统一的规则计算图片显示尺寸
              if (imageRatio > canvasRatio) {
                // 图片更宽，以宽度为基准
                width = this.data.canvasWidth * 0.9; // 留出一些边距
                height = width / imageRatio;
                x = (this.data.canvasWidth - width) / 2;
                y = (this.data.canvasHeight - height) / 2;
              } else {
                // 图片更高，以高度为基准
                height = this.data.canvasHeight * 0.9; // 留出一些边距
                width = height * imageRatio;
                x = (this.data.canvasWidth - width) / 2;
                y = (this.data.canvasHeight - height) / 2;
              }
              
              // 保存图片信息
              this.imageInfo = {
                x, y, width, height,
                originalWidth: res.width,
                originalHeight: res.height,
                scale: width / res.width // 保存实际缩放比例
              };
              
              // 缓存图像对象以供后续使用
              if (!this._imgObj) {
                this._imgObj = img;
              }
              
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
    const isStarting = !this.data.isSelecting;
    
    this.setData({
      isSelecting: isStarting,
      brushPoints: [],
      isDrawing: false
    });
    
    if (isStarting) {
      // 正在开始绘制模式，确保画布已正确初始化
      setTimeout(() => {
        // 首先重绘一次图像，确保画布状态正确
        this.redrawImage().then(() => {
          console.log('Canvas ready for brush selection');
        });
      }, 50);
    } else if (this.imageInfo) {
      // 如果关闭选择模式，重绘图像
      this.redrawImage();
    }
  },

  clearSelection: function() {
    this.setData({
      selectedArea: null,
      isSelecting: false,
      brushPoints: [],
      isDrawing: false,
      brushPath: null
    });
    this.redrawImage();
  },

  redrawImage: function() {
    if (!this.data.tempImagePath) return;
    
    return new Promise((resolve, reject) => {
      const ctx = this.data.canvasContext;
      if (!ctx) {
        resolve();
        return;
      }
      
      // 清除画布
      ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
      
      // 从缓存创建图像对象
      if (!this._imgObj && this.canvas) {
        this._imgObj = this.canvas.createImage();
        this._imgObj.src = this.data.tempImagePath;
        this._imgObj.onload = () => {
          this._redrawImageCore(ctx);
          resolve();
        };
        this._imgObj.onerror = (err) => {
          console.error('Failed to load image:', err);
          resolve();
        };
      } else if (this._imgObj) {
        this._redrawImageCore(ctx);
        resolve();
      } else {
        // 回退到原始方法
        this.drawImageToCanvas(this.data.tempImagePath).then(() => {
          // 如果有选中区域，绘制选中区域
          if (this.data.selectedArea && this.data.brushPath) {
            this.drawBrushSelection();
          }
          resolve();
        }).catch(reject);
      }
    });
  },

  _redrawImageCore: function(ctx) {
    if (!this._imgObj || !this.imageInfo) return;
    
    const { x, y, width, height } = this.imageInfo;
    
    // 清除画布
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制图片，确保使用保存的精确尺寸
    ctx.drawImage(this._imgObj, x, y, width, height);
    
    // 如果有选中区域，绘制选中区域
    if (this.data.selectedArea && this.data.brushPath) {
      this.drawBrushSelection();
    }
  },

  drawBrushSelection: function() {
    if (!this.data.canvasContext || !this.data.brushPath || this.data.brushPath.length < 3) return;
    
    const ctx = this.data.canvasContext;
    ctx.save();
    
    // 绘制路径
    ctx.beginPath();
    ctx.moveTo(this.data.brushPath[0].x, this.data.brushPath[0].y);
    
    for (let i = 1; i < this.data.brushPath.length; i++) {
      ctx.lineTo(this.data.brushPath[i].x, this.data.brushPath[i].y);
    }
    
    // 闭合路径
    ctx.closePath();
    
    // 设置路径样式
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    // 添加明显的边框和半透明填充
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 添加半透明填充效果
    ctx.fillStyle = 'rgba(0, 150, 255, 0.12)';
    ctx.fill();
    
    ctx.restore();
  },

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

  onCanvasTouchStart: function(e) {
    if (!this.data.isSelecting) return;
    
    const touch = e.touches[0];
    const x = touch.x;
    const y = touch.y;
    
    // 检查点击位置是否在图像范围内
    if (this.imageInfo) {
      const { x: imgX, y: imgY, width: imgWidth, height: imgHeight } = this.imageInfo;
      
      // 只有当点击在图像区域内时才开始绘制
      if (x >= imgX && x <= imgX + imgWidth && y >= imgY && y <= imgY + imgHeight) {
        // 开始一个新的画笔路径
        const ctx = this.data.canvasContext;
        if (!ctx) return;
        
        this.setData({
          isDrawing: true,
          brushPoints: [{x, y}],
          selectedArea: null,
          brushPath: null
        });
        
        // 起始点直接绘制，不重新加载图片
        ctx.save();
        ctx.fillStyle = 'rgba(0, 150, 255, 0.6)';
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2); // 起点圆点
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        // 保存当前路径的起始位置
        this.lastX = x;
        this.lastY = y;
      }
    }
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
    
    // 清除之前的绘制内容，重绘整个图像（避免辐条状效果）
    if (brushPoints.length > 3 && brushPoints.length % 5 === 0) { // 每5个点重绘一次背景图减少性能损耗
      this.redrawImage();
      
      // 重绘当前路径
      ctx.save();
      ctx.fillStyle = 'rgba(0, 150, 255, 0.6)';
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 重新绘制整条路径
      ctx.beginPath();
      ctx.moveTo(brushPoints[0].x, brushPoints[0].y);
      for (let i = 1; i < brushPoints.length; i++) {
        ctx.lineTo(brushPoints[i].x, brushPoints[i].y);
      }
      ctx.stroke();
      
      // 在每个点上绘制小圆点增强视觉反馈
      for (let i = 0; i < brushPoints.length; i++) {
        ctx.beginPath();
        ctx.arc(brushPoints[i].x, brushPoints[i].y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    } else {
      // 正常绘制线段
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      
      // 在当前点上绘制小圆点
      ctx.beginPath();
      ctx.arc(currentX, currentY, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    
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
    
    // 如果距离第一个点足够近，自动吸附到第一个点
    const startPoint = brushPoints[0];
    const distance = Math.sqrt(
      Math.pow(endX - startPoint.x, 2) + 
      Math.pow(endY - startPoint.y, 2)
    );
    
    // 如果距离第一个点很近（小于20像素），自动吸附到第一个点
    if (distance < 20 && brushPoints.length > 5) {
      brushPoints[brushPoints.length - 1] = { 
        x: startPoint.x, 
        y: startPoint.y 
      };
    }
    
    // 如果有足够的点，闭合路径
    if (brushPoints.length >= 3) {
      // 将状态更新前先重置一些绘图状态
      ctx.restore();
      
      // 保存用户绘制的路径
      this.brushPath = brushPoints;
      
      // 计算围绕路径的包围盒
      const bounds = this.calculateBoundingBox(brushPoints);
      
      // 保存选区信息
      this.setData({
        selectedArea: bounds, // 存储包围盒
        isDrawing: false,
        isSelecting: false, // 自动退出绘制模式
        brushPath: brushPoints // 确保将路径保存到数据状态中
      });
      
      // 重新绘制整个画布，确保正确的图层顺序
      setTimeout(() => {
        this.redrawImage().then(() => {
          // 完成后显示成功提示
          wx.showToast({
            title: '区域绘制完成',
            icon: 'success',
            duration: 1000
          });
        });
      }, 100);
    } else {
      // 点太少，无法形成有效区域
      ctx.restore();
      
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
  },

  drawSelectionBox: function(area) {
    if (!this.data.canvasContext) return;
    if (area.isBrushSelection && this.data.brushPath) {
      this.drawBrushSelection();
      return;
    }
    
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
    
    // 检查是否有选中区域
    if (!this.data.selectedArea) {
      wx.showToast({
        title: '请先画出要处理的区域',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否有有效的画笔路径
    if (this.data.selectedArea.isBrushSelection && (!this.brushPath || this.brushPath.length < 3)) {
      wx.showToast({
        title: '画笔区域无效，请重新绘制',
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
    const strength = this.data.distortionStrength * 0.25; // 减小扭曲幅度
    
    // 获取选区范围，如果没有选择则使用整个图像
    const area = this.data.selectedArea || { x, y, width, height };
    
    // 相位计算
    const phase = this.animationPosition;
    
    // 重新加载图片并绘制
    if (this._imgObj) {
      // 使用已缓存的图像对象
      // 清除画布
      ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
      
      // 绘制原始图像（背景）
      ctx.drawImage(
        this._imgObj,
        0, 0,
        this._imgObj.width, this._imgObj.height,
        x, y,
        width, height
      );
      
      // 如果有选中区域和画笔路径，应用特效
      if (this.data.selectedArea && this.data.brushPath && this.data.brushPath.length >= 3) {
        // 计算原始图片上对应的区域
        const sourceX = (area.x - x) / width * this._imgObj.width;
        const sourceY = (area.y - y) / height * this._imgObj.height;
        const sourceWidth = area.width / width * this._imgObj.width;
        const sourceHeight = area.height / height * this._imgObj.height;
        
        // 创建离屏 canvas 来处理只对画笔区域应用特效
        const maxAmplitude = strength * 2;
        const upperOffset = Math.sin(phase) * maxAmplitude;
        const lowerOffset = Math.sin(phase + Math.PI) * maxAmplitude;
        
        // 使用多层羽化技术创建自然过渡
        
        // 第0步：优先绘制柔和的全局效果增强选区辨识度
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.data.brushPath[0].x, this.data.brushPath[0].y);
        for (let i = 1; i < this.data.brushPath.length; i++) {
          ctx.lineTo(this.data.brushPath[i].x, this.data.brushPath[i].y);
        }
        ctx.closePath();
        
        // 创建渐变
        const gradientCenter = {
          x: area.x + area.width / 2,
          y: area.y + area.height / 2
        };
        
        // 创建从中心到边缘的径向渐变
        const radius = Math.max(area.width, area.height) * 0.7;
        const areaGradient = ctx.createRadialGradient(
          gradientCenter.x, gradientCenter.y, 0,
          gradientCenter.x, gradientCenter.y, radius
        );
        
        // 渐变填充的颜色配置 - 极为轻微的颜色增强
        areaGradient.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
        areaGradient.addColorStop(0.5, 'rgba(100, 180, 255, 0.01)');
        areaGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
        
        ctx.fillStyle = areaGradient;
        ctx.fill();
        ctx.restore();
        
        // 第1步：创建略大一点的剪切区域用于羽化效果
        const featherSize = this.FEATHER_CONFIG.brushFeatherSize; // 羽化大小
        
        // 应用剪切路径，确保只对画笔区域进行处理
        ctx.save();
        
        // 主要选区 - 内部区域
        ctx.beginPath();
        ctx.moveTo(this.data.brushPath[0].x, this.data.brushPath[0].y);
        for (let i = 1; i < this.data.brushPath.length; i++) {
          ctx.lineTo(this.data.brushPath[i].x, this.data.brushPath[i].y);
        }
        ctx.closePath();
        
        // 保存原始路径副本用于后续羽化
        const pathPoints = this.data.brushPath.slice();
        
        ctx.clip();
        
        // 清除内部区域
        ctx.clearRect(area.x - 10, area.y - 10, area.width + 20, area.height + 20);
        
        // 第一层 - 主要移动效果
        ctx.globalAlpha = 0.85;
        ctx.drawImage(
          this._imgObj, 
          sourceX, sourceY, 
          sourceWidth, sourceHeight,
          area.x + upperOffset, area.y, 
          area.width, area.height
        );
        
        // 第二层 - 使用不同的移动方向和更柔和的混合模式
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(
          this._imgObj, 
          sourceX, sourceY, 
          sourceWidth, sourceHeight,
          area.x + lowerOffset, area.y, 
          area.width, area.height
        );
        
        ctx.restore();
        
        // 第2步：创建边缘羽化效果
        ctx.save();
        
        // 羽化区域 - 外部边缘略大的区域
        ctx.beginPath();
        
        // 计算膨胀的路径
        const expandedPath = this.expandPath(pathPoints, featherSize);
        ctx.moveTo(expandedPath[0].x, expandedPath[0].y);
        for (let i = 1; i < expandedPath.length; i++) {
          ctx.lineTo(expandedPath[i].x, expandedPath[i].y);
        }
        ctx.closePath();
        
        // 创建第二个剪切路径
        ctx.clip();
        
        // 创建原始区域的反向剪切
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length; i++) {
          ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        ctx.closePath();
        
        // 使用 "evenodd" 规则来获取两个路径之间的环形区域
        ctx.clip("evenodd");
        
        // 在这个环形区域中绘制减弱的效果，形成过渡
        ctx.globalAlpha = this.FEATHER_CONFIG.outerAlpha; // 降低不透明度
        ctx.globalCompositeOperation = 'source-over';
        
        // 绘制略微偏移的图像，形成柔和过渡
        const reducedOffset = upperOffset * this.FEATHER_CONFIG.outerEffectRatio; // 减弱的偏移
        ctx.drawImage(
          this._imgObj, 
          sourceX, sourceY, 
          sourceWidth, sourceHeight,
          area.x + reducedOffset, area.y, 
          area.width, area.height
        );
        
        ctx.restore();
      } else {
        // 回退到原始实现
        this._simpleMoveEffectFallback(phase, strength, area, x, y, width, height);
      }
      return;
    }
    
    // 如果没有缓存的图像对象，回退到原始实现
    wx.getImageInfo({
      src: this.data.tempImagePath,
      success: (res) => {
        // 创建并缓存图像对象
        if (!this._imgObj && this.canvas) {
          this._imgObj = this.canvas.createImage();
          this._imgObj.onload = () => {
            this.simpleMoveEffect(); // 再次调用此函数完成动画
          };
          this._imgObj.src = this.data.tempImagePath;
          return;
        }
        
        const img = this.canvas.createImage();
        img.onload = () => {
          this._simpleMoveEffectFallback(phase, strength, area, x, y, width, height, img, res);
        };
        img.src = this.data.tempImagePath;
      }
    });
  },
  
  // 添加辅助函数：膨胀路径以创建羽化效果
  expandPath: function(points, amount) {
    if (!points || points.length < 3) return points;
    
    const expanded = [];
    const centerX = this.data.selectedArea.x + this.data.selectedArea.width / 2;
    const centerY = this.data.selectedArea.y + this.data.selectedArea.height / 2;
    
    // 从中心点向外扩展
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const dx = pt.x - centerX;
      const dy = pt.y - centerY;
      
      // 计算从中心点到当前点的距离
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 如果距离为0，则无法确定方向，直接使用原点
      if (distance === 0) {
        expanded.push({x: pt.x, y: pt.y});
        continue;
      }
      
      // 计算单位向量
      const unitX = dx / distance;
      const unitY = dy / distance;
      
      // 向外扩展
      expanded.push({
        x: pt.x + unitX * amount,
        y: pt.y + unitY * amount
      });
    }
    
    return expanded;
  },
  
  // 辅助函数：原来的动画效果实现
  _simpleMoveEffectFallback: function(phase, strength, area, x, y, width, height, img, imgInfo) {
    if (!img && !this._imgObj) return;
    
    const ctx = this.data.canvasContext;
    if (!ctx) return;
    
    const useImg = img || this._imgObj;
    const imgWidth = imgInfo ? imgInfo.width : useImg.width;
    const imgHeight = imgInfo ? imgInfo.height : useImg.height;
    
    // 清除画布
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制原始图像（背景）
    ctx.drawImage(useImg, 0, 0, imgWidth, imgHeight, x, y, width, height);
    
    // 处理选区
    if (this.data.selectedArea) {
      // 计算原始图片上对应的区域
      const sourceX = (area.x - x) / width * imgWidth;
      const sourceY = (area.y - y) / height * imgHeight;
      const sourceWidth = area.width / width * imgWidth;
      const sourceHeight = area.height / height * imgHeight;
      
      // 应用两层图像效果，但减小扭曲幅度
      const maxAmplitude = strength * 2;
      
      // 创建过渡效果
      const featherAmount = this.FEATHER_CONFIG.rectFeatherSize; // 过渡区域大小
      
      // 第一层 - 带有过渡的主区域
      const upperOffset = Math.sin(phase) * maxAmplitude;
      
      // 首先绘制带有羽化效果的区域
      ctx.save();
      
      // 创建一个矩形路径，稍大于选区
      ctx.beginPath();
      ctx.rect(
        area.x - featherAmount, 
        area.y - featherAmount, 
        area.width + featherAmount * 2, 
        area.height + featherAmount * 2
      );
      ctx.closePath();
      ctx.clip();
      
      // 根据两个区域之间的差异，绘制一个柔和的渐变遮罩
      const gradient = ctx.createLinearGradient(
        area.x - featherAmount, area.y,
        area.x + area.width + featherAmount, area.y
      );
      
      // 使用渐变混合原始图像与效果区域
      ctx.globalAlpha = this.FEATHER_CONFIG.outerAlpha;
      ctx.drawImage(
        useImg, 
        sourceX - (featherAmount / width * imgWidth), 
        sourceY - (featherAmount / height * imgHeight), 
        sourceWidth + (featherAmount * 2 / width * imgWidth), 
        sourceHeight + (featherAmount * 2 / height * imgHeight),
        area.x - featherAmount + upperOffset * this.FEATHER_CONFIG.outerEffectRatio, 
        area.y - featherAmount, 
        area.width + featherAmount * 2, 
        area.height + featherAmount * 2
      );
      
      ctx.restore();
      
      // 第一层 - 主要移动效果
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.width, area.height);
      ctx.clip();
      
      ctx.globalAlpha = 0.85;
      ctx.drawImage(
        useImg, 
        sourceX, sourceY, 
        sourceWidth, sourceHeight,
        area.x + upperOffset, area.y, 
        area.width, area.height
      );
      
      // 第二层 - 使用不同的移动方向和更柔和的混合模式
      const lowerOffset = Math.sin(phase + Math.PI) * maxAmplitude;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.7;
      ctx.drawImage(
        useImg, 
        sourceX, sourceY, 
        sourceWidth, sourceHeight,
        area.x + lowerOffset, area.y, 
        area.width, area.height
      );
      
      ctx.restore();
    } else {
      // 如果没有选择区域，对整个图像应用效果
      // 清除画布
      ctx.clearRect(x, y, width, height);
      
      // 绘制第一层
      const upperOffset = Math.sin(phase) * strength * 2;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(
        useImg, 
        0, 0, 
        imgWidth, imgHeight,
        x + upperOffset, y, 
        width, height
      );
      
      // 绘制第二层，使用更柔和的混合
      const lowerOffset = Math.sin(phase + Math.PI) * strength * 2;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.7;
      ctx.drawImage(
        useImg, 
        0, 0, 
        imgWidth, imgHeight,
        x + lowerOffset, y, 
        width, height
      );
      
      ctx.restore();
    }
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
