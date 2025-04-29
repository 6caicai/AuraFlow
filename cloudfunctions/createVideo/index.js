// 云函数入口文件
const cloud = require('wx-server-sdk')
const fs = require('fs')
const path = require('path')
const os = require('os')
const ffmpeg = require('fluent-ffmpeg')
const request = require('request-promise')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 下载图片到临时目录
async function downloadImage(url, index) {
  const tmpDir = os.tmpdir()
  const tmpFile = path.join(tmpDir, `frame_${index.toString().padStart(5, '0')}.png`)
  
  // 如果是云存储文件，获取下载地址
  let fileUrl = url
  if (url.startsWith('cloud://')) {
    const result = await cloud.getTempFileURL({
      fileList: [url]
    })
    fileUrl = result.fileList[0].tempFileURL
  }
  
  // 下载文件
  const response = await request({
    uri: fileUrl,
    encoding: null
  })
  
  // 写入临时文件
  fs.writeFileSync(tmpFile, response)
  return tmpFile
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { frameUrls, duration, frameCount } = event
    
    // 创建临时目录
    const tmpDir = os.tmpdir()
    const outputFile = path.join(tmpDir, `output_${Date.now()}.mp4`)
    const framesDir = path.join(tmpDir, `frames_${Date.now()}`)
    
    // 确保帧目录存在
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir)
    }
    
    // 下载所有帧
    const frameFiles = []
    for (let i = 0; i < frameUrls.length; i++) {
      const frameFile = path.join(framesDir, `frame_${i.toString().padStart(5, '0')}.png`)
      
      // 下载图片
      const tmpFile = await downloadImage(frameUrls[i], i)
      
      // 移动到帧目录
      fs.copyFileSync(tmpFile, frameFile)
      fs.unlinkSync(tmpFile)
      
      frameFiles.push(frameFile)
    }
    
    // 计算帧率
    const fps = frameCount / duration
    
    // 使用FFmpeg生成视频
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(framesDir, 'frame_%05d.png'))
        .inputFPS(fps)
        .outputFPS(30)
        .output(outputFile)
        .videoCodec('libx264')
        .size('?x?')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-preset ultrafast',
          '-crf 23'
        ])
        .on('error', (err) => {
          console.error('FFmpeg error:', err)
          reject(err)
        })
        .on('end', async () => {
          try {
            // 上传到云存储
            const fileContent = fs.readFileSync(outputFile)
            const cloudPath = `videos/animation_${Date.now()}.mp4`
            const uploadResult = await cloud.uploadFile({
              cloudPath,
              fileContent
            })
            
            // 清理临时文件
            fs.unlinkSync(outputFile)
            frameFiles.forEach(file => {
              if (fs.existsSync(file)) {
                fs.unlinkSync(file)
              }
            })
            if (fs.existsSync(framesDir)) {
              fs.rmdirSync(framesDir)
            }
            
            resolve({
              success: true,
              fileID: uploadResult.fileID
            })
          } catch (error) {
            console.error('Error uploading video:', error)
            reject(error)
          }
        })
        .run()
    })
  } catch (error) {
    console.error('Error creating video:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 