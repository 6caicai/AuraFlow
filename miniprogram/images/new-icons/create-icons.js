const fs = require('fs');
const { createCanvas } = require('canvas');

// 创建图片处理图标
function createImageIcon(selected = false) {
  const canvas = createCanvas(81, 81);
  const ctx = canvas.getContext('2d');
  
  // 清空画布
  ctx.clearRect(0, 0, 81, 81);
  
  // 设置颜色
  ctx.fillStyle = selected ? '#07c160' : '#999999';
  
  // 绘制简单图片图标
  ctx.beginPath();
  ctx.rect(15, 15, 51, 41);
  ctx.fillRect(15, 15, 51, 41);
  ctx.stroke();
  
  // 绘制底部线条
  ctx.beginPath();
  ctx.moveTo(25, 65);
  ctx.lineTo(56, 65);
  ctx.lineWidth = 3;
  ctx.stroke();
  
  return canvas.toBuffer();
}

// 创建用户图标
function createUserIcon(selected = false) {
  const canvas = createCanvas(81, 81);
  const ctx = canvas.getContext('2d');
  
  // 清空画布
  ctx.clearRect(0, 0, 81, 81);
  
  // 设置颜色
  ctx.fillStyle = selected ? '#07c160' : '#999999';
  ctx.strokeStyle = selected ? '#07c160' : '#999999';
  
  // 绘制头部圆形
  ctx.beginPath();
  ctx.arc(40, 30, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制身体
  ctx.beginPath();
  ctx.arc(40, 65, 20, Math.PI, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer();
}

// 保存图标
try {
  fs.writeFileSync('../image.png', createImageIcon(false));
  fs.writeFileSync('../image-selected.png', createImageIcon(true));
  fs.writeFileSync('../user.png', createUserIcon(false));
  fs.writeFileSync('../user-selected.png', createUserIcon(true));
  console.log('图标创建成功');
} catch (err) {
  console.error('创建图标失败:', err);
} 