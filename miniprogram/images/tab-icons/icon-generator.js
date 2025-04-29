// 这个脚本用于生成简单的SVG图标
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// 图片图标
const imageSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="none"/>
  <rect x="4" y="4" width="24" height="24" rx="2" stroke="#999999" stroke-width="2" fill="none"/>
  <polygon points="10,20 14,16 16,18 22,12 22,20" stroke="#999999" stroke-width="2" fill="none"/>
  <circle cx="11" cy="11" r="2" fill="#999999"/>
</svg>
`;

// 选中状态的图片图标 
const imageSelectedSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="none"/>
  <rect x="4" y="4" width="24" height="24" rx="2" stroke="#07c160" stroke-width="2" fill="none"/>
  <polygon points="10,20 14,16 16,18 22,12 22,20" stroke="#07c160" stroke-width="2" fill="none"/>
  <circle cx="11" cy="11" r="2" fill="#07c160"/>
</svg>
`;

// 用户图标
const userSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="none"/>
  <circle cx="16" cy="11" r="5" stroke="#999999" stroke-width="2" fill="none"/>
  <path d="M 6,25 C 6,21 10,17 16,17 C 22,17 26,21 26,25" stroke="#999999" stroke-width="2" fill="none"/>
</svg>
`;

// 选中状态的用户图标
const userSelectedSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="none"/>
  <circle cx="16" cy="11" r="5" stroke="#07c160" stroke-width="2" fill="none"/>
  <path d="M 6,25 C 6,21 10,17 16,17 C 22,17 26,21 26,25" stroke="#07c160" stroke-width="2" fill="none"/>
</svg>
`;

// 图标尺寸
const width = 24;
const height = 24;

// 创建画布
function createIconCanvas() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  return { canvas, ctx };
}

// 生成图片图标
function createImageIcon(selected) {
  const { canvas, ctx } = createIconCanvas();
  
  // 设置颜色
  const color = selected ? '#07c160' : '#888888';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  
  // 画一个矩形框（相框）
  ctx.strokeRect(4, 4, 16, 12);
  
  // 画一个三角形（山）
  ctx.beginPath();
  ctx.moveTo(7, 12);
  ctx.lineTo(10, 8);
  ctx.lineTo(13, 12);
  ctx.stroke();
  
  // 画太阳
  ctx.beginPath();
  ctx.arc(16, 7, 2, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 生成用户图标
function createUserIcon(selected) {
  const { canvas, ctx } = createIconCanvas();
  
  // 设置颜色
  const color = selected ? '#07c160' : '#888888';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  
  // 画一个圆（头）
  ctx.beginPath();
  ctx.arc(12, 8, 5, 0, Math.PI * 2);
  ctx.stroke();
  
  // 画一个半圆（身体）
  ctx.beginPath();
  ctx.arc(12, 24, 8, Math.PI, Math.PI * 2, true);
  ctx.stroke();

  return canvas;
}

// 保存PNG
function savePNG(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Created ${filename}`);
}

// 生成所有图标
const imageIcon = createImageIcon(false);
const imageSelectedIcon = createImageIcon(true);
const userIcon = createUserIcon(false);
const userSelectedIcon = createUserIcon(true);

// 保存所有图标
savePNG(imageIcon, 'image.png');
savePNG(imageSelectedIcon, 'image-selected.png');
savePNG(userIcon, 'user.png');
savePNG(userSelectedIcon, 'user-selected.png');

console.log('All icons generated successfully!'); 