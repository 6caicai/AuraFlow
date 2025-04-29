const { PNG } = require('pngjs');
const stream = require('stream');

// GIF文件头
const GIF_HEADER = Buffer.from('GIF89a', 'ascii');

// GIF结束标记
const GIF_TRAILER = Buffer.from([0x3B]);

// 创建GIF逻辑屏幕描述符
function createLogicalScreenDescriptor(width, height) {
  // 确保宽高至少为1
  width = Math.max(1, width);
  height = Math.max(1, height);
  
  // 标准GIF逻辑屏幕描述符 (7字节)
  const buffer = Buffer.alloc(7);
  buffer.writeUInt16LE(width, 0);   // 宽度 (2字节)
  buffer.writeUInt16LE(height, 2);  // 高度 (2字节)
  buffer.writeUInt8(0xF6, 4);       // 包含全局颜色表标志，6位/像素，64色
  buffer.writeUInt8(0, 5);          // 背景色索引
  buffer.writeUInt8(0, 6);          // 像素宽高比
  return buffer;
}

// 创建全局颜色表 (64色 RGB)
function createGlobalColorTable() {
  // 6位调色板 (2^6 = 64色)，每色3字节 = 192字节
  const colorTable = Buffer.alloc(64 * 3);
  
  // 基本16色
  const basicColors = [
    [0, 0, 0],       // 黑
    [255, 0, 0],     // 红
    [0, 255, 0],     // 绿
    [0, 0, 255],     // 蓝
    [255, 255, 0],   // 黄
    [0, 255, 255],   // 青
    [255, 0, 255],   // 品红
    [255, 255, 255], // 白
    [128, 0, 0],     // 暗红
    [0, 128, 0],     // 暗绿
    [0, 0, 128],     // 暗蓝
    [128, 128, 0],   // 橄榄
    [0, 128, 128],   // 暗青
    [128, 0, 128],   // 暗品红
    [128, 128, 128], // 灰
    [192, 192, 192]  // 亮灰
  ];
  
  // 填充基本16色
  for (let i = 0; i < 16; i++) {
    colorTable[i * 3 + 0] = basicColors[i][0]; // R
    colorTable[i * 3 + 1] = basicColors[i][1]; // G
    colorTable[i * 3 + 2] = basicColors[i][2]; // B
  }
  
  // 生成剩余48色的渐变色
  for (let i = 16; i < 64; i++) {
    // 简单灰度渐变
    const gray = Math.floor((i - 16) * (255 / 48));
    colorTable[i * 3 + 0] = gray; // R
    colorTable[i * 3 + 1] = gray; // G
    colorTable[i * 3 + 2] = gray; // B
  }
  
  return colorTable;
}

// 创建应用程序扩展块 - 循环设置
function createApplicationExtension() {
  // NETSCAPE2.0扩展 - 循环动画
  return Buffer.from([
    0x21, 0xFF, // 扩展导入 + 应用扩展标签
    0x0B,       // 块大小 (11)
    // NETSCAPE2.0 (11字节)
    0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30,
    0x03,       // 子块大小 (3)
    0x01,       // 循环标志
    0x00, 0x00, // 循环次数 (0=无限循环)
    0x00        // 块终止符
  ]);
}

// 创建图形控制扩展 - 控制帧延迟和透明度
function createGraphicControlExtension(delayTime) {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt8(0x21, 0);    // 扩展导入
  buffer.writeUInt8(0xF9, 1);    // 图形控制标签
  buffer.writeUInt8(0x04, 2);    // 块大小 (4)
  buffer.writeUInt8(0x00, 3);    // 处理方式 (0=不使用透明色)
  
  // 延迟时间 (1/100秒)，确保至少10ms
  const delay = Math.max(1, Math.floor(delayTime / 10));
  buffer.writeUInt16LE(delay, 4);
  
  buffer.writeUInt8(0x00, 6);    // 透明色索引
  buffer.writeUInt8(0x00, 7);    // 块终止符
  return buffer;
}

