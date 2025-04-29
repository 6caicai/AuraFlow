const fs = require('fs');

// 非常简单的PNG图标数据 - 纯色矩形
function createPNG(color, size) {
  // PNG文件头
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
  ]);
  
  // 尺寸 (32x32)
  const width = Buffer.alloc(4);
  width.writeUInt32BE(size, 0);
  
  const height = Buffer.alloc(4);
  height.writeUInt32BE(size, 0);
  
  // 8位深度, 6=带alpha的RGB
  const rest = Buffer.from([
    0x08, 0x06, 0x00, 0x00, 0x00
  ]);
  
  // CRC校验 (固定值)
  const crc = Buffer.from([0xC0, 0x20, 0x0E, 0xC8]);
  
  // IDAT块头
  const idatHeader = Buffer.from([
    0x00, 0x00, 0x00, 0x15, 0x49, 0x44, 0x41, 0x54
  ]);
  
  // 压缩的图像数据 (32x32白色矩形)
  const colorValues = [
    color === 'blue' ? 24 : (color === 'black' ? 0 : 128),
    color === 'blue' ? 144 : (color === 'black' ? 0 : 128),
    color === 'blue' ? 255 : (color === 'black' ? 0 : 128),
    255 // Alpha通道
  ];
  
  // 非常简单的压缩数据 (无压缩)
  const compressedData = Buffer.from([
    0x78, 0x9C, 0x63, 0x60, 0x60, 0x60,
    colorValues[0], colorValues[1], colorValues[2], colorValues[3],
    0x00, 0x00, 0x00, 0xFF, 0xFF
  ]);
  
  // CRC校验 (固定值)
  const idatCrc = Buffer.from([0x1C, 0x56, 0x19, 0x57]);
  
  // IEND块
  const iend = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  // 拼接所有部分
  return Buffer.concat([
    header, width, height, rest, crc,
    idatHeader, compressedData, idatCrc,
    iend
  ]);
}

// 创建4个图标文件
fs.writeFileSync('tab-home.png', createPNG('black', 32));
fs.writeFileSync('tab-home-active.png', createPNG('blue', 32));
fs.writeFileSync('tab-user.png', createPNG('black', 32));
fs.writeFileSync('tab-user-active.png', createPNG('blue', 32));

console.log('创建了简单的图标文件'); 