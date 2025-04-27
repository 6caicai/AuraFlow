const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { imagePath, distortionStrength, animationSpeed, selectedArea } = event;
  
  try {
    console.log('收到参数:', event);
    
    // 下载图片（保留这一步，但不进行处理）
    const res = await cloud.downloadFile({
      fileID: imagePath
    });
    console.log('图片下载成功');
    
    // 简化处理：直接返回原图作为结果
    // 上传图片到云存储（使用新的文件名）
    const uploadResult = await cloud.uploadFile({
      cloudPath: `processed/${Date.now()}.jpg`,
      fileContent: res.fileContent
    });
    
    console.log('图片上传成功:', uploadResult.fileID);
    
    return {
      success: true,
      videoUrl: uploadResult.fileID,  // 实际上是图片，但保持接口一致
      message: '图片处理成功（简化版，仅返回原图）'
    };
    
  } catch (error) {
    console.error('云函数执行出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 