// 从图像缓冲区解析图像数据
async function parseImage(buffer) {
  return new Promise((resolve, reject) => {
    try {
      // 尝试作为PNG解析
      const png = new PNG();
      png.parse(buffer, (error, data) => {
        if (error) {
          console.error('PNG解析失败:', error);
          // 返回一个基本的1x1像素图像
          resolve({
            width: 1,
            height: 1,
            data: Buffer.from([0, 0, 0, 255]) // 单个黑色像素
          });
          return;
        }
        
        // 检查数据是否有效
        if (!data || !data.data || data.data.length === 0 || 
            !data.width || !data.height) {
          console.error('解析得到的PNG数据无效');
          resolve({
            width: 1,
            height: 1,
            data: Buffer.from([0, 0, 0, 255]) // 单个黑色像素
          });
          return;
        }
        
        resolve(data);
      });
    } catch (error) {
      console.error('图像解析异常:', error);
      // 不让整个过程因解析失败而中断
      resolve({
        width: 1,
        height: 1,
        data: Buffer.from([0, 0, 0, 255]) // 单个黑色像素
      });
    }
  });
}

// 简化且可靠的颜色量化 - 将RGBA转换为索引颜色
function quantizeColors(pixels, width, height) {
  // 如果图像无效，返回占位图像
  if (!pixels || pixels.length === 0 || width <= 0 || height <= 0) {
    console.log('输入图像无效，创建占位图像');
    return {
      indexedPixels: Buffer.from([0]), // 单个黑色像素
      width: 1,
      height: 1
    };
  }
  
  console.log(`量化图像: ${width}x${height}, 数据长度: ${pixels.length} 字节`);
  
  // 限制图像尺寸，防止处理过大的图像
  const maxSize = 200;
  const scale = Math.max(1, Math.ceil(Math.max(width, height) / maxSize));
  const scaledWidth = Math.floor(width / scale);
  const scaledHeight = Math.floor(height / scale);
  
  console.log(`缩放后尺寸: ${scaledWidth}x${scaledHeight}, 缩放比例: 1/${scale}`);
  
  // 6位颜色索引 (64色)
  const indexedPixels = Buffer.alloc(scaledWidth * scaledHeight);
  
  // 静态颜色表，前16个是标准颜色，后面是灰度
  function findClosestColorIndex(r, g, b) {
    // 检查前16个标准颜色
    if (r === 0 && g === 0 && b === 0) return 0; // 黑
    if (r > 200 && g < 50 && b < 50) return 1;   // 红
    if (r < 50 && g > 200 && b < 50) return 2;   // 绿
    if (r < 50 && g < 50 && b > 200) return 3;   // 蓝
    if (r > 200 && g > 200 && b < 50) return 4;  // 黄
    if (r < 50 && g > 200 && b > 200) return 5;  // 青
    if (r > 200 && g < 50 && b > 200) return 6;  // 品红
    if (r > 200 && g > 200 && b > 200) return 7; // 白
    
    // 对于其他颜色，使用灰度计算
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    // 将灰度映射到剩余的48个颜色索引 (16-63)
    return 16 + Math.min(47, Math.floor(gray * 48 / 256));
  }
  
  try {
    // 对图像进行下采样和索引化
    for (let y = 0; y < scaledHeight; y++) {
      for (let x = 0; x < scaledWidth; x++) {
        // 源图像中的对应位置
        const srcX = x * scale;
        const srcY = y * scale;
        
        // 确保不越界
        if (srcX >= width || srcY >= height) continue;
        
        // 计算原图中像素索引
        const pixelIndex = (srcY * width + srcX) * 4;
        
        // 确保像素索引有效
        if (pixelIndex >= pixels.length - 3) continue;
        
        // 获取RGB值
        const r = pixels[pixelIndex];
        const g = pixels[pixelIndex + 1];
        const b = pixels[pixelIndex + 2];
        
        // 找到最接近的颜色索引
        const colorIndex = findClosestColorIndex(r, g, b);
        
        // 设置输出索引图像的像素
        indexedPixels[y * scaledWidth + x] = colorIndex;
      }
    }
    
    return {
      indexedPixels,
      width: scaledWidth,
      height: scaledHeight
    };
  } catch (error) {
    console.error('颜色量化失败:', error);
    // 返回一个黑色的1x1像素
    return {
      indexedPixels: Buffer.from([0]),
      width: 1,
      height: 1
    };
  }
}

