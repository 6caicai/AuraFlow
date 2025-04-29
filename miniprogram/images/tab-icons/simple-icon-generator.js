const fs = require('fs');
const { createCanvas } = require('canvas');

// 创建24x24的画布
const canvas = createCanvas(24, 24);
const ctx = canvas.getContext('2d');

// 生成图片图标
function generateImageIcon(selected) {
  // 清空画布
  ctx.clearRect(0, 0, 24, 24);
  
  // 设置颜色
  ctx.strokeStyle = selected ? '#07c160' : '#999999';
  
  // 画一个简单的方框
  ctx.beginPath();
  ctx.rect(4, 4, 16, 16);
  ctx.stroke();
  
  // 保存为PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(selected ? 'image-selected.png' : 'image.png', buffer);
}

// 生成用户图标
function generateUserIcon(selected) {
  // 清空画布
  ctx.clearRect(0, 0, 24, 24);
  
  // 设置颜色
  ctx.strokeStyle = selected ? '#07c160' : '#999999';
  
  // 画一个圆形
  ctx.beginPath();
  ctx.arc(12, 12, 8, 0, Math.PI * 2);
  ctx.stroke();
  
  // 保存为PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(selected ? 'user-selected.png' : 'user.png', buffer);
}

// 生成所有图标
generateImageIcon(false);
generateImageIcon(true);
generateUserIcon(false);
generateUserIcon(true);

console.log('Simple icons generated successfully!'); 