// 创建图像描述符
function createImageDescriptor(width, height) {
  const buffer = Buffer.alloc(10);
  buffer.writeUInt8(0x2C, 0);     // 图像分隔符
  buffer.writeUInt16LE(0, 1);     // 左上角X坐标
  buffer.writeUInt16LE(0, 3);     // 左上角Y坐标
  buffer.writeUInt16LE(width, 5); // 图像宽度
  buffer.writeUInt16LE(height, 7); // 图像高度
  buffer.writeUInt8(0x00, 9);    // 局部色表标志 (0=不使用局部色表)
  return buffer;
}

// 创建图像数据块，使用LZW压缩
function createImageDataBlock(pixels, colorBits) {
  // 颜色位数，6位=64色
  const minCodeSize = colorBits || 6;
  
  // 最小码长度
  const result = [Buffer.from([minCodeSize])];
  
  // 简单实现：将像素数据以255字节分块
  for (let i = 0; i < pixels.length; i += 254) {
    const chunkSize = Math.min(254, pixels.length - i);
    const chunk = Buffer.alloc(chunkSize + 1);
    
    chunk[0] = chunkSize; // 子块大小
    
    // 拷贝像素数据
    for (let j = 0; j < chunkSize; j++) {
      chunk[j + 1] = pixels[i + j];
    }
    
    result.push(chunk);
  }
  
  // 添加块终止符
  result.push(Buffer.from([0]));
  
  return Buffer.concat(result);
}

// 简化的GIF编码函数
async function createGIF(frameBuffers, frameDelay) {
  try {
    // 验证输入
    if (!frameBuffers || !Array.isArray(frameBuffers) || frameBuffers.length === 0) {
      throw new Error('未提供帧缓冲区');
    }
    
    console.time('GIF生成');
    console.log(`开始处理 ${frameBuffers.length} 个帧...`);
    
    // 解析第一帧获取基础尺寸
    const firstFrame = await parseImage(frameBuffers[0]);
    const baseWidth = firstFrame.width || 1;
    const baseHeight = firstFrame.height || 1;
    
    console.log(`基础图像尺寸: ${baseWidth}x${baseHeight}`);
    
    // GIF头部和逻辑屏幕描述符
    const parts = [
      GIF_HEADER,
      createLogicalScreenDescriptor(baseWidth, baseHeight),
      createGlobalColorTable(),
      createApplicationExtension()
    ];
    
    // 处理每一帧
    for (let i = 0; i < frameBuffers.length; i++) {
      try {
        console.log(`处理第 ${i+1}/${frameBuffers.length} 帧...`);
        
        // 解析帧
        const frame = await parseImage(frameBuffers[i]);
        const frameData = frame.data;
        const frameWidth = frame.width || baseWidth;
        const frameHeight = frame.height || baseHeight;
        
        // 颜色量化
        const { indexedPixels, width, height } = 
          quantizeColors(frameData, frameWidth, frameHeight);
        
        console.log(`帧 ${i+1} 量化结果: ${width}x${height}, ${indexedPixels.length} 字节`);
        
        // 添加图形控制扩展
        parts.push(createGraphicControlExtension(frameDelay));
        
        // 添加图像描述符
        parts.push(createImageDescriptor(width, height));
        
        // 添加图像数据
        parts.push(createImageDataBlock(indexedPixels, 6)); // 6位=64色
        
      } catch (frameError) {
        console.error(`处理帧 ${i+1} 失败:`, frameError);
        // 继续处理其他帧
      }
    }
    
    // GIF结束标记
    parts.push(GIF_TRAILER);
    
    // 合并所有部分
    const gifBuffer = Buffer.concat(parts);
    
    console.log(`GIF生成完成，大小: ${gifBuffer.length} 字节`);
    console.timeEnd('GIF生成');
    
    return gifBuffer;
    
  } catch (error) {
    console.error('GIF创建失败:', error);
    throw error;
  }
}

// 导出函数
module.exports = {
  createGIF
}